import { OpenRouter, hasToolCall, maxCost, stepCountIs, tool } from "@openrouter/agent";
import { z } from "zod";
import type { Draft } from "./parallax";
import { segmentAvailable } from "./segment";

const MODEL = process.env.PARALLAX_MODEL || "anthropic/claude-opus-5.5"; // precisa de visão + tool calling
const ROUNDS = 3;
const MAX_ELEMENTS = 6;

const INSTRUCTIONS = `Você monta o efeito parallax de uma capa de álbum para um site. O site separa a capa em camadas que se movem em velocidades diferentes quando o visitante mexe o mouse: um fundo (reconstruído automaticamente quando você tira os elementos) e os elementos que você recorta, cada um com uma profundidade (depth: 0.7 = personagem, 1.0 = objetos soltos, que são os que mais andam).

Coordenadas: tudo em 0..1000 nos dois eixos (x para a direita, y para baixo), como na grade numerada da imagem. Você NÃO vê pixels com precisão: desconfie dos seus palpites de posição e prefira ferramentas que partem de medições.

Fluxo recomendado:
1. O elemento principal (personagem, objeto central) normalmente já vem recortado por um modelo de segmentação. Só mexa nele se estiver claramente errado: edit_element (add/subtract) corrige um pedaço sem refazer tudo.
2. Objetos pequenos e nítidos soltos no espaço (caveiras, pássaros, luas, peças): use find_candidates (lista de objetos detectados com coordenadas medidas; a imagem com caixas amarelas numeradas acompanha a primeira rodada) e cut_candidate com o id. Se o objeto não foi detectado, use segment_region com uma caixa em volta dele (o modelo de segmentação roda só ali e acerta bem), ou cut_ellipse/cut_polygon + refine_element. find_candidates com sensitivity maior (até 3) acha objetos de baixo contraste, com mais ruído.
3. Depois de recortar: refine_element se a borda pega fundo (halo), update_element para ajustar depth/float sem recortar de novo.
4. Brilhos: add_glow num ponto luminoso (olhos, lâmpada, janela); ele se encaixa no ponto mais saturado por perto e usa a cor da imagem. No máximo 3.
5. set_scene escolhe o movimento da capa: amplitude (0.012 sutil a 0.028 forte), drift (eight padrão, circle, horizontal, still), vinheta e partículas (poeira, neve, cinzas; cor tirada da paleta, opacidade baixa). Combine com o clima da arte: capa sombria e parada pede drift lento e vinheta forte; capa vibrante aguenta mais amplitude.
6. SEMPRE chame check_quality antes de finish. Ele mede a borda de cada recorte, acusa restos de objeto no fundo reconstruído e lista objetos soltos ainda não separados. Corrija os avisos e finalize.

Regras: no máximo ${MAX_ELEMENTS} elementos. NÃO recorte texto, logotipos, molduras, linhas de design nem o fundo: ficam no fundo. Capa só tipográfica ou abstrata, sem elemento destacável: não recorte nada e chame finish. Recorte mesmo substitui o anterior se tiver o MESMO name. Em cada rodada seguinte você recebe o fundo reconstruído, os recortes sobre magenta e a câmera no extremo (magenta ali = vazio; halo ou resto de objeto = defeito). Seja objetivo; não explique em texto.`;

// Toda tool devolve {ok, ...dados} ou {error}: o erro volta ao modelo, que corrige na mesma rodada.
const run = async (fn: () => object | Promise<object>) => {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
};

export async function runParallaxAgent(draft: Draft) {
  const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
  const segment = segmentAvailable(); // sem o modelo (models/isnet-general-use.onnx) o agente recorta por polígono/elipse
  let checked = false;
  const full = (name: string) => (draft.elements.size >= MAX_ELEMENTS && !draft.elements.has(name) ? { error: `limite de ${MAX_ELEMENTS} elementos` } : null);
  const box = z.number().min(0).max(1000);
  const nameSchema = z.string().min(1).max(40).describe("Nome curto, ex.: personagem, caveira 1. Mesmo nome substitui.");
  const depthSchema = (d: number) => z.number().min(0.3).max(1).default(d).describe("Quanto se move: 0.7 personagem, 1.0 objetos soltos");

  const tools = [
    tool({
      name: "find_candidates",
      description: "Detecta objetos pequenos e nítidos que destoam da vizinhança (candidatos a elementos soltos), com coordenadas medidas e cor. Ignora o que já foi recortado. Os ids mudam a cada busca.",
      inputSchema: z.object({ sensitivity: z.number().min(0.5).max(3).default(1).describe("Maior = acha objetos de menor contraste, com mais ruído") }),
      execute: async ({ sensitivity }) => run(async () => { draft.onStep("procurando objetos soltos"); return { candidates: await draft.findCandidates(sensitivity) }; }),
    }),
    tool({
      name: "cut_candidate",
      description: "Recorta um objeto detectado por find_candidates (borda refinada pela cor do objeto, sem halo). É a forma mais precisa de recortar objetos soltos.",
      inputSchema: z.object({ id: z.number().int(), name: nameSchema, depth: depthSchema(1), float: z.boolean().default(true).describe("Flutua e gira devagar"), refine: z.boolean().default(true) }),
      execute: async (p) => full(p.name) ?? run(async () => { draft.onStep(`recortando ${p.name}`); return draft.cutCandidate(p.id, p.name, p.depth, p.float, p.refine); }),
    }),
    ...(segment
      ? [
          tool({
            name: "segment_subject",
            description: "Recorta de novo o elemento principal da capa inteira com o modelo de segmentação. Normalmente já foi feito automaticamente.",
            inputSchema: z.object({ name: nameSchema.default("personagem"), depth: depthSchema(0.7) }),
            execute: async (p) => run(async () => { draft.onStep(`segmentando ${p.name} (modelo local)`); return draft.segmentSubject(p.name, p.depth); }),
          }),
          tool({
            name: "segment_region",
            description: "Roda o modelo de segmentação só dentro de uma caixa (x, y = canto superior esquerdo; coordenadas 0..1000). Em torno de um objeto pequeno ele acerta muito mais do que na capa inteira.",
            inputSchema: z.object({ name: nameSchema, x: box, y: box, width: z.number().min(10).max(1000), height: z.number().min(10).max(1000), depth: depthSchema(1), float: z.boolean().default(true) }),
            execute: async (p) => full(p.name) ?? run(async () => { draft.onStep(`segmentando ${p.name} (região)`); return draft.segmentRegion(p.name, { x: p.x, y: p.y, w: p.width, h: p.height }, p.depth, p.float); }),
          }),
        ]
      : []),
    tool({
      name: "cut_polygon",
      description: "Recorta por polígono (vértices [x, y] em 0..1000). Use para formas irregulares quando find_candidates e segment_region não servem; refine_element tira a sobra de fundo.",
      inputSchema: z.object({
        name: nameSchema,
        polygon: z.array(z.tuple([z.number(), z.number()])).min(3).max(120),
        depth: depthSchema(1),
        float: z.boolean().default(false),
        feather: z.number().min(0).max(4).default(1.2).describe("Suavização da borda em pixels"),
      }),
      execute: async (p) => full(p.name) ?? run(async () => { draft.onStep(`recortando ${p.name}`); return draft.cut(p.name, p.polygon, p.depth, p.float, p.feather); }),
    }),
    tool({
      name: "cut_ellipse",
      description: "Recorta um objeto redondo por elipse (centro e raios em 0..1000) com borda suave. Posição estimada: confira e use refine_element depois.",
      inputSchema: z.object({ name: nameSchema, cx: box, cy: box, rx: z.number().min(3).max(500), ry: z.number().min(3).max(500), depth: depthSchema(1), float: z.boolean().default(true) }),
      execute: async (p) => full(p.name) ?? run(async () => { draft.onStep(`recortando ${p.name}`); return draft.cutEllipse(p.name, p.cx, p.cy, p.rx, p.ry, p.depth, p.float); }),
    }),
    tool({
      name: "refine_element",
      description: "Refina a borda de um recorte pela cor: tira o fundo que sobrou (halo) comparando cada pixel com a cor ao redor. shrink come pixels da borda.",
      inputSchema: z.object({ name: z.string(), tolerance: z.number().min(0.4).max(2.5).default(1).describe("Menor = mantém mais; maior = corta mais"), shrink: z.number().min(0).max(4).default(0) }),
      execute: async (p) => run(async () => { draft.onStep(`refinando ${p.name}`); return draft.refine(p.name, p.tolerance, p.shrink); }),
    }),
    tool({
      name: "edit_element",
      description: "Soma (add) ou tira (subtract) uma área de um recorte existente, por polígono ou elipse (0..1000). Conserta o que o modelo de segmentação errou sem refazer tudo.",
      inputSchema: z.object({
        name: z.string(),
        op: z.enum(["add", "subtract"]),
        polygon: z.array(z.tuple([z.number(), z.number()])).min(3).max(120).optional(),
        ellipse: z.object({ cx: box, cy: box, rx: z.number().min(3).max(500), ry: z.number().min(3).max(500) }).optional(),
      }),
      execute: async (p) => run(async () => { draft.onStep(`ajustando ${p.name}`); return draft.edit(p.name, p.op, { polygon: p.polygon, ellipse: p.ellipse }); }),
    }),
    tool({
      name: "update_element",
      description: "Muda depth e/ou float de um recorte sem recortar de novo.",
      inputSchema: z.object({ name: z.string(), depth: z.number().min(0.3).max(1).optional(), float: z.boolean().optional() }),
      execute: async (p) => run(() => draft.update(p.name, { depth: p.depth, float: p.float })),
    }),
    tool({
      name: "remove_element",
      description: "Apaga um recorte.",
      inputSchema: z.object({ name: z.string() }),
      execute: async ({ name }) => ({ removed: draft.elements.delete(name) }),
    }),
    tool({
      name: "add_glow",
      description: "Brilho que pulsa sobre um ponto luminoso da capa (olhos, lâmpada, janela). Elipse centrada em (x, y) em 0..1000. Com snap, recentra no ponto mais saturado por perto; sem color, usa a cor da imagem.",
      inputSchema: z.object({
        x: box, y: box,
        width: z.number().min(5).max(300),
        height: z.number().min(5).max(300),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        period: z.union([z.literal(2), z.literal(4), z.literal(5), z.literal(10)]).default(5).describe("Segundos por pulso (dividem o loop de 20 s)"),
        snap: z.boolean().default(true),
      }),
      execute: async (p) => (draft.glows.length >= 3 ? { error: "limite de 3 brilhos" } : run(() => draft.addGlow(p))),
    }),
    tool({
      name: "set_scene",
      description: "Define o movimento desta capa: amplitude da câmera, trajetória sem mouse, vinheta e partículas (poeira/neve/cinzas).",
      inputSchema: z.object({
        amplitude: z.number().min(0.008).max(0.03).default(0.02).describe("Fração da largura que a camada mais próxima anda"),
        drift: z.enum(["eight", "circle", "horizontal", "still"]).default("eight"),
        vignette: z.number().min(0).max(1).default(0.55),
        particles: z.object({ count: z.number().int().min(4).max(40), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), opacity: z.number().min(0.1).max(0.6) }).optional(),
      }),
      execute: async (p) => run(() => draft.setScene(p)),
    }),
    tool({
      name: "check_quality",
      description: "Mede o resultado: borda de cada recorte, restos de objeto no fundo reconstruído e objetos soltos ainda não separados. Chame antes de finish e corrija os avisos.",
      inputSchema: z.object({}),
      execute: async () => run(async () => { draft.onStep("conferindo a qualidade"); checked = true; return draft.quality(); }),
    }),
    tool({
      name: "finish",
      description: "Encerra: o resultado atual está bom (ou a capa não tem elementos para separar). Exige check_quality antes.",
      inputSchema: z.object({ summary: z.string().max(300).describe("Uma frase sobre o que foi feito") }),
      execute: async ({ summary }) => {
        if (draft.elements.size && !checked) return { error: "rode check_quality antes de finish" };
        draft.finished = true;
        draft.summary = summary;
        return { ok: true };
      },
    }),
  ];

  const message = (text: string, images: string[]) => [{ type: "message" as const, role: "user" as const, content: [{ type: "input_text" as const, text }, ...images.map((imageUrl) => ({ type: "input_image" as const, imageUrl, detail: "high" as const }))] }];

  // O personagem principal não fica por conta do modelo de linguagem (polígonos dele erram a silhueta): o isnet recorta primeiro, como no protótipo.
  let auto = "";
  if (segment) {
    try {
      draft.onStep("segmentando o personagem (modelo local)");
      const r = await draft.segmentSubject("personagem", 0.7);
      auto = `O elemento principal já foi recortado automaticamente ("personagem", ${r.areaPercent}% da capa); só o refaça se estiver claramente errado.`;
    } catch (e) {
      auto = `A segmentação automática do elemento principal falhou (${e instanceof Error ? e.message : e}). Recorte-o você (segment_region numa caixa em volta dele, ou cut_polygon).`;
    }
  }
  draft.onStep("procurando objetos soltos");
  const found = await draft.findCandidates(1);

  for (let round = 1; round <= ROUNDS && !draft.finished; round++) {
    draft.onStep(round === 1 ? "agente analisando a capa" : `agente conferindo o resultado (rodada ${round}/${ROUNDS})`);
    let input;
    if (round === 1) {
      const text = `Capa do álbum. Imagem 1: com grade 0..1000. Imagem 2: objetos soltos detectados, em caixas amarelas numeradas. ${auto}\nCandidatos (coordenadas 0..1000; fill = preenchimento da caixa; contrast = destaque sobre a vizinhança):\n${JSON.stringify(found)}\nRecorte o que for elemento solto, ajuste, rode check_quality e chame finish.`;
      input = message(text, [await draft.grid(), await draft.candidatesOverlay()]);
    } else {
      const p = await draft.previews();
      const text = `Rodada ${round}. Recortes atuais: ${[...draft.elements.keys()].join(", ") || "nenhum"}. Imagem 1: fundo reconstruído sem os elementos. Imagem 2: recortes sobre magenta. Imagem 3: câmera no extremo (magenta = vazio; halo ou resto de objeto = defeito). Imagem 4: capa original com grade. Confira CADA recorte: se mostra só fundo, a posição está errada; se tem halo, use refine_element. Corrija e chame check_quality, depois finish.`;
      input = message(text, [p.background, p.cutouts, p.motion, await draft.grid()]);
    }
    const result = client.callModel({ model: MODEL, instructions: INSTRUCTIONS, input, tools, stopWhen: [stepCountIs(18), maxCost(0.6), hasToolCall("finish")], maxOutputTokens: 4000, reasoning: { effort: "medium" } }, { signal: AbortSignal.timeout(150_000) });
    await result.getText();
    if (!draft.elements.size && round === 1 && draft.finished) break; // capa sem elemento
  }
}

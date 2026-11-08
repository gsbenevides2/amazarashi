import type { Sharp } from "sharp";
import { sharp } from "./native";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { coverParallax } from "./db/schema";
import { bgScale, type ParallaxConfig, type ParallaxGlow, type ParallaxLayer, type ParallaxScene } from "../lib/parallax";
import { runParallaxAgent } from "./parallax-agent";
import { SEG, segmentMask } from "./segment";
import { type Candidate, dilate, findCandidates, gray, hex, invert, keepLargestFilled, mono, refineByColor, withAlpha } from "./image-ops";
import { uploadBuffer } from "./s3";

const MAX = 1440;
const U = 1000; // o agente enxerga a capa numa grade 0..1000 nos dois eixos

// Cor de destaque: média dos pixels ponderada por saturação×brilho, para não cair no cinza/preto dominante.
export async function accentOf(input: Buffer) {
  const { data } = await sharp(input).removeAlpha().resize(24, 24, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, w = 0;
  for (let i = 0; i < data.length; i += 3) {
    const max = Math.max(data[i], data[i + 1], data[i + 2]), min = Math.min(data[i], data[i + 1], data[i + 2]);
    const k = (max ? (max - min) / max : 0) * (max / 255) + 0.01;
    r += data[i] * k; g += data[i + 1] * k; b += data[i + 2] * k; w += k;
  }
  return "#" + [r, g, b].map((v) => Math.round(v / w).toString(16).padStart(2, "0")).join("");
}

// Preenche o furo por difusão em pirâmide (24 → 384 px): cada nível parte do anterior ampliado, então o miolo de furos grandes converge sem manchas escuras.
async function inpaint(rgb: Buffer, hole: Buffer, w: number, h: number) {
  let prev: Buffer | null = null, prevS = 0;
  for (const S of [24, 48, 96, 192, 384]) {
    const px = Float32Array.from(await sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).resize(S, S, { fit: "fill" }).raw().toBuffer());
    const m = await mono(hole, w, h).resize(S, S, { fit: "fill" }).extractChannel(0).raw().toBuffer(); // extractChannel: raw() de máscara sai com 3 canais
    const isHole = (p: number) => m[p] > 4;
    if (prev) {
      const up = await sharp(prev, { raw: { width: prevS, height: prevS, channels: 3 } }).resize(S, S, { fit: "fill", kernel: "cubic" }).raw().toBuffer();
      for (let p = 0; p < S * S; p++) if (isHole(p)) for (let c = 0; c < 3; c++) px[p * 3 + c] = up[p * 3 + c];
    } else {
      const sum = [0, 0, 0];
      let cnt = 0;
      for (let p = 0; p < S * S; p++) if (!isHole(p)) { for (let c = 0; c < 3; c++) sum[c] += px[p * 3 + c]; cnt++; }
      for (let p = 0; p < S * S; p++) if (isHole(p)) for (let c = 0; c < 3; c++) px[p * 3 + c] = cnt ? sum[c] / cnt : 0;
    }
    for (let it = 0; it < (prev ? 60 : 300); it++)
      for (let p = 0; p < S * S; p++) {
        if (!isHole(p)) continue;
        const x = p % S, y = (p - x) / S;
        const nb = [x > 0 ? p - 1 : p, x < S - 1 ? p + 1 : p, y > 0 ? p - S : p, y < S - 1 ? p + S : p];
        for (let c = 0; c < 3; c++) px[p * 3 + c] = (px[nb[0] * 3 + c] + px[nb[1] * 3 + c] + px[nb[2] * 3 + c] + px[nb[3] * 3 + c]) / 4;
      }
    prev = Buffer.from(px.map((v) => Math.round(v)));
    prevS = S;
  }
  return sharp(prev!, { raw: { width: prevS, height: prevS, channels: 3 } }).resize(w, h, { fit: "fill", kernel: "cubic" }).blur(3);
}

// Limpa a máscara do modelo (a saída é semitransparente em ilustração pintada): alfa > 0.06, fechamento morfológico, maior componente e buracos preenchidos.
// Retorna 0/255 ou null se vazia/absurda.
async function cleanMask(raw: Buffer) {
  const w = SEG, h = SEG, n = w * h;
  const bin = Buffer.alloc(n);
  for (let i = 0; i < n; i++) bin[i] = raw[i] >= 15 ? 255 : 0;
  // fechamento = dilatar e erodir: fecha as falhas das áreas semitransparentes sem engordar o contorno
  const closed = invert(await dilate(invert(await dilate(bin, w, h, 8, 10)), w, h, 8, 10));
  const out = keepLargestFilled(closed, w, h, 0.01, 0.9); // sem elemento (capa tipográfica) ou recorte que engoliu tudo
  return out ? { data: out, width: w, height: h } : null;
}

type Element = { name: string; depth: number; float: boolean; alpha: Buffer };

// Rascunho do parallax: a capa, os elementos que o agente delimitou (polígonos) e os brilhos. O agente só mexe nele pelas tools.
export class Draft {
  elements = new Map<string, Element>();
  glows: ParallaxGlow[] = [];
  candidates: Candidate[] = []; // última rodada de find_candidates
  // Folga do furo do fundo ao redor dos recortes (sigma do desfoque que dilata) e suavização da emenda com o original. Folga grande demais deixa um
  // halo borrado ao redor de cada elemento quando as camadas estão em repouso; pequena demais deixa borda do elemento no fundo ("fantasma").
  holeSigma = 3;
  blendSigma = 2;
  scene: ParallaxScene | null = null;
  finished = false;
  onStep: (step: string) => void = () => {}; // andamento para o admin
  summary = "";
  private constructor(public rgb: Buffer, public w: number, public h: number) {}

  static async from(cover: Buffer) {
    const meta = await sharp(cover).metadata();
    const w = Math.min(meta.width ?? MAX, MAX), h = Math.round(w * ((meta.height ?? 1) / (meta.width ?? 1)));
    return new Draft(await sharp(cover).removeAlpha().resize(w, h, { fit: "fill" }).raw().toBuffer(), w, h);
  }

  // Polígono (0..1000) → alfa. `feather` em pixels da borda.
  private async polyAlpha(polygon: [number, number][], feather: number) {
    const pts = polygon.map(([x, y]) => `${((x / U) * this.w).toFixed(1)},${((y / U) * this.h).toFixed(1)}`).join(" ");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}"><rect width="100%" height="100%" fill="#000"/><polygon points="${pts}" fill="#fff"/></svg>`;
    const alpha = await gray(sharp(Buffer.from(svg)).resize(this.w, this.h));
    return feather > 0 ? gray(mono(alpha, this.w, this.h).blur(feather).toColourspace("b-w")) : alpha;
  }

  // Elipse (0..1000) com queda suave na borda, como o recorte à mão de objetos redondos (caveira, lua).
  private ellipseAlpha(cx: number, cy: number, rx: number, ry: number) {
    const { w, h } = this;
    const alpha = Buffer.alloc(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = ((x / w - cx / U) / (rx / U)) ** 2 + ((y / h - cy / U) / (ry / U)) ** 2;
      alpha[y * w + x] = Math.round(Math.min(1, Math.max(0, (1.15 - d) / 0.3)) * 255);
    }
    return alpha;
  }

  async cut(name: string, polygon: [number, number][], depth: number, float: boolean, feather: number) {
    const alpha = await this.polyAlpha(polygon, feather);
    await this.rejectEmpty(name, alpha);
    return this.put(name, depth, float, alpha);
  }

  async cutEllipse(name: string, cx: number, cy: number, rx: number, ry: number, depth: number, float: boolean) {
    const alpha = this.ellipseAlpha(cx, cy, rx, ry);
    await this.rejectEmpty(name, alpha);
    return this.put(name, depth, float, alpha);
  }

  // Recoloca um recorte já pronto (alfa de w×h), sem as checagens do agente. Usado para refazer o fundo a partir das camadas salvas.
  restoreElement(name: string, depth: number, float: boolean, alpha: Buffer) {
    this.elements.set(name, { name, depth, float, alpha });
  }

  private put(name: string, depth: number, float: boolean, alpha: Buffer) {
    const area = alpha.reduce((n, v) => n + (v > 128 ? 1 : 0), 0) / alpha.length;
    if (area < 0.0005) throw new Error("recorte vazio ou fora da capa (use coordenadas 0 a 1000)");
    if (area > 0.85) throw new Error("recorte cobre quase a capa inteira; delimite só o elemento");
    this.elements.set(name, { name, depth, float, alpha });
    return { name, areaPercent: +(area * 100).toFixed(2) };
  }

  // Trava contra coordenadas fora do objeto: um recorte cujo miolo é liso e igual ao anel ao redor é só fundo (o modelo de linguagem erra posições).
  private async rejectEmpty(name: string, alpha: Buffer) {
    const { w, h, rgb } = this;
    const ring = await dilate(alpha, w, h, 14, 8);
    const sum = [0, 0, 0], ringSum = [0, 0, 0];
    let nIn = 0, nRing = 0;
    for (let i = 0; i < w * h; i++) {
      if (alpha[i] > 200) { for (let c = 0; c < 3; c++) sum[c] += rgb[i * 3 + c]; nIn++; }
      else if (ring[i] && alpha[i] < 8) { for (let c = 0; c < 3; c++) ringSum[c] += rgb[i * 3 + c]; nRing++; }
    }
    if (!nIn || !nRing) return;
    const mi = sum.map((v) => v / nIn), mr = ringSum.map((v) => v / nRing);
    let variance = 0;
    for (let i = 0; i < w * h; i++) if (alpha[i] > 200) for (let c = 0; c < 3; c++) variance += (rgb[i * 3 + c] - mi[c]) ** 2;
    const std = Math.sqrt(variance / (nIn * 3)), dist = Math.hypot(mi[0] - mr[0], mi[1] - mr[1], mi[2] - mr[2]);
    if (std < 4 && dist < 8) throw new Error(`"${name}" cobre só fundo liso (cor igual à da vizinhança): as coordenadas estão fora do objeto. Olhe de novo a grade 0..1000 e refaça com o centro certo.`);
  }

  // Elemento principal por modelo local (isnet): alfa > 0.06, fechamento, maior componente, buracos preenchidos e borda suave.
  async segmentSubject(name: string, depth: number) {
    const { w, h } = this;
    const mask = await cleanMask(await segmentMask(this.rgb, w, h));
    if (!mask) throw new Error("o modelo não achou um elemento principal claro; use cut_polygon");
    const soft = await gray(mono(mask.data, mask.width, mask.height).blur(1.5).resize(w, h, { fit: "fill", kernel: "cubic" }).toColourspace("b-w"));
    return this.put(name, depth, false, soft);
  }

  private union() {
    const u = Buffer.alloc(this.w * this.h);
    for (const e of this.elements.values()) for (let i = 0; i < u.length; i++) if (e.alpha[i] > u[i]) u[i] = e.alpha[i];
    return u;
  }

  // Objetos soltos detectados na imagem (fora do que já foi recortado): coordenadas concretas em vez de chute do modelo de linguagem.
  async findCandidates(sensitivity = 1) {
    this.candidates = await findCandidates(this.rgb, this.w, this.h, this.elements.size ? this.union() : null, sensitivity);
    return this.candidates.map((c) => ({ id: c.id, cx: c.cx, cy: c.cy, w: c.w, h: c.h, areaPercent: c.areaPercent, fill: c.fill, contrast: c.contrast, color: c.color }));
  }

  // Recorta um candidato detectado: máscara grossa → dilatada → refinada por cor (borda do objeto, sem halo).
  async cutCandidate(id: number, name: string, depth: number, float: boolean, refine: boolean) {
    const c = this.candidates.find((x) => x.id === id);
    if (!c) throw new Error(`o candidato ${id} não existe: rode find_candidates de novo (os ids mudam a cada busca)`);
    const { w, h } = this;
    let alpha: Buffer = await dilate(await gray(mono(c.mask, c.rw, c.rh).blur(1).resize(w, h, { fit: "fill", kernel: "cubic" })), w, h, 4, 40);
    const refined = refine ? await refineByColor(this.rgb, w, h, alpha, 1, 0) : null;
    alpha = refined ?? (await gray(mono(alpha, w, h).blur(1.5)));
    return { ...this.put(name, depth, float, alpha), refinado: !!refined };
  }

  // Modelo de segmentação (isnet) só dentro de uma região: num recorte de um objeto pequeno ele acerta muito mais que na capa inteira.
  async segmentRegion(name: string, box: { x: number; y: number; w: number; h: number }, depth: number, float: boolean) {
    const { w, h } = this;
    const bw = (box.w / U) * w, bh = (box.h / U) * h, cx = ((box.x + box.w / 2) / U) * w, cy = ((box.y + box.h / 2) / U) * h;
    const side = Math.round(Math.min(Math.max(Math.max(bw, bh) * 1.7, 96), Math.min(w, h)));
    const left = Math.round(Math.min(Math.max(cx - side / 2, 0), w - side)), top = Math.round(Math.min(Math.max(cy - side / 2, 0), h - side));
    const crop = Buffer.alloc(side * side * 3);
    for (let y = 0; y < side; y++) this.rgb.copy(crop, y * side * 3, ((top + y) * w + left) * 3, ((top + y) * w + left + side) * 3);
    const mask = await cleanMask(await segmentMask(crop, side, side));
    if (!mask) throw new Error("o modelo não achou um objeto claro nessa região; ajuste a caixa ou use cut_ellipse + refine_element");
    const soft = await gray(mono(mask.data, SEG, SEG).blur(1.5).resize(side, side, { fit: "fill", kernel: "cubic" }));
    const alpha = Buffer.alloc(w * h);
    for (let y = 0; y < side; y++) soft.copy(alpha, (top + y) * w + left, y * side, (y + 1) * side);
    return this.put(name, depth, float, alpha);
  }

  // Tira o fundo que sobrou na borda do recorte (compara cada pixel com a cor ao redor). `shrink` come px da borda.
  async refine(name: string, tolerance: number, shrink: number) {
    const el = this.elements.get(name);
    if (!el) throw new Error(`não existe recorte "${name}"`);
    const r = await refineByColor(this.rgb, this.w, this.h, el.alpha, tolerance, shrink);
    if (!r) throw new Error("não deu para refinar: o recorte quase não difere da vizinhança (tente tolerance menor)");
    el.alpha = r;
    return { name, areaPercent: +((r.reduce((n, v) => n + (v > 128 ? 1 : 0), 0) / r.length) * 100).toFixed(2) };
  }

  // Soma (add) ou tira (subtract) uma forma do recorte existente: conserta o que o modelo de segmentação errou sem refazer tudo.
  async edit(name: string, op: "add" | "subtract", shape: { polygon?: [number, number][]; ellipse?: { cx: number; cy: number; rx: number; ry: number } }) {
    const el = this.elements.get(name);
    if (!el) throw new Error(`não existe recorte "${name}"`);
    const sh = shape.polygon ? await this.polyAlpha(shape.polygon, 1.5) : shape.ellipse ? this.ellipseAlpha(shape.ellipse.cx, shape.ellipse.cy, shape.ellipse.rx, shape.ellipse.ry) : null;
    if (!sh) throw new Error("informe polygon ou ellipse");
    const out = Buffer.alloc(el.alpha.length);
    for (let i = 0; i < out.length; i++) out[i] = op === "add" ? Math.max(el.alpha[i], sh[i]) : Math.round((el.alpha[i] * (255 - sh[i])) / 255);
    const area = out.reduce((n, v) => n + (v > 128 ? 1 : 0), 0) / out.length;
    if (area < 0.0005) throw new Error("a edição apagaria o recorte inteiro");
    el.alpha = out;
    return { name, areaPercent: +(area * 100).toFixed(2) };
  }

  update(name: string, patch: { depth?: number; float?: boolean }) {
    const el = this.elements.get(name);
    if (!el) throw new Error(`não existe recorte "${name}"`);
    if (patch.depth !== undefined) el.depth = patch.depth;
    if (patch.float !== undefined) el.float = patch.float;
    return { name, depth: el.depth, float: el.float };
  }

  // Brilho: com `snap`, recentra no ponto mais saturado/brilhante por perto (a coordenada do modelo de linguagem costuma errar uns pixels)
  // e, sem cor informada, usa a cor da própria imagem.
  addGlow(g: { x: number; y: number; width: number; height: number; color?: string; period: number; snap: boolean }) {
    const { w, h, rgb } = this;
    let cx = g.x, cy = g.y;
    const pxAt = (xu: number, yu: number) => { const x = Math.min(w - 1, Math.max(0, Math.round((xu / U) * w))), y = Math.min(h - 1, Math.max(0, Math.round((yu / U) * h))); return (y * w + x) * 3; };
    const score = (xu: number, yu: number) => {
      let sc = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = pxAt(xu + dx * 4, yu + dy * 4); const mx = Math.max(rgb[i], rgb[i + 1], rgb[i + 2]), mn = Math.min(rgb[i], rgb[i + 1], rgb[i + 2]); sc += (mx ? (mn / mx < 1 ? (mx - mn) / mx : 0) : 0) * (mx / 255); }
      return sc;
    };
    if (g.snap) {
      let best = -1;
      for (let dy = -50; dy <= 50; dy += 4) for (let dx = -50; dx <= 50; dx += 4) { const sc = score(g.x + dx, g.y + dy); if (sc > best) { best = sc; cx = g.x + dx; cy = g.y + dy; } }
    }
    const i = pxAt(cx, cy);
    const color = g.color ?? hex([rgb[i], rgb[i + 1], rgb[i + 2]]);
    this.glows.push({ x: (cx - g.width / 2) / U, y: (cy - g.height / 2) / U, w: g.width / U, h: g.height / U, color, period: g.period });
    return { x: Math.round(cx), y: Math.round(cy), color };
  }

  setScene(scene: ParallaxScene) {
    this.scene = scene;
    return scene;
  }

  // Conferência objetiva: borda de cada recorte, restos de objetos no fundo reconstruído e objetos soltos ainda não separados.
  async quality() {
    const { w, h, rgb } = this;
    const warnings: string[] = [];
    const bgRgb = await (await this.background()).removeAlpha().raw().toBuffer();
    const bbox: Record<string, { x0: number; y0: number; x1: number; y1: number }> = {};
    const elements = [];
    for (const e of this.elements.values()) {
      let x0 = w, y0 = h, x1 = 0, y1 = 0, area = 0;
      const core = [0, 0, 0], rim = [0, 0, 0];
      let nCore = 0, nRim = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const a = e.alpha[y * w + x];
        if (a > 10) { area++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        const i = (y * w + x) * 3;
        if (a > 230) { for (let c = 0; c < 3; c++) core[c] += rgb[i + c]; nCore++; } else if (a > 25) { for (let c = 0; c < 3; c++) rim[c] += rgb[i + c]; nRim++; }
      }
      bbox[e.name] = { x0, y0, x1, y1 };
      const ring = await dilate(e.alpha, w, h, 14, 8);
      const out = [0, 0, 0];
      let nOut = 0;
      for (let i = 0; i < w * h; i++) if (ring[i] && e.alpha[i] < 8) { for (let c = 0; c < 3; c++) out[c] += rgb[i * 3 + c]; nOut++; }
      const dist = (a: number[], na: number, b: number[], nb: number) => Math.hypot(...[0, 1, 2].map((c) => a[c] / na - b[c] / nb));
      // borda suja: a faixa semitransparente tem cor mais parecida com o fundo ao redor do que com o miolo
      const edge = nCore && nRim > 50 && nOut ? +(dist(rim, nRim, out, nOut) / Math.max(1, dist(core, nCore, out, nOut))).toFixed(2) : null;
      const areaPercent = +((area / (w * h)) * 100).toFixed(2);
      if (edge !== null && edge < 0.3) warnings.push(`"${e.name}": a borda pega muito fundo (índice ${edge}); use refine_element com shrink 1 a 2`);
      if (areaPercent < 0.05) warnings.push(`"${e.name}": recorte minúsculo (${areaPercent}% da capa); confira se não é ruído`);
      elements.push({ name: e.name, depth: e.depth, float: e.float, areaPercent, edgeIndex: edge, bbox: [Math.round((x0 / w) * U), Math.round((y0 / h) * U), Math.round((x1 / w) * U), Math.round((y1 / h) * U)] });
    }
    // restos no fundo reconstruído: objeto detectado DENTRO do furo de um recorte (texto e formas longe dele não contam)
    const left = await findCandidates(bgRgb, w, h, null, 1.2);
    const hole = this.elements.size ? await this.hole() : null;
    const stillFloating = [];
    for (const c of left) {
      const px = Math.round((c.cx / U) * w), py = Math.round((c.cy / U) * h);
      const inHole = hole ? hole[Math.min(h - 1, py) * w + Math.min(w - 1, px)] > 0 : false;
      const near = inHole ? [...this.elements.keys()].find((n) => { const b = bbox[n]; return px >= b.x0 - w * 0.03 && px <= b.x1 + w * 0.03 && py >= b.y0 - h * 0.03 && py <= b.y1 + h * 0.03; }) : undefined;
      if (near) warnings.push(`restos de "${near}" no fundo reconstruído perto de (${c.cx}, ${c.cy}): o recorte ficou pequeno demais; amplie com edit_element(add) ou refaça com margem`);
      else if (c.contrast > 36) stillFloating.push({ cx: c.cx, cy: c.cy, w: c.w, h: c.h, color: c.color, contrast: c.contrast });
    }
    return { elements, glows: this.glows.length, scene: this.scene ? "definida" : "padrão", warnings, stillFloating: stillFloating.slice(0, 5) };
  }

  // Furo = união dos recortes um pouco dilatada.
  private async hole() {
    return dilate(this.union(), this.w, this.h, this.holeSigma, 8);
  }

  // Fundo sem os elementos (inpainting), RGB.
  async background() {
    const { w, h } = this;
    if (!this.elements.size) return sharp(this.rgb, { raw: { width: w, height: h, channels: 3 } });
    const hole = await this.hole();
    const keep = await gray(mono(hole, w, h).blur(this.blendSigma).negate().toColourspace("b-w"));
    const fill = await inpaint(this.rgb, hole, w, h);
    // materializa: quem chamar pode aplicar outro resize (sharp guarda um só, e ele trocaria o do fill antes do composite)
    return sharp(await fill.composite([{ input: await withAlpha(this.rgb, keep, w, h).png().toBuffer(), blend: "over" }]).png().toBuffer());
  }

  // Cada elemento recortado na sua caixa, em webp com transparência.
  async exportLayers() {
    const { w, h } = this;
    const out: { layer: Omit<ParallaxLayer, "src">; webp: Buffer }[] = [];
    for (const e of this.elements.values()) {
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (e.alpha[y * w + x] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 <= x0 || y1 <= y0) continue;
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const rgb = Buffer.alloc(bw * bh * 3), al = Buffer.alloc(bw * bh);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const s = (y0 + y) * w + (x0 + x), d = y * bw + x;
        rgb[d * 3] = this.rgb[s * 3]; rgb[d * 3 + 1] = this.rgb[s * 3 + 1]; rgb[d * 3 + 2] = this.rgb[s * 3 + 2]; al[d] = e.alpha[s];
      }
      const webp = await withAlpha(rgb, al, bw, bh).webp({ quality: 92 }).toBuffer();
      out.push({ layer: { name: e.name, x: x0 / w, y: y0 / h, w: bw / w, h: bh / h, depth: e.depth, float: e.float || undefined }, webp });
    }
    return out;
  }

  // Câmera no extremo (como o componente do site move as camadas): o magenta aparece onde sobra vazio, e halos/restos ficam evidentes.
  async simulate(dx: number, dy: number) {
    const { w, h } = this;
    const S = 640, sh = Math.round((S * h) / w), pad = 40, amp = this.scene?.amplitude ?? 0.02;
    const z = bgScale(amp);
    const bg = await (await this.background()).resize(Math.round(S * z), Math.round(sh * z)).png().toBuffer();
    const layers = [...this.elements.values()].sort((a, b) => a.depth - b.depth);
    const parts = [{ input: bg, left: pad - Math.round((S * (z - 1)) / 2) - Math.round(dx * 0.3 * S * amp), top: pad - Math.round((sh * (z - 1)) / 2) - Math.round(dy * 0.3 * S * amp) }];
    for (const e of layers) parts.push({ input: await withAlpha(this.rgb, e.alpha, w, h).resize(S, sh).png().toBuffer(), left: pad - Math.round(dx * e.depth * S * amp), top: pad - Math.round(dy * e.depth * S * amp) });
    // composite primeiro e extract depois, em pipelines separados: no sharp o extract roda ANTES do composite
    const canvas = await sharp({ create: { width: S + 2 * pad, height: sh + 2 * pad, channels: 3, background: "#ff00ff" } }).composite(parts).png().toBuffer();
    const img = await sharp(canvas).extract({ left: pad, top: pad, width: S, height: sh }).jpeg({ quality: 80 }).toBuffer();
    return `data:image/jpeg;base64,${img.toString("base64")}`;
  }

  // O que o agente confere a cada rodada: fundo reconstruído, recortes sobre magenta e a câmera no extremo (jpeg base64).
  async previews() {
    const { w, h } = this;
    const jpeg = async (img: Sharp) => `data:image/jpeg;base64,${(await img.resize(768, Math.round((768 * h) / w)).jpeg({ quality: 80 }).toBuffer()).toString("base64")}`;
    const bg = await jpeg(await this.background());
    const magenta = sharp({ create: { width: w, height: h, channels: 3, background: "#ff00ff" } });
    const layers = await Promise.all([...this.elements.values()].map(async (e) => ({ input: await withAlpha(this.rgb, e.alpha, w, h).png().toBuffer() })));
    return { background: bg, cutouts: await jpeg(sharp(await magenta.composite(layers).png().toBuffer())), motion: await this.simulate(1.5, 0.8) };
  }

  // Capa com os candidatos a elemento solto numerados em caixas amarelas.
  async candidatesOverlay() {
    const W = 1024, H = Math.round((W * this.h) / this.w);
    const boxes = this.candidates.map((c) => {
      const x = ((c.cx - c.w / 2) / U) * W, y = ((c.cy - c.h / 2) / U) * H, bw = (c.w / U) * W, bh = (c.h / U) * H;
      return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="#ffe600" stroke-width="2"/><text x="${x + 3}" y="${y - 4}" fill="#ffe600" stroke="#000" stroke-width=".7" font-family="sans-serif" font-size="18" font-weight="bold">${c.id}</text>`;
    }).join("");
    const overlay = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${boxes}</svg>`)).resize(W, H, { fit: "fill" }).png().toBuffer();
    const img = await sharp(this.rgb, { raw: { width: this.w, height: this.h, channels: 3 } }).resize(W, H, { fit: "fill" }).composite([{ input: overlay }]).jpeg({ quality: 85 }).toBuffer();
    return `data:image/jpeg;base64,${img.toString("base64")}`;
  }

  // Capa com grade 0..1000 desenhada por cima, para o agente ler coordenadas. A grade é desenhada já no tamanho final (1024 px).
  async grid() {
    const W = 1024, H = Math.round((W * this.h) / this.w);
    const lines = Array.from({ length: 9 }, (_, i) => {
      const v = (i + 1) * 100, x = (v / U) * W, y = (v / U) * H;
      return { path: `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/><line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`, label: `<text x="${x + 4}" y="14">${v}</text><text x="4" y="${y - 4}">${v}</text>` };
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><g stroke="#fff" stroke-opacity=".55" stroke-width="1">${lines.map((l) => l.path).join("")}</g><g fill="#fff" font-family="sans-serif" font-size="13" stroke="#000" stroke-width=".6">${lines.map((l) => l.label).join("")}</g></svg>`;
    const overlay = await sharp(Buffer.from(svg)).resize(W, H, { fit: "fill" }).png().toBuffer();
    const img = await sharp(this.rgb, { raw: { width: this.w, height: this.h, channels: 3 } }).resize(W, H, { fit: "fill" }).composite([{ input: overlay }]).jpeg({ quality: 85 }).toBuffer();
    return `data:image/jpeg;base64,${img.toString("base64")}`;
  }

  async plain() {
    const img = await sharp(this.rgb, { raw: { width: this.w, height: this.h, channels: 3 } }).resize(1024, Math.round((1024 * this.h) / this.w)).jpeg({ quality: 85 }).toBuffer();
    return `data:image/jpeg;base64,${img.toString("base64")}`;
  }
}

// Mensagem curta para o admin: páginas de erro HTML (Cloudflare 522 etc.) viram só o título.
function briefError(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  const title = m.match(/<title>([^<]*)<\/title>/i)?.[1];
  return (title ? `${title.trim()} (S3)` : m.split("\n")[0]).slice(0, 160);
}

const generating = (v: string) => v === "queued" || v === "running";

// Etapa 1, no upload: cor de destaque na hora e o registro do andamento. Sem OPENROUTER_API_KEY a capa fica só com a cor.
export async function prepareParallax(url: string, cover: Buffer) {
  const accent = await accentOf(cover);
  const key = !!process.env.OPENROUTER_API_KEY;
  const row = { accent, config: null, status: key ? ("queued" as const) : ("done" as const), step: key ? "na fila" : null };
  await db.insert(coverParallax).values({ url, ...row }).onConflictDoUpdate({ target: coverParallax.url, set: row });
}

const setStep = (url: string, status: "running" | "done" | "failed", step: string | null, config?: string | null) =>
  db.update(coverParallax).set({ status, step, ...(config === undefined ? {} : { config }) }).where(eq(coverParallax.url, url));

// Etapa 2: o agente monta as camadas. Grava o andamento a cada passo; nunca lança (falha vira status "failed").
export async function generateParallax(url: string, cover: Buffer) {
  if (!process.env.OPENROUTER_API_KEY) return;
  const mark = (step: string) => void setStep(url, "running", step).catch(() => {});
  try {
    mark("preparando a capa");
    const draft = await Draft.from(cover);
    draft.onStep = mark;
    await runParallaxAgent(draft);
    const layers = await draft.exportLayers();
    if (!layers.length) return void (await setStep(url, "done", "sem elementos para separar", null));
    mark("reconstruindo o fundo");
    const bg = await (await draft.background()).webp({ quality: 90 }).toBuffer();
    mark("enviando as camadas");
    const id = crypto.randomUUID();
    // um por vez: a origem do S3 pode estar instável, e muitas escritas em paralelo só pioram
    const background = await uploadBuffer(`parallax/${id}/fundo.webp`, bg, "image/webp");
    const srcs: string[] = [];
    for (const [i, l] of layers.entries()) srcs.push(await uploadBuffer(`parallax/${id}/${i}.webp`, l.webp, "image/webp"));
    const cfg: ParallaxConfig = { background, layers: layers.map((l, i) => ({ ...l.layer, src: srcs[i] })), glows: draft.glows, ...(draft.scene ? { scene: draft.scene } : {}) };
    await setStep(url, "done", `${layers.length} ${layers.length === 1 ? "camada" : "camadas"}`, JSON.stringify(cfg));
  } catch (e) {
    console.error("parallax: o agente falhou", url, e);
    await setStep(url, "failed", briefError(e)).catch(() => {});
  }
}

// Uma capa por vez: cada geração usa ~1 GB de memória (modelo de segmentação).
let queue: Promise<unknown> = Promise.resolve();

// Chamado no upload da capa: responde na hora e gera em segundo plano.
export async function startParallax(url: string, cover: Buffer) {
  await prepareParallax(url, cover);
  queue = queue.then(() => generateParallax(url, cover));
}

// Andamento para o admin; "none" = capa sem registro.
export async function parallaxStatus(url: string) {
  const [r] = await db.select().from(coverParallax).where(eq(coverParallax.url, url));
  return r ? { status: r.status, step: r.step, hasLayers: !!r.config, active: generating(r.status) } : { status: "none" as const, step: null, hasLayers: false, active: false };
}

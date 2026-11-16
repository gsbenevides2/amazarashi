import type { CSSProperties } from "react";
import BlurScope from "@/src/components/BlurScope";
import Footer from "../components/layout/Footer";
import Reveal from "../components/Reveal";
import JsonLd, { abs, breadcrumb } from "../components/JsonLd";
import { underline } from "../components/links";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const wrap = "mx-auto max-w-[calc(1320px+9.25rem)] px-6 md:px-18.5";
const h2 = "font-latin text-2xl uppercase md:text-3xl";
const link = `pb-1 after:bottom-0 ${underline}`;

type Item = { title: string; body: string };

const collected: Item[] = [
  {
    title: "Páginas e cliques",
    body: "Qual página você abriu, de onde veio, quais links internos e externos clicou e o que buscou no campo de busca.",
  },
  {
    title: "Gravação de sessão",
    body: "Reconstrução visual da navegação (rolagem, cliques e movimentos) para reproduzir problemas de layout e usabilidade. Campos de formulário e senhas são mascarados.",
  },
  {
    title: "Desempenho e erros",
    body: "Tempo de carregamento, recursos baixados, tarefas longas, erros de JavaScript no navegador e erros do servidor, com a pilha de chamadas.",
  },
  {
    title: "Sessão anônima",
    body: "Um identificador aleatório guardado no seu navegador para agrupar os eventos da mesma visita. Ele não contém seu nome nem seu e-mail.",
  },
  {
    title: "IP e localização aproximada",
    body: "O endereço IP de origem e, a partir dele, país, região, cidade, fuso horário e coordenadas aproximadas. É usado para separar acessos humanos de robôs e entender de onde vem o público.",
  },
  {
    title: "Origem da visita",
    body: "Parâmetros de campanha (utm_source, utm_medium, utm_campaign), domínio do site que enviou você e a primeira página acessada. Ficam apenas na memória da aba.",
  },
  {
    title: "Google Analytics",
    body: "Quando configurado, o GA4 recebe visualizações e eventos personalizados (cliques externos, navegação e buscas). O Google atua como terceiro e usa cookies próprios.",
  },
  {
    title: "Logs do servidor",
    body: "Requisições, tempos de resposta, falhas e versão do serviço, com o mesmo IP e localização usados no navegador.",
  },
];

const storage: [string, string, string][] = [
  ["Sessão do RUM", "localStorage (amz_sess_*)", "Expira por inatividade; não é cookie."],
  ["Origem da visita", "sessionStorage (amz_acq)", "Some quando você fecha a aba."],
  ["Aviso de telemetria", "localStorage (amz_telemetry_notice)", "Guarda que você já viu este aviso."],
  ["Google Analytics", "Cookies _ga / _ga_*", "Definidos pelo Google quando o GA está ativo."],
];

export default function Telemetria() {
  return (
    <BlurScope>
      <div style={{ "--hd": "0.2s" } as CSSProperties}>
        <JsonLd
          data={{
            "@type": "WebPage",
            name: "Telemetria — Amazarashi BR",
            url: abs("/telemetria"),
            inLanguage: "pt-BR",
            description: "Quais dados o Amazarashi BR coleta, para quê, onde ficam e como desativar.",
            isPartOf: { "@type": "WebSite", name: "Amazarashi BR", url: abs("/") },
          }}
        />
        <JsonLd data={breadcrumb([["Início", "/"], ["Telemetria", "/telemetria"]])} />
        <main>
          <section className={`${wrap} pt-32 md:pt-40`}>
            <p style={d(200)} className="hero-in font-latin text-xs uppercase tracking-widest text-fg/50">
              Transparência
            </p>
            <h1 style={d(250)} className="hero-in mt-2 font-latin text-[clamp(32px,8vw,56px)] uppercase">
              Telemetria
            </h1>
            <p style={d(400)} className="hero-in mt-6 max-w-3xl text-lg leading-relaxed text-fg/80 md:text-xl">
              Este é um fã-site sem fins comerciais. Para saber quais páginas funcionam, quais links são usados e quais
              erros precisam de conserto, o site coleta dados de navegação — inclusive uma gravação anônima da sessão.
            </p>
            <p style={d(500)} className="hero-in mt-4 max-w-3xl text-fg/60">
              Não há cadastro, não vendemos dados e não usamos os registros para publicidade.
            </p>
            <nav aria-label="Atalhos" style={d(600)} className="hero-in mt-8 flex flex-wrap gap-x-6 gap-y-2 font-latin text-sm uppercase">
              <a href="#coletamos" className={link}>O que coletamos</a>
              <a href="#motivo" className={link}>Para que serve</a>
              <a href="#desativar" className={link}>Como desativar</a>
            </nav>
            <p className="mt-12 border-t border-line pt-4 text-xs text-fg/50">Atualizado em novembro de 2026.</p>
          </section>

          <section id="coletamos" aria-labelledby="coletamos-t" className={`${wrap} pt-14 md:pt-20`}>
            <Reveal>
              <h2 id="coletamos-t" className={h2}>O que é coletado</h2>
              <p className="mt-4 max-w-3xl text-fg/75">
                Os registros são técnicos e ligados a uma sessão anônima. Nenhum deles identifica você pelo nome.
              </p>
            </Reveal>
            <ul className="mt-8 grid gap-px border border-line bg-line md:grid-cols-2">
              {collected.map((item, i) => (
                <Reveal as="li" key={item.title} delay={i * 40} className="bg-bg p-6 md:p-7">
                  <h3 className="font-latin text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 leading-relaxed text-fg/75">{item.body}</p>
                </Reveal>
              ))}
            </ul>
          </section>

          <section id="motivo" aria-labelledby="motivo-t" className={`${wrap} pt-14 md:pt-20`}>
            <Reveal>
              <h2 id="motivo-t" className={h2}>Para que serve</h2>
              <div className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-fg/80">
                <p>
                  Entender quais páginas e músicas são mais procuradas, de onde vêm os visitantes e onde a navegação
                  trava — no celular ou no desktop. A gravação de sessão existe para reproduzir um bug exatamente como
                  ele apareceu, sem precisar pedir prints ou dados pessoais a quem visitou.
                </p>
                <p>
                  Os dados também alimentam o acompanhamento de erros do servidor e das rotas da API, para que uma falha
                  seja corrigida antes de afetar mais gente.
                </p>
              </div>
            </Reveal>
          </section>

          <section aria-labelledby="fora-t" className={`${wrap} pt-14 md:pt-20`}>
            <Reveal>
              <h2 id="fora-t" className={h2}>O que fica de fora</h2>
              <ul className="mt-6 max-w-3xl space-y-3 text-fg/80">
                <li className="flex gap-3"><span aria-hidden className="text-fg/40">—</span><span>Conteúdo digitado em formulários de busca ou de login é mascarado na gravação de sessão.</span></li>
                <li className="flex gap-3"><span aria-hidden className="text-fg/40">—</span><span>O site não pede nome, e-mail, telefone ou documento para navegar. A área administrativa exige login, mas ela não é telemetria.</span></li>
                <li className="flex gap-3"><span aria-hidden className="text-fg/40">—</span><span>Não há venda, aluguel ou troca de dados com terceiros, nem pixels de anúncios.</span></li>
                <li className="flex gap-3"><span aria-hidden className="text-fg/40">—</span><span>O identificador de sessão é aleatório e fica só no seu navegador; ele não é vinculado a uma conta.</span></li>
              </ul>
            </Reveal>
          </section>

          <section aria-labelledby="onde-t" className={`${wrap} pt-14 md:pt-20`}>
            <Reveal>
              <h2 id="onde-t" className={h2}>Onde os dados ficam</h2>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-fg/80">
                Os eventos do navegador e os traces do servidor vão para uma instância de observabilidade
                (<span className="font-latin">OpenObserve</span>) mantida pelo projeto. O RUM e os traces são enviados
                para o próprio domínio do site e repassados pelo servidor. O Google Analytics, quando ativo, é o único
                destino externo. A retenção segue a configuração dessa instância; as sessões do RUM expiram por
                inatividade.
              </p>
            </Reveal>
            <Reveal className="mt-8 overflow-x-auto">
              <table className="w-full min-w-140 border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line font-latin text-xs uppercase tracking-widest text-fg/50">
                    <th className="py-3 pr-4 font-bold">O quê</th>
                    <th className="py-3 pr-4 font-bold">Onde</th>
                    <th className="py-3 font-bold">Duração</th>
                  </tr>
                </thead>
                <tbody>
                  {storage.map(([what, where, how]) => (
                    <tr key={what} className="border-b border-line">
                      <td className="py-3 pr-4 align-top">{what}</td>
                      <td className="py-3 pr-4 align-top font-latin text-fg/75">{where}</td>
                      <td className="py-3 align-top text-fg/75">{how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Reveal>
          </section>

          <section id="desativar" aria-labelledby="desativar-t" className={`${wrap} pt-14 md:pt-20`}>
            <Reveal>
              <h2 id="desativar-t" className={h2}>Como desativar</h2>
              <div className="mt-6 grid max-w-4xl gap-6 md:grid-cols-2">
                <div className="border border-line p-6">
                  <h3 className="font-latin text-lg font-bold">Bloqueie no navegador</h3>
                  <p className="mt-2 leading-relaxed text-fg/75">
                    Extensões como uBlock Origin, Privacy Badger ou a lista de privacidade do Brave bloqueiam os envios
                    de telemetria. Você também pode bloquear manualmente os caminhos <code className="text-fg">/v1/traces</code> e{" "}
                    <code className="text-fg">/geo</code>, além de <code className="text-fg">googletagmanager.com</code>.
                  </p>
                </div>
                <div className="border border-line p-6">
                  <h3 className="font-latin text-lg font-bold">Desligue o JavaScript</h3>
                  <p className="mt-2 leading-relaxed text-fg/75">
                    Sem JavaScript o RUM e o GA não iniciam. As páginas continuam legíveis, mas player, busca e
                    animações deixam de funcionar.
                  </p>
                </div>
                <div className="border border-line p-6">
                  <h3 className="font-latin text-lg font-bold">Não enviamos DNT</h3>
                  <p className="mt-2 leading-relaxed text-fg/75">
                    O cabeçalho <span className="font-latin">Do Not Track</span> não é interpretado pelo site; use o
                    bloqueio por extensão para garantir a interrupção.
                  </p>
                </div>
                <div className="border border-line p-6">
                  <h3 className="font-latin text-lg font-bold">Limpe o armazenamento</h3>
                  <p className="mt-2 leading-relaxed text-fg/75">
                    Apagar os dados do site remove o identificador de sessão e a origem guardada. Uma nova sessão
                    anônima será criada se a telemetria continuar ativa.
                  </p>
                </div>
              </div>
            </Reveal>
          </section>

          <section aria-labelledby="direitos-t" className={`${wrap} pt-14 pb-16 md:pt-20 md:pb-24`}>
            <Reveal>
              <h2 id="direitos-t" className={h2}>Seus direitos</h2>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-fg/80">
                Como os registros são anônimos, não é possível localizar um visitante específico pelo nome. Ainda assim,
                você pode pedir esclarecimentos sobre o tratamento de dados, a remoção de uma sessão ou relatar um
                problema pelo{" "}
                <a
                  href="https://github.com/gsbenevides2/amazarashi/issues"
                  target="_blank"
                  rel="noreferrer"
                  className={link}
                >
                  repositório do projeto
                </a>
                .
              </p>
            </Reveal>
          </section>
        </main>
        <Footer />
      </div>
    </BlurScope>
  );
}

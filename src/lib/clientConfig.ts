// Config pública que o servidor injeta no <head> (window.__CFG__), lida em runtime.
// Motivo: `process.env.NEXT_PUBLIC_*` no código do browser é substituído no BUILD; a imagem é construída sem env,
// então lá GA e RUM nunca ligavam. O layout (servidor) lê o env do container e entrega aqui.
export type ClientConfig = { ga?: string; rum?: { token: string; site: string; org: string } };

declare global {
  interface Window {
    __CFG__?: ClientConfig;
  }
}

export function serverClientConfig(): ClientConfig {
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  const token = process.env.NEXT_PUBLIC_RUM_TOKEN;
  const site = process.env.NEXT_PUBLIC_RUM_SITE;
  const org = process.env.NEXT_PUBLIC_OTEL_ORGANIZATION;
  return { ...(ga && { ga }), ...(token && site && org && { rum: { token, site, org } }) };
}

export const clientConfig = (): ClientConfig => (typeof window !== "undefined" && window.__CFG__) || {};

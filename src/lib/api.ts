import { treaty } from "@elysia/eden";
import { app } from "../server";

// Server Components chamam o app direto, sem HTTP. parseDate:false: datas ISO ficam string, como nos tipos.
export const api = treaty(app, { parseDate: false }).api;

// Erro em lista = bug/banco fora do ar; deixa estourar no error.tsx. 404 de detalhe é tratado na página com notFound().
export function unwrap<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error || data === null) throw new Error("Falha ao consultar a API");
  return data;
}

export const brDate = (iso: string) => iso.split("-").reverse().join("/");

// Menu, redes e textos soltos: Header, Footer, Hero e biografia pedem o mesmo dado na mesma renderização.
// "use cache": entra no shell pré-renderizado (sem isso vira buraco streamed, invisível sem JS). O admin revalida via revalidatePath.
export async function getChrome() {
  "use cache";
  return unwrap(await api.chrome.get());
}

// Compartilhados entre a página e o opengraph-image de cada slug.
export async function getAlbum(slug: string) {
  "use cache";
  return (await api.releases({ slug }).get()).data;
}

export async function getSong(slug: string) {
  "use cache";
  return (await api.songs({ slug }).get()).data;
}

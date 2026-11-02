import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMeta } from "../../../lib/site";
import Home from "../../../views/home";
import Musicas from "../../../views/albuns-e-discos";
import Biografia from "../../../views/biografia";
import Videoclipes from "../../../views/videoclipes";

// Páginas fixas servidas como ISG: rewrites (next.config.ts) levam "/", "/biografia"... para cá.
// O build não tem banco, então só o placeholder é gerado nele (vira 404 sem consultar nada);
// as páginas reais são geradas no 1º acesso e ficam no cache (MISS -> HIT), com o status certo.
const pages = {
  home: { View: Home },
  "albuns-e-discos": { View: Musicas, meta: () => pageMeta("/albuns-e-discos", "Discografia", "Álbuns, singles e DVDs do Amazarashi.") },
  biografia: { View: Biografia, meta: () => pageMeta("/biografia", "Biografia", "A história da banda japonesa Amazarashi: integrantes, linha do tempo e músicas em animes.") },
  videoclipes: { View: Videoclipes, meta: () => pageMeta("/videoclipes", "Vídeoclipes", "Todos os videoclipes do Amazarashi.") },
} as const;
type Key = keyof typeof pages;
const find = (k: string) => (Object.hasOwn(pages, k) ? pages[k as Key] : undefined);

export const generateStaticParams = () => [{ page: "__placeholder__" }];

export async function generateMetadata({ params }: PageProps<"/isg/[page]">): Promise<Metadata> {
  const k = (await params).page;
  const p = find(k);
  if (!p || !("meta" in p)) return {};
  const m = p.meta();
  return { ...m, openGraph: { ...m.openGraph, images: [`/${k}/opengraph-image`] } }; // a chave da página é o próprio caminho
}

export default async function Page({ params }: PageProps<"/isg/[page]">) {
  const p = find((await params).page);
  if (!p) notFound();
  return <p.View />;
}

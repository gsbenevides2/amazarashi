import type { Metadata } from "next";

// URL pública (sitemap, robots, OG, JSON-LD). Defina SITE_URL em produção.
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";
export const SITE_NAME = "Amazarashi BR";

// O openGraph de uma página substitui o do layout (não mescla): este helper repete og:url/type/site_name/locale.
export const pageMeta = (path: string, title: string, description?: string, type: "website" | "music.song" | "music.album" = "website"): Metadata => ({
  title: `${title} | ${SITE_NAME}`,
  description,
  alternates: { canonical: path },
  openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, siteName: SITE_NAME, locale: "pt_BR", type: type as "website" },
});

// "2:53" -> "PT2M53S"
export const isoDuration = (d: string) => {
  const [m, s] = d.split(":");
  return `PT${Number(m)}M${Number(s)}S`;
};

// Meta description: corta em palavra inteira, no máximo n caracteres.
export const clip = (s: string, n = 155) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(" ", n - 1))}…`);

// Descrições ainda não revisadas vêm com "(Rascunho: ...)": nunca vão para meta, JSON-LD ou tela.
export const isDraft = (d: string) => d.includes("Rascunho");

// "Faixa do álbum X (Y), lançada em 17 de junho de 2026. Texto..." -> só "Texto..." (a abertura é boilerplate).
export const songBlurb = (d: string) => (isDraft(d) ? "" : d.replace(/^Faixa[^.]*\.\s*/, ""));

export const releaseKind = { album: "álbum", single: "single", dvd: "DVD/Blu-ray", streaming: "lançamento digital" } as const;

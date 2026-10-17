import { api, brDate, getAlbum, unwrap } from "../../../lib/api";
import { coverImage, ogSize } from "../../../lib/og";

export const alt = "Álbum — Amazarashi BR";
export const size = ogSize;
export const contentType = "image/png";
export const generateStaticParams = async () => unwrap(await api.releases.get({ query: {} })).flatMap((r) => (r.slug ? [{ slug: r.slug }] : []));

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const a = await getAlbum((await params).slug);
  if (!a) return new Response("Not found", { status: 404 });
  return coverImage({ cover: a.cover, eyebrow: "ÁLBUM", title: a.romaji ?? a.title, kana: a.romaji ? a.title : null, footer: brDate(a.releaseDate) });
}

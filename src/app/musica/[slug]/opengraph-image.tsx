import { api, getSong, unwrap } from "../../../lib/api";
import { coverImage, ogSize } from "../../../lib/og";

export const alt = "Música — Amazarashi BR";
export const size = ogSize;
export const contentType = "image/png";
export const generateStaticParams = async () => unwrap(await api.songs.get());

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const s = await getSong((await params).slug);
  if (!s) return new Response("Not found", { status: 404 });
  return coverImage({ cover: s.album.cover, eyebrow: `MÚSICA · FAIXA ${s.trackNumber}`, title: s.romaji, kana: s.kana, footer: `${s.album.romaji ?? s.album.title}` });
}

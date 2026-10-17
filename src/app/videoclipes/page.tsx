import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { pageMeta } from "../../lib/site";
import Footer from "../../components/layout/Footer";
import ClipGrid from "../../components/videoclipes/ClipGrid";
import { api, unwrap } from "../../lib/api";
import JsonLd, { artist, breadcrumb, collectionPage } from "../../components/JsonLd";

export const metadata: Metadata = pageMeta("/videoclipes", "Vídeoclipes", "Todos os videoclipes do Amazarashi.");

async function Clips() {
  "use cache";
  const clips = unwrap(await api["music-videos"].get());
  const videos = clips.map((c) => ({
    // ponytail: sem VideoObject porque o Google exige uploadDate e music_videos não guarda a data; com a coluna (data do YouTube), volta a VideoObject + contentUrl/embedUrl
    "@type": "CreativeWork",
    name: c.romaji ?? c.title,
    alternateName: c.romaji ? c.title : undefined,
    description: `Videoclipe oficial de ${c.romaji ?? c.title}, do Amazarashi.`,
    thumbnailUrl: c.coverImage ?? `https://i.ytimg.com/vi/${c.youtubeId}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${c.youtubeId}`,
    creator: artist,
  }));
  return (
    <>
      <JsonLd data={collectionPage("Vídeoclipes", "/videoclipes", videos)} />
      <JsonLd data={breadcrumb([["Início", "/"], ["Vídeoclipes", "/videoclipes"]])} />
      <ClipGrid clips={clips} />
    </>
  );
}

export default function Videoclipes() {
  return (
    // --hd: sem hero de abertura, o header entra logo
    <div style={{ "--hd": "0.2s" } as CSSProperties}>
      <main className="mx-auto w-full max-w-367 px-6 pt-32 md:px-18.5 md:pt-40">
        <h1 style={{ "--d": "250ms" } as CSSProperties} className="hero-in mb-10 font-latin text-[clamp(32px,8vw,56px)] uppercase md:mb-14">Vídeoclipes</h1>
        <Clips />
      </main>
      <Footer />
    </div>
  );
}

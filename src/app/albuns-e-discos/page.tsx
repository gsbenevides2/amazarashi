import type { Metadata } from "next";
import { pageMeta } from "../../lib/site";
import Footer from "../../components/layout/Footer";
import Discography from "../../components/albuns-e-discos/Discography";
import { api, getChrome, unwrap } from "../../lib/api";
import JsonLd, { abs, artist, breadcrumb, collectionPage } from "../../components/JsonLd";

export const metadata: Metadata = pageMeta("/albuns-e-discos", "Discografia", "Álbuns, singles e DVDs do Amazarashi.");

async function List() {
  "use cache";
  const releases = unwrap(await api.releases.get({ query: {} }));
  const albums = releases.flatMap((r) =>
    r.slug ? [{ "@type": "MusicAlbum", name: r.romaji ?? r.title, alternateName: r.romaji ? r.title : undefined, url: abs(`/album/${r.slug}`), image: r.cover || undefined, datePublished: r.releaseDate, byArtist: artist }] : [],
  );
  return (
    <>
      <JsonLd data={collectionPage("Discografia", "/albuns-e-discos", albums)} />
      <JsonLd data={breadcrumb([["Início", "/"], ["Discografia", "/albuns-e-discos"]])} />
      <Discography releases={releases} />
    </>
  );
}

async function Intro() {
  const { discography_intro } = (await getChrome()).settings;
  return discography_intro ? <p style={{ "--d": "350ms" } as React.CSSProperties} className="hero-in mb-10 max-w-3xl text-fg/70 md:text-lg">{discography_intro}</p> : null;
}

export default function Musicas() {
  return (
    // --hd: sem hero, o header entra logo (padrão da home é 2,2s)
    <div style={{ "--hd": "0.2s" } as React.CSSProperties}>
      <main className="mx-auto w-full max-w-330 px-6 pt-32 md:px-10 md:pt-40">
        <h1 style={{ "--d": "250ms" } as React.CSSProperties} className="hero-in mb-10 font-latin text-[clamp(32px,8vw,56px)] uppercase md:mb-14">Discografia</h1>
        <Intro />
        <List />
      </main>
      <Footer />
    </div>
  );
}

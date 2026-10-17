import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Reveal from "../components/Reveal";
import Hero from "../components/home/Hero";
import AlbumMarquee from "../components/home/AlbumMarquee";
import CardList from "../components/home/CardList";
import InfoCardList from "../components/home/InfoCardList";
import VideoClipsSection from "../components/home/VideoClipsSection";
import { api, getChrome, unwrap } from "../lib/api";
import JsonLd, { abs, artist } from "../components/JsonLd";

async function Albums() {
  "use cache";
  const list = unwrap(await api.releases.get({ query: { category: "album" } })).slice(0, 6);
  const albums = list.map((a) => ({ title: a.romaji ?? a.title, year: Number(a.releaseDate.slice(0, 4)), cover: a.cover, href: a.slug ? `/album/${a.slug}` : "/albuns-e-discos" }));
  return <AlbumMarquee albums={albums} />;
}

async function Clips() {
  "use cache";
  const clips = unwrap(await api["music-videos"].get()).slice(0, 5).map((c) => ({ title: c.romaji ?? c.title, youtubeId: c.youtubeId, from: c.gradientFrom, to: c.gradientTo, coverImage: c.coverImage, gifPreview: c.gifPreview }));
  return <VideoClipsSection clips={clips} />;
}

async function Intro() {
  const { home_intro } = (await getChrome()).settings;
  return home_intro ? <Reveal as="p" className="mx-auto mt-16 max-w-3xl px-6 text-center text-fg/70 md:mt-24 md:text-lg">{home_intro}</Reveal> : null;
}

async function Blocks() {
  "use cache";
  const { highlights, infoCards } = unwrap(await api.home.get());
  return (
    <>
      {highlights.length > 0 && (
        <CardList
          id="destaques"
          title="Destaques"
          items={highlights.map((h) => ({ title: h.title, description: h.description, href: h.href ?? undefined, image: h.coverImage ? { src: h.coverImage, alt: h.imageAlt || h.title } : undefined }))}
          variant="slider"
        />
      )}
      {infoCards.length > 0 && (
        <InfoCardList
          items={infoCards.map((c) => ({
            headline: c.headline,
            subhead: c.subhead ?? undefined,
            bodyText: c.bodyText ?? undefined,
            image: c.coverImage ? { src: c.coverImage, alt: c.imageAlt || c.headline } : undefined,
            isFullModeStyle: c.layout === "full",
            textPosition: c.textPosition,
            callToAction: c.ctaMode && c.ctaText && c.ctaHref ? { mode: c.ctaMode, text: c.ctaText, href: c.ctaHref } : undefined,
          }))}
        />
      )}
    </>
  );
}

export default function Home() {
  return (
    <>
      <JsonLd data={{ "@type": "WebSite", name: "Amazarashi BR", url: abs("/"), inLanguage: "pt-BR", about: artist }} />
      <Header />
      <main>
        <Hero />
        <section id="albuns" aria-label="Álbuns" className="hero-albums relative z-10 mt-[-9vh]">
          <Albums />
        </section>
        <Intro />
        <Blocks />
        <Clips />
      </main>
      <Footer />
    </>
  );
}

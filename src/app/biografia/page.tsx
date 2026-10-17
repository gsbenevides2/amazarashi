import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { pageMeta } from "../../lib/site";
import Link from "next/link";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import Reveal from "../../components/Reveal";
import { api, getChrome, unwrap } from "../../lib/api";
import JsonLd, { abs, artist, breadcrumb } from "../../components/JsonLd";
import { underline } from "../../components/links";
import Image from "next/image";

export const metadata: Metadata = pageMeta("/biografia", "Biografia", "A história da banda japonesa Amazarashi: integrantes, linha do tempo e músicas em animes.");

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const wrap = "mx-auto max-w-[calc(1320px+9.25rem)] px-6 md:px-18.5";
const h2 = "font-latin text-2xl uppercase md:text-3xl";

export default async function Biografia() {
  "use cache";
  const [{ stats, members, timeline, animeSongs, sources }, { settings }] = await Promise.all([api.biography.get().then(unwrap), getChrome()]);
  return (
    // --hd: sem hero de abertura, o header entra logo
    <div style={{ "--hd": "0.2s" } as CSSProperties}>
      <JsonLd
        data={{
          "@type": "AboutPage",
          name: "Biografia do Amazarashi",
          url: abs("/biografia"),
          inLanguage: "pt-BR",
          mainEntity: {
            ...artist,
            description: settings.bio_intro,
            url: abs("/biografia"),
            foundingDate: "2007",
            foundingLocation: { "@type": "Place", name: "Aomori, Japão" },
            member: members.map((m) => ({ "@type": "Person", name: m.name, jobTitle: m.role, description: m.bio })),
          },
        }}
      />
      <JsonLd data={breadcrumb([["Início", "/"], ["Biografia", "/biografia"]])} />
      <Header />
      <main>
        <section className={`${wrap} pt-32 md:pt-40`}>
          <h1 style={d(250)} className="hero-in font-latin text-[clamp(32px,8vw,56px)] uppercase">Biografia</h1>
          <p style={d(400)} className="hero-in mt-6 max-w-3xl text-lg leading-relaxed text-fg/80 md:text-xl">
            {settings.bio_intro}
          </p>
          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-line py-8 md:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label} style={d(550 + i * 90)} className="hero-in">
                <dt className="font-latin text-[clamp(32px,6vw,56px)] font-bold leading-none">{s.value}</dt>
                <dd className="mt-2 text-sm text-fg/60">{s.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Reveal as="section" aria-labelledby="integrantes" className={`${wrap} pt-16 md:pt-24`}>
          <h2 id="integrantes" className={h2}>Integrantes</h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {members.map((m) => (
              <li key={m.name} className="group border border-line p-6 transition-colors duration-500 hover:border-fg md:p-8">
                <p className="font-latin text-sm uppercase text-fg/60">{m.role}</p>
                <h3 className="mt-2 font-latin text-2xl font-bold transition-transform duration-500 ease-out-cubic group-hover:translate-x-1">{m.name}</h3>
                <p className="mt-4 text-fg/80">{m.bio}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <section aria-labelledby="linha-do-tempo" className={`${wrap} pt-16 md:pt-24`}>
          <h2 id="linha-do-tempo" className={h2}>Linha do tempo</h2>
          <ol className="mt-8 border-t border-line">
            {timeline.map((t) => (
              <Reveal as="li" key={t.id} className="group grid gap-2 border-b border-line py-7 md:grid-cols-[180px_1fr] md:gap-10">
                <span className="font-latin text-3xl font-bold text-fg/40 transition-colors duration-500 group-hover:text-fg md:text-4xl">{t.yearLabel}</span>
                <p className="max-w-3xl self-center text-lg leading-relaxed text-fg/85">{t.text}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        <Reveal as="section" aria-labelledby="animes" className={`${wrap} pt-16 md:pt-24`}>
          <h2 id="animes" className={h2}>Músicas nos animes</h2>
          <ul className="mt-8 grid gap-x-6 gap-y-10 min-[500px]:grid-cols-2 lg:grid-cols-5">
            {animeSongs.map((a) => (
              <li key={a.id} className="group">
                <Link href={a.slug ? `/musica/${a.slug}` : "/albuns-e-discos"} className="block">
                  <div className="aspect-square overflow-hidden bg-card">
                    {a.coverImage ? <Image src={a.coverImage} alt={`Capa de ${a.song}`} width={600} height={600} sizes="(min-width: 1024px) 20vw, (min-width: 500px) 50vw, 100vw" className="size-full object-cover transition-transform duration-700 ease-out-cubic motion-safe:group-hover:scale-105" /> : null}
                  </div>
                  <p className="mt-4 font-latin text-sm text-fg/60 transition-colors duration-700 group-hover:text-fg">{a.year} / {a.role}</p>
                  <h3 className={`mt-1 w-fit pb-1 leading-snug after:bottom-0 ${underline} group-hover:after:scale-x-100`}>{a.song}</h3>
                  <p className="font-latin text-sm italic text-fg/60">{a.romaji}</p>
                  <p className="mt-2 text-sm text-fg/80">{a.anime}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal as="section" aria-labelledby="ao-vivo" className={`${wrap} pt-16 md:pt-24`}>
          <h2 id="ao-vivo" className={h2}>Ao vivo e no visual</h2>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-fg/80">
            Desde o primeiro show, em 2011, a banda toca atrás de uma tela que cobre o palco inteiro. As imagens e as letras são projetadas em sincronia com a música, e muita gente descreve a experiência como assistir a um filme enquanto ouve um show ao vivo. Os clipes seguem a mesma linha, com animação em CG.
          </p>
        </Reveal>

        <Reveal as="section" aria-labelledby="fontes" className={`${wrap} pb-8 pt-16 md:pt-24`}>
          <h2 id="fontes" className="font-latin text-sm uppercase text-fg/60">Fontes</h2>
          <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {sources.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer" className={`inline-block pb-1 after:bottom-0 ${underline}`}>{s.label}</a>
              </li>
            ))}
          </ul>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}

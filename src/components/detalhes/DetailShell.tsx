import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import Footer from "../layout/Footer";
import Image from "next/image";

export type Names = { romaji: string; kana: string; en: string; pt: string };

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

// Hero comum: capa desfocada ao fundo (abre do centro como o hero da home), capa nítida, título e ficha de nomes.
export default function DetailShell({ eyebrow, names, cover, date, back, children }: { eyebrow: string; names: Names; cover: string; date: string; back: { href: string; label: string }; children: ReactNode }) {
  const rows: [string, string][] = [
    ["Hiragana", names.kana],
    ["Inglês", names.en],
    ["Português", names.pt],
    ["Lançamento", date],
  ];
  return (
    // --hd: sem hero de abertura, o header entra logo
    <div style={{ "--hd": "0.2s" } as CSSProperties}>
      <main>
        <section className="relative overflow-hidden px-6 pb-8 pt-28 md:px-18.5 md:pb-8 md:pt-32">
          {cover ? <Image src={cover} alt="" aria-hidden fill sizes="100vw" quality={40} loading="eager" className="hero-art scale-110 object-cover opacity-30 blur-3xl" /> : null}
          <div aria-hidden className="absolute inset-0 bg-linear-to-b from-bg/0 to-bg" />
          <div className="relative mx-auto max-w-330">
            <Link href={back.href} style={d(100)} className="hero-in group/a inline-flex items-center gap-2 font-latin text-sm font-bold uppercase">
              <span aria-hidden className="transition-transform duration-500 ease-out-cubic group-hover/a:-translate-x-1">←</span>
              {back.label}
            </Link>
            <div className="mt-8 grid items-end gap-8 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-14">
              {cover ? <Image src={cover} alt={`Capa de ${names.romaji}`} width={600} height={600} priority sizes="320px" className="hero-art aspect-square w-full max-w-80 object-cover shadow-2xl lg:max-w-none" /> : <div />}
              <div>
                <p style={d(900)} className="hero-in font-latin text-sm uppercase text-fg/60">{eyebrow}</p>
                <h1 style={d(1000)} className="hero-in mt-2 font-latin text-[clamp(36px,8vw,80px)] font-bold uppercase leading-none">{names.romaji}</h1>
                <dl className="mt-8 grid gap-x-10 gap-y-4 text-sm sm:grid-cols-2">
                  {rows.map(([k, v], i) => (
                    <div key={k} style={d(1100 + i * 80)} className="hero-in">
                      <dt className="font-latin text-xs uppercase text-fg/60">{k}</dt>
                      <dd lang={k === "Hiragana" ? "ja" : undefined} className="mt-0.5 text-base">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>
        {children}
      </main>
      <Footer />
    </div>
  );
}

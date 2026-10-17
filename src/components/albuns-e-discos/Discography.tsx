"use client";

import { useState } from "react";
import Link from "next/link";

export type Category = "single" | "album" | "dvd" | "streaming";

const categories: { key: Category | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "single", label: "Single" },
  { key: "album", label: "Álbum" },
  { key: "dvd", label: "DVD/BD" },
  { key: "streaming", label: "Streaming" },
];
import { underline } from "../links";
import Reveal from "../Reveal";
import Image from "next/image";

const typeLabel: Record<Category, string> = { single: "Single", album: "Álbum", dvd: "DVD/BD", streaming: "Streaming" };

export type Release = { slug: string | null; category: Category; title: string; romaji: string | null; cover: string; releaseDate: string };

const card = (r: Release, dup: boolean) => (
  <>
    <div className="aspect-square overflow-hidden bg-card">
      {r.cover ? <Image src={r.cover} alt={`Capa de ${r.romaji ?? r.title}`} width={600} height={600} sizes="(min-width: 1024px) 25vw, 50vw" className="size-full object-cover transition-transform duration-700 ease-out-cubic motion-safe:group-hover:scale-105" /> : null}
    </div>
    <p className="mt-4 font-latin text-sm text-fg/60 transition-colors duration-700 group-hover:text-fg">
      {r.releaseDate.replaceAll("-", ".")} / {typeLabel[r.category]}
    </p>
    <h3 className="relative mt-1 w-fit pb-1 text-lg leading-snug after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:scale-x-0 after:bg-current after:content-[''] motion-safe:after:transition-transform motion-safe:after:duration-400 motion-safe:after:ease-[cubic-bezier(0.2,0.37,0.29,1.01)] group-hover:after:scale-x-100">{r.romaji ?? r.title}{r.romaji && <span lang="ja"> ({r.title})</span>}{dup && <span className="sr-only"> — {typeLabel[r.category]}, {r.releaseDate.slice(0, 4)}</span>}</h3>
  </>
);

export default function Discography({ releases }: { releases: Release[] }) {
  const [current, setCurrent] = useState<Category | "all">("all");
  const count = new Map<string, number>();
  for (const r of releases) count.set(r.romaji ?? r.title, (count.get(r.romaji ?? r.title) ?? 0) + 1);
  const items = current === "all" ? releases : releases.filter((r) => r.category === current);

  return (
    <>
      <ul style={{ "--d": "450ms" } as React.CSSProperties} className="hero-in flex flex-wrap gap-x-4 gap-y-2 border-y md:gap-x-8 border-line font-latin text-sm font-bold uppercase" aria-label="Categorias">
        {categories.map((c) => (
          <li key={c.key}>
            <button
              type="button"
              aria-pressed={current === c.key}
              onClick={() => setCurrent(c.key)}
              className={`cursor-pointer py-4 after:bottom-3 ${underline} ${current === c.key ? "after:scale-x-100" : "opacity-60 hover:opacity-100"}`}
            >
              {c.label}
            </button>
          </li>
        ))}
      </ul>
      <h2 className="sr-only">Lançamentos</h2>
      <ul key={current} className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((r, i) => (
          <Reveal as="li" repeat key={r.cover} delay={(i % 4) * 80} className="group">
            {r.slug ? (
              <Link href={`/album/${r.slug}`} className="block">
                {card(r, (count.get(r.romaji ?? r.title) ?? 0) > 1)}
              </Link>
            ) : (
              card(r, (count.get(r.romaji ?? r.title) ?? 0) > 1)
            )}
          </Reveal>
        ))}
      </ul>
    </>
  );
}

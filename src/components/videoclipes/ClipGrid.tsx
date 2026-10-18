"use client";

import { useState } from "react";
import { track } from "../../lib/track";
import Reveal from "../Reveal";
import { underline } from "../links";
import PlayIcon from "../PlayIcon";
import Image from "next/image";

type Clip = { title: string; romaji: string | null; youtubeId: string; coverImage: string | null; gifPreview?: string | null; webmPreview?: string | null };

// Miniatura enviada ao S3; sem ela, a do YouTube.
const thumb = (c: Clip) => c.coverImage ?? `https://i.ytimg.com/vi/${c.youtubeId}/hqdefault.jpg`;

export default function ClipGrid({ clips }: { clips: Clip[] }) {
  const [current, setCurrent] = useState<Clip | null>(null);
  const play = (c: Clip) => {
    track("video_play", { source: "clip_grid", video_id: c.youtubeId });
    setCurrent(c);
  };

  return (
    <>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-12 min-[600px]:grid-cols-2 lg:grid-cols-3">
        {clips.map((c, i) => (
          <Reveal as="li" repeat key={c.youtubeId} delay={(i % 3) * 80} className="group">
            {/* miniatura só para mouse/toque; o botão do teclado e do leitor de tela fica no título (h2) */}
            <button type="button" tabIndex={-1} aria-hidden onClick={() => play(c)} className="group/p block w-full cursor-pointer text-left">
              <span className="relative block aspect-video overflow-hidden bg-card">
                <Image src={thumb(c)} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 600px) 50vw, 100vw" className="object-cover transition-opacity duration-300 motion-safe:group-hover:opacity-0" />
                {c.webmPreview ? (
                  <video src={c.webmPreview} autoPlay loop muted playsInline className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300 motion-safe:group-hover:opacity-100" />
                ) : c.gifPreview ? (
                  <Image src={c.gifPreview} alt="" fill unoptimized sizes="(min-width: 1024px) 33vw, (min-width: 600px) 50vw, 100vw" className="object-cover opacity-0 transition-opacity duration-300 motion-safe:group-hover:opacity-100" />
                ) : null}
                <span aria-hidden className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover/p:bg-black/30" />
                <PlayIcon />
              </span>
            </button>
            <h2 className="mt-4 text-lg leading-snug">
              <button type="button" onClick={() => play(c)} aria-label={`Reproduzir ${c.romaji ?? c.title}`} className={`block w-fit cursor-pointer pb-1 text-left after:bottom-0 ${underline} group-hover:after:scale-x-100`}>
                {c.romaji ?? c.title}
              </button>
            </h2>
            {c.romaji && <p lang="ja" className="text-sm text-fg/50">{c.title}</p>}
          </Reveal>
        ))}
      </ul>

      {current && (
        <dialog
          ref={(d) => {
            if (d && !d.open) d.showModal();
          }}
          aria-label={current.romaji ?? current.title}
          onClose={() => setCurrent(null)}
          onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
          className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-center justify-center bg-black/90 p-4 open:flex"
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${current.youtubeId}?autoplay=1&rel=0`}
            title={current.romaji ?? current.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="aspect-video w-full max-w-275"
          />
          <button type="button" onClick={(e) => e.currentTarget.closest("dialog")?.close()} aria-label="Fechar vídeo" className="absolute right-4 top-4 cursor-pointer p-2 text-3xl text-white">
            ×
          </button>
        </dialog>
      )}
    </>
  );
}

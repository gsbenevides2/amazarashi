"use client";

import { useState } from "react";
import { track } from "../../lib/track";
import Image from "next/image";
import ArrowIcon from "../ArrowIcon";
import PlayIcon from "../PlayIcon";

type Clip = { title: string; youtubeId: string; from: string; to: string; coverImage?: string | null; gifPreview?: string | null };

const thumbSizes = "(min-width: 1248px) 770px, 64vw";
const ease = "ease-[cubic-bezier(0.25,1,0.5,1)] motion-reduce:transition-none";

export default function VideoCarousel({ clips }: { clips: Clip[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const paused = hover || focus || playing;
  const n = clips.length;
  const go = (d: number) => setI((i + d + n) % n);

  return (
    <div
      className="relative aspect-16/12 w-full sm:aspect-video"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={(e) => setFocus(e.target.matches(":focus-visible"))}
      onBlur={() => setFocus(false)}
    >
      {/* fundo: vídeo ativo ampliado */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {clips.map((c, k) => (
          <div
            key={c.title}
            className={`absolute inset-0 transition-[opacity,transform] duration-900 ${ease} ${k === i ? "scale-100 opacity-100" : "scale-[1.15] opacity-0"}`}
            style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
          >
            {c.coverImage && <Image src={c.coverImage} alt={`Miniatura de ${c.title}`} fill sizes="50vw" quality={40} className="scale-110 object-cover blur-2xl" />}
            <div className="absolute inset-0 bg-black/30" />
          </div>
        ))}
      </div>

      {/* faixa de miniaturas: sangra além da coluna */}
      <ul
        className={`absolute left-[18%] top-[18%] flex w-[64%] transition-transform duration-800 ${ease}`}
        style={{ transform: `translateX(calc(${-i} * 103.26%))` }}
      >
        {clips.map((c, k) => {
          const active = k === i;
          const thumb = (
            <span
              className="relative block aspect-video w-full"
              style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
            >
              {active && c.gifPreview ? (
                <Image src={c.gifPreview} alt={`Miniatura de ${c.title}`} fill unoptimized sizes={thumbSizes} className="object-cover" />
              ) : c.coverImage ? (
                <Image src={c.coverImage} alt="" fill sizes={thumbSizes} className="object-cover" />
              ) : null}
              {active && <PlayIcon />}
            </span>
          );
          return (
            <li key={c.title} className="relative mr-[3.26%] w-full shrink-0" aria-current={active || undefined}>
              {active ? (
                <button type="button" onClick={() => {
                  track("video_play", { source: "home_carousel", video_title: c.title });
                  setPlaying(true);
                }} aria-label={`Reproduzir ${c.title}`} className="group/p block w-full cursor-pointer">
                  {thumb}
                </button>
              ) : (
                <button type="button" onClick={() => setI(k)} aria-label={`Selecionar vídeo: ${c.title}`} className="block w-full cursor-pointer opacity-80 transition-opacity hover:opacity-100">
                  {thumb}
                </button>
              )}
              <h3 className="font-latin absolute left-0 top-full mt-3 block max-w-full bg-fg px-5 py-1 text-xs md:text-[13px] text-bg">
                {c.title}
              </h3>
            </li>
          );
        })}
      </ul>

      {playing && (
        <dialog
          ref={(d) => {
            if (d && !d.open) d.showModal();
          }}
          aria-label={clips[i].title}
          onClose={() => setPlaying(false)}
          onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
          className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-center justify-center bg-black/90 p-4 open:flex"
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${clips[i].youtubeId}?autoplay=1&rel=0`}
            title={clips[i].title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            className="aspect-video w-full max-w-275"
          />
          <button type="button" onClick={(e) => e.currentTarget.closest("dialog")?.close()} aria-label="Fechar vídeo" className="absolute right-4 top-4 cursor-pointer p-2 text-3xl text-white">
            ×
          </button>
        </dialog>
      )}

      {/* contador circular + setas */}
      <div className="absolute bottom-2 right-2 flex items-center gap-3 2xl:bottom-0 2xl:left-[calc(100%+38px)] 2xl:right-auto">
        <button type="button" onClick={() => go(-1)} aria-label="Vídeo anterior" className="group/a cursor-pointer px-3 py-2 2xl:px-2">
          <ArrowIcon direction="prev" />
        </button>
        <span className="font-latin grid size-14 place-items-center relative rounded-full border-2 border-fg/30 text-xs md:text-[13px] font-bold 2xl:size-20" aria-live={paused ? "polite" : "off"} aria-label={`Vídeo ${i + 1} de ${n}`}>
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute -inset-0.5 size-[calc(100%+4px)] -rotate-90 fill-none stroke-fg stroke-4 motion-reduce:hidden" aria-hidden>
            <circle
              key={i}
              cx="50"
              cy="50"
              r="48"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1}
              className="clock-ring"
              style={{ animationPlayState: paused ? "paused" : "running" }}
              onAnimationEnd={() => go(1)}
            />
          </svg>
          {String(i + 1).padStart(2, "0")}
        </span>
        <button type="button" onClick={() => go(1)} aria-label="Próximo vídeo" className="group/a cursor-pointer px-3 py-2 2xl:px-2">
          <ArrowIcon direction="next" />
        </button>
      </div>
    </div>
  );
}

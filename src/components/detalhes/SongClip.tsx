"use client";

import { useState } from "react";
import Image from "next/image";
import { track } from "../../lib/track";
import PlayIcon from "../PlayIcon";

type Props = { title: string; youtubeId: string; coverImage: string | null; gifPreview: string | null; webmPreview?: string | null };

// Mesmo tratamento da home: o play se desenha no hover, o GIF/WEBM só carrega no hover e o clique abre o vídeo em tela cheia.
export default function SongClip({ title, youtubeId, coverImage, gifPreview, webmPreview }: Props) {
  const [hover, setHover] = useState(false);
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          track("video_play", { source: "song_clip", video_id: youtubeId });
          setPlaying(true);
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={`Reproduzir o videoclipe de ${title}`}
        className="group/p relative block aspect-video w-full cursor-pointer overflow-hidden bg-card"
      >
        {/* sem coverImage cai na miniatura do próprio YouTube */}
        <Image src={coverImage ?? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} alt="" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
        {hover && webmPreview && <video src={webmPreview} autoPlay loop muted playsInline fill sizes="560px" className="object-cover" />}
        {hover && !webmPreview && gifPreview && <Image src={gifPreview} alt="" fill unoptimized sizes="560px" className="object-cover" />}
        <PlayIcon />
      </button>
      {playing && (
        <dialog
          ref={(d) => {
            if (d && !d.open) d.showModal();
          }}
          aria-label={title}
          onClose={() => setPlaying(false)}
          onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
          className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-center justify-center bg-black/90 p-4 open:flex"
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={title}
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

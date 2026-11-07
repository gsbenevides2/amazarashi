"use client";

import { useState } from "react";
import Img from "@/src/components/Img";

type Props = { src: string; alt: string };

// Capa do hero: o clique abre a imagem ampliada num <dialog> modal com efeito de vidro (glassmorfismo).
export default function CoverLightbox({ src, alt }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ampliar ${alt}`}
        aria-haspopup="dialog"
        className="hero-art block aspect-square w-full max-w-80 cursor-zoom-in shadow-2xl lg:max-w-none"
      >
        <Img src={src} alt={alt} width={600} height={600} priority sizes="320px" className="size-full object-cover" />
      </button>
      {open && (
        <dialog
          ref={(d) => {
            if (d && !d.open) d.showModal();
          }}
          aria-label={alt}
          onClose={() => setOpen(false)}
          onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
          className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-center justify-center bg-black/30 p-4 backdrop-blur-xl open:flex"
        >
          <div className="relative rounded-2xl border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-2xl backdrop-saturate-150">
            <Img src={src} alt={alt} width={1200} height={1200} sizes="(min-width: 768px) 640px, 90vw" className="aspect-square w-[min(90vw,640px)] max-h-[80vh] rounded-lg object-cover" />
          </div>
          <button type="button" onClick={(e) => e.currentTarget.closest("dialog")?.close()} aria-label="Fechar imagem" className="absolute right-4 top-4 cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1 text-3xl text-white backdrop-blur-md">
            ×
          </button>
        </dialog>
      )}
    </>
  );
}

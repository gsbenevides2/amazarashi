"use client";

import { useRef, useState } from "react";
import Img from "@/src/components/Img";
import Parallax from "./Parallax";
import type { ParallaxConfig } from "@/src/lib/parallax";

type Props = { src: string; alt: string; accent?: string; config?: ParallaxConfig };

// Capa do hero (com `config`, a versão ampliada anima o parallax; `accent` tinge o vidro do fundo): o clique abre a imagem ampliada num <dialog> modal com efeito de vidro (glassmorfismo).
export default function CoverLightbox({ src, alt, accent, config }: Props) {
  const [open, setOpen] = useState(false);
  const thumb = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  // Transição "FLIP": o cartão sai do retângulo da miniatura até o lugar final (e volta ao fechar); o vidro do fundo aparece junto.
  const flip = (to: "open" | "close") => {
    const d = dialog.current, c = card.current, t = thumb.current;
    if (!d || !c || !t || matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
    const a = t.getBoundingClientRect(), b = c.getBoundingClientRect();
    const from = `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`;
    const opening = to === "open";
    const timing = { duration: opening ? 480 : 320, easing: opening ? "cubic-bezier(.22,1,.36,1)" : "cubic-bezier(.64,0,.78,0)", fill: "both" as const };
    c.animate({ transform: opening ? [from, "none"] : ["none", from], opacity: opening ? [0.4, 1] : [1, 0.4] }, timing);
    return d.animate({ opacity: opening ? [0, 1] : [1, 0] }, timing).finished;
  };
  const close = async () => {
    if (closing.current) return;
    closing.current = true;
    await flip("close").catch(() => {});
    dialog.current?.close();
  };

  return (
    <>
      <button
        type="button"
        ref={thumb}
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
            dialog.current = d;
            if (d && !d.open) {
              d.showModal();
              flip("open");
            }
          }}
          aria-label={alt}
          onClose={() => { closing.current = false; setOpen(false); }}
          onCancel={(e) => { e.preventDefault(); close(); }} // Esc também anima antes de fechar
          onClick={(e) => e.target === e.currentTarget && close()}
          style={accent ? { background: `color-mix(in srgb, ${accent} 55%, transparent)` } : undefined}
          className={`fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-center justify-center p-4 backdrop-blur-xl open:flex ${accent ? "" : "bg-black/30"}`}
        >
          <div ref={card} style={{ transformOrigin: "0 0" }} className="relative rounded-2xl border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-2xl backdrop-saturate-150">
            {config ? (
              <Parallax config={config} alt={alt} className="w-[min(90vw,640px,80vh)] rounded-lg" />
            ) : (
              <Img src={src} alt={alt} width={1200} height={1200} sizes="(min-width: 768px) 640px, 90vw" className="aspect-square w-[min(90vw,640px)] max-h-[80vh] rounded-lg object-cover" />
            )}
          </div>
          <button type="button" onClick={close} aria-label="Fechar imagem" className="absolute right-4 top-4 flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md">
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </dialog>
      )}
    </>
  );
}

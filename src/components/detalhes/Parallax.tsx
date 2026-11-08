"use client";

import { useEffect, useRef } from "react";
import { bgScale, type ParallaxConfig } from "@/src/lib/parallax";

// Parallax da capa a partir da config gerada no upload (agente de IA, src/server/parallax-agent.ts): fundo + camadas recortadas + brilhos + cena.
// Mouse/dedo puxa a câmera; sem interação ela segue a trajetória da cena (loop de 20 s). Com movimento reduzido, fica parado.
// As camadas ocupam exatamente o quadro (a capa aparece inteira). Só o fundo ganha um zoom mínimo (bgScale), o bastante para nunca mostrar vazio.
const wrap = "absolute inset-0 will-change-transform";
const frac = (v: number) => v - Math.floor(v);

export default function Parallax({ config, alt, className }: { config: ParallaxConfig; alt: string; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const scene = config.scene;
  const amplitude = scene?.amplitude ?? 0.02;
  const vignette = scene?.vignette ?? 0.55;
  const particles = scene?.particles;

  useEffect(() => {
    const capa = root.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const camadas = [...capa.querySelectorAll<HTMLElement>("[data-forca]")];
    const flutuam = [...capa.querySelectorAll<HTMLElement>("[data-flutua]")];
    const brilhos = [...capa.querySelectorAll<HTMLElement>("[data-brilho]")];
    const graos = [...capa.querySelectorAll<HTMLElement>("[data-particula]")];
    const drift = scene?.drift ?? "eight";
    const zoom = bgScale(amplitude);
    let alvoX = 0, alvoY = 0, x = 0, y = 0, raf = 0;

    const move = (e: PointerEvent) => {
      const r = capa.getBoundingClientRect();
      alvoX = ((e.clientX - r.left) / r.width - 0.5) * 2;
      alvoY = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const sai = () => { alvoX = alvoY = 0; };
    capa.addEventListener("pointermove", move);
    capa.addEventListener("pointerleave", sai);

    const quadro = (ms: number) => {
      const t = ms / 1000, a = (t * Math.PI * 2) / 20, larg = capa.clientWidth;
      x += (alvoX - x) * 0.06;
      y += (alvoY - y) * 0.06;
      const [px, py] = drift === "circle" ? [Math.cos(a) * 0.4, Math.sin(a) * 0.4] : drift === "horizontal" ? [Math.sin(a) * 0.6, 0] : drift === "still" ? [0, 0] : [Math.sin(a) * 0.5, Math.sin(2 * a) * 0.25];
      const dx = px + x, dy = py + y;
      for (const c of camadas) {
        const k = parseFloat(c.dataset.forca!), f = k * larg * amplitude;
        c.style.transform = `translate(${-dx * f}px,${-dy * f}px) scale(${c.dataset.fundo !== undefined ? zoom : 1})`;
      }
      flutuam.forEach((el, i) => {
        // períodos 5 e 10 s dividem o loop de 20 s: sem pulo na emenda
        el.style.transform = `translateY(${Math.sin((t * Math.PI * 2) / 5 + i) * larg * 0.01}px) rotate(${Math.sin((t * Math.PI * 2) / 10 + i) * 5}deg)`;
      });
      for (const b of brilhos) {
        const g = Math.sin((t * Math.PI * 2) / parseFloat(b.dataset.brilho!));
        b.style.opacity = String(0.35 + 0.3 * g * g);
      }
      // partículas sobem devagar: velocidades inteiras por loop de 20 s (sem emenda) e somem nas bordas de cima e de baixo
      graos.forEach((el, i) => {
        const y0 = frac(i * 0.618034), x0 = frac(i * 0.754878 + 0.3), pos = frac(y0 - (t / 20) * (1 + (i % 2)));
        const sway = 0.012 * Math.sin((t * Math.PI * 2) / (20 / (1 + (i % 3))) + i);
        el.style.transform = `translate(${(x0 + sway) * larg}px,${pos * larg}px)`;
        el.style.opacity = String(Math.sin(pos * Math.PI) * (particles?.opacity ?? 0.3));
      });
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => {
      cancelAnimationFrame(raf);
      capa.removeEventListener("pointermove", move);
      capa.removeEventListener("pointerleave", sai);
    };
  }, [scene, amplitude, particles?.opacity]);

  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
  // Camadas agrupadas por profundidade: cada grupo é um bloco que se move junto.
  const depths = [...new Set(config.layers.map((l) => l.depth))].sort((a, b) => a - b);

  return (
    <div ref={root} role="img" aria-label={alt} className={`relative aspect-square overflow-hidden ${className ?? ""}`}>
      {/* eslint-disable @next/next/no-img-element */}
      <div data-forca="0.3" data-fundo="" className={wrap}>
        <img src={config.background} alt="" className="absolute inset-0 size-full select-none pointer-events-none" />
      </div>
      {depths.map((d) => (
        <div key={d} data-forca={d} className={wrap}>
          {config.layers.filter((l) => l.depth === d).map((l) => (
            <img key={l.src} data-flutua={l.float ? "" : undefined} src={l.src} alt="" style={{ left: pct(l.x), top: pct(l.y), width: pct(l.w), height: pct(l.h) }} className="absolute select-none pointer-events-none" />
          ))}
        </div>
      ))}
      {config.glows.length > 0 && (
        <div data-forca="0.7" className={wrap}>
          {config.glows.map((g, i) => (
            <div key={i} data-brilho={g.period} style={{ left: pct(g.x), top: pct(g.y), width: pct(g.w), height: pct(g.h), background: `radial-gradient(closest-side, ${g.color}, ${g.color}66 45%, transparent)` }} className="absolute rounded-full mix-blend-screen" />
          ))}
        </div>
      )}
      {particles && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: particles.count }, (_, i) => (
            <span key={i} data-particula="" style={{ background: particles.color, width: 2 + (i % 3), height: 2 + (i % 3), opacity: 0 }} className="absolute left-0 top-0 rounded-full" />
          ))}
        </div>
      )}
      <div style={{ background: `radial-gradient(80% 80% at 50% 48%, transparent 55%, rgba(0,0,0,${vignette}))` }} className="pointer-events-none absolute inset-0" />
    </div>
  );
}

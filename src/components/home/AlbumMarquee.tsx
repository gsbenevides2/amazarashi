"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

type Album = { title: string; year: number; cover: string; href: string };

const SPEED = 48; // px/s
const RESUME_MS = 1800; // retomada após toque/wheel/teclado
const DRAG_PX = 5;

export default function AlbumMarquee({ albums }: { albums: Album[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const s = useRef({ pos: 0, hover: false, down: false, focus: false, visible: true, resumeAt: 0, moved: 0, drag: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = s.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    // w = largura de uma cópia; M = margem para poder rolar à esquerda (clamp em 0 não dispara scroll)
    const dims = () => {
      const w = el.scrollWidth / 2;
      return { w, m: Math.max(0, Math.min(400, w - el.clientWidth)) };
    };
    // faixa válida [m, w+m): conteúdo idêntico a cada w, então o salto é invisível
    const wrap = (x: number) => {
      const { w, m } = dims();
      if (x >= w + m) return x - w;
      if (x < m) return x + w;
      return x;
    };
    st.pos = el.scrollLeft = dims().m;

    const io = new IntersectionObserver(([e]) => (st.visible = e.isIntersecting));
    io.observe(el);

    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.1);
      last = t;
      if (Math.abs(el.scrollLeft - st.pos) > 1.5) st.pos = el.scrollLeft; // usuário mexeu
      const paused = reduced.matches || st.hover || st.down || st.focus || !st.visible || document.hidden || t < st.resumeAt;
      if (!paused) {
        st.pos = wrap(st.pos + SPEED * dt);
        el.scrollLeft = st.pos;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  const bump = () => (s.current.resumeAt = performance.now() + RESUME_MS);

  return (
    <div
      ref={ref}
      className="cursor-grab select-none overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden active:cursor-grabbing"
      onScroll={(e) => {
        const el = e.currentTarget;
        const st = s.current;
        const w = el.scrollWidth / 2;
        const m = Math.max(0, Math.min(400, w - el.clientWidth));
        const x = el.scrollLeft;
        const y = x >= w + m ? x - w : x < m ? x + w : x;
        if (Math.abs(x - st.pos) > 1.5) {
          bump(); // rolagem do usuário (toque, wheel, teclado, arrasto)
          st.pos = y;
        }
        if (y !== x) el.scrollLeft = y;
      }}
      onWheel={bump}
      onPointerEnter={(e) => e.pointerType === "mouse" && (s.current.hover = true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && (s.current.hover = false)}
      onFocus={() => (s.current.focus = true)}
      onBlur={() => {
        s.current.focus = false;
        bump();
      }}
      onPointerDown={(e) => {
        const st = s.current;
        st.down = true;
        st.moved = 0;
        st.drag = e.pointerType === "mouse" && e.button === 0;
      }}
      onPointerMove={(e) => {
        const st = s.current;
        if (!st.drag) return;
        st.moved += Math.abs(e.movementX);
        if (st.moved <= DRAG_PX) return;
        // captura só após passar do limiar, senão o clique no link se perde
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.scrollLeft -= e.movementX;
      }}
      onPointerUp={(e) => {
        const st = s.current;
        st.down = st.drag = false;
        if (e.pointerType !== "mouse") bump();
      }}
      onPointerCancel={() => {
        s.current.down = s.current.drag = false;
        bump();
      }}
      onClickCapture={(e) => {
        if (s.current.moved > DRAG_PX) {
          e.preventDefault();
          e.stopPropagation();
          s.current.moved = 0;
        }
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="flex w-max">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0">
            {albums.map((a, index) => (
              <li key={a.href} className="shrink-0 pr-6">
                <a
                  href={a.href}
                  tabIndex={copy === 1 ? -1 : undefined}
                  className="group relative flex h-91.75 w-74.25 flex-col justify-end overflow-hidden p-5"
                >
                  {a.cover ? (
                    <Image
                      src={a.cover}
                      alt={`Capa de ${a.title}`}
                      fill
                      priority={index < 5}
                      fetchPriority={index <5 ? "high": "auto"}
                      sizes="297px"
                      draggable={false}
                      className="object-cover transition-transform duration-700 ease-out-cubic motion-safe:group-hover:scale-110"
                    />
                  ) : null}
                  <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="font-latin relative text-[17px] font-normal md:text-lg transition-transform duration-700 ease-out-cubic motion-safe:group-hover:-translate-y-2">{a.title}</span>
                  <span className="font-latin relative text-[13px] md:text-sm transition-transform duration-700 ease-out-cubic motion-safe:group-hover:-translate-y-2">{a.year}</span>
                </a>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

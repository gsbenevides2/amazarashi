"use client";

import ArrowIcon from "../ArrowIcon";
import { useEffect, useRef, useState } from "react";

const btn = "group/a grid size-10 place-items-center disabled:opacity-40";

export default function CardListSlider({ children, heading }: { children: React.ReactNode; heading: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = () => {
    const el = track.current;
    if (el) setEdge({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
  };

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(update); // dispara na montagem e ao redimensionar
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const [a, b] = [el.children[0] as HTMLElement, el.children[1] as HTMLElement | undefined];
    const step = b ? b.offsetLeft - a.offsetLeft : a.offsetWidth;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <>
      <div className="mb-3 flex items-center justify-between md:mb-6">
        {heading}
        <div className="flex gap-3 ml-auto shrink-0 pr-6 xl:pr-0">
        <button type="button" aria-label="Anterior" disabled={edge.start} onClick={() => scroll(-1)} className={btn}>
          <ArrowIcon direction="prev" />
        </button>
        <button type="button" aria-label="Próximo" disabled={edge.end} onClick={() => scroll(1)} className={btn}>
          <ArrowIcon direction="next" />
        </button>
        </div>
      </div>
      <div
        ref={track}
        onScroll={update}
        className="flex scroll-px-6 snap-x snap-mandatory gap-6 overflow-x-auto px-6 xl:scroll-px-0 xl:px-0 scrollbar-none [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </>
  );
}

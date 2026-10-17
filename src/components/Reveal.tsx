"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ElementType, type HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLElement> & { as?: ElementType; delay?: number; repeat?: boolean; threshold?: number };

// Revela ao rolar (medido em amazarashi.com: js-scroll dispara quando o topo cruza 80% da viewport;
// 20px -> 0 + opacity, 0.9s cubic-bezier(0.215,0.61,0.355,1)). Sem JS ou com reduced-motion fica tudo visível.
// Já visível no load: nunca é escondido. Por padrão revela uma vez só; com `repeat` anima toda vez que entra na tela
// (inclusive o que já está visível ao montar) e volta a esconder ao sair.
export default function Reveal({ as: Tag = "div", delay = 0, repeat = false, threshold = 0.8, className = "", style, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      delete el.dataset.reveal; // com `repeat` o servidor renderiza escondido: aqui volta a ficar visível
      return;
    }
    if (!repeat && el.getBoundingClientRect().top < innerHeight * threshold) {
      if (!delay) return;
      // já visível no load mas com atraso: entra depois do hero (o transition-delay faz a espera)
      el.dataset.reveal = "pending";
      void el.offsetHeight; // força o estilo "pending" ser calculado, senão o "in" não transiciona
      el.dataset.reveal = "in";
      return;
    }
    el.dataset.reveal = "pending";
    el.style.removeProperty("--rd"); // abaixo da dobra: o atraso é só do load, ao rolar revela direto
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.dataset.reveal = "in";
          if (!repeat) io.disconnect();
        } else if (repeat) el.dataset.reveal = "pending";
      },
      { rootMargin: `0px 0px -${(1 - threshold) * 100}% 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [repeat, delay, threshold]);

  return (
    <Tag
      ref={ref}
      // repeat/delay: nasce escondido no HTML do servidor para não piscar visível antes de hidratar e animar
      data-reveal={repeat || delay ? "pending" : undefined}
      style={delay ? ({ ...style, "--rd": `${delay}ms` } as CSSProperties) : style}
      className={`${className} data-[reveal=pending]:translate-y-5 data-[reveal=pending]:opacity-0 data-[reveal=in]:transition data-[reveal=in]:duration-900 data-[reveal=in]:ease-out-cubic data-[reveal=in]:[transition-delay:var(--rd,0ms)]`}
      {...rest}
    />
  );
}

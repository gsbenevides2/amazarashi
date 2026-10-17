"use client";

import { useState } from "react";
import { track } from "../../lib/track";

type Show = { romaji: boolean; pt: boolean };

// Cada `text` traz até 3 linhas: japonês, romaji e português. Japonês grande e em destaque,
// romaji pequeno em itálico (leitura), português em tamanho de leitura.
export function Verse({ text, show }: { text: string; show: Show }) {
  const [jp, romaji, pt] = text.split("\n");
  return (
    <>
      <p className="text-[clamp(22px,3.2vw,32px)] font-bold leading-snug">{jp}</p>
      {romaji && show.romaji && <p className="mt-1.5 font-latin text-sm italic tracking-wide text-fg/55 md:text-base">{romaji}</p>}
      {pt && show.pt && <p className="mt-1.5 text-base text-fg/85 md:text-lg">{pt}</p>}
    </>
  );
}

// Chips para ocultar romaji/português; japonês sempre aparece.
export function useShow() {
  const [show, setShow] = useState<Show>({ romaji: true, pt: true });
  const chip = (k: keyof Show, label: string, cls: string) => (
    <button
      key={k}
      type="button"
      aria-pressed={show[k]}
      onClick={() => {
        track("lyrics_language_toggle", { language: k, visible: !show[k] });
        setShow((s) => ({ ...s, [k]: !s[k] }));
      }}
      className={`cursor-pointer border border-line px-3 py-1.5 font-latin text-xs uppercase transition-colors duration-300 ${cls} ${show[k] ? "bg-fg text-bg" : "text-fg/60 hover:text-fg"}`}
    >
      {label}
    </button>
  );
  const toggles = (
    <div role="group" aria-label="Idiomas exibidos" className="flex flex-wrap items-center gap-2">
      <span className="border border-line px-3 py-1.5 font-latin text-xs uppercase text-fg/60">日本語</span>
      {chip("romaji", "Romaji", "italic")}
      {chip("pt", "Português", "")}
    </div>
  );
  return [show, toggles] as const;
}

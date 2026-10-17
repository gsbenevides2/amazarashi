"use client";

import { useState, type ReactNode } from "react";
import { underline } from "../links";

// Abas Descrição / Letras / Mais informações. Todos os painéis vão no HTML (SEO); os inativos ficam `hidden`.
export default function SongTabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div role="tablist" className="flex gap-8 border-b border-line font-latin text-sm font-bold uppercase">
        {tabs.map((t, n) => (
          <button
            key={t.label}
            role="tab"
            type="button"
            aria-selected={i === n}
            onClick={() => setI(n)}
            className={`cursor-pointer py-4 after:bottom-3 ${underline} ${i === n ? "after:scale-x-100" : "opacity-60 hover:opacity-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* display:none -> block reinicia a animação de entrada a cada troca de aba */}
      {tabs.map((t, n) => (
        <div key={t.label} role="tabpanel" hidden={i !== n} className="hero-in mt-8 leading-relaxed text-fg/80 md:text-lg">
          <h2 className="sr-only">{t.label}</h2>
          {t.content}
        </div>
      ))}
    </div>
  );
}

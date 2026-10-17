import type { CSSProperties, ReactNode } from "react";

// Gotas determinísticas (sem Math.random: server e client renderizam igual). Amazarashi = "exposto à chuva".
const DROPS = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  height: 40 + ((i * 53) % 70),
  duration: 1.1 + ((i * 29) % 12) / 10,
  delay: -(((i * 17) % 20) / 10),
}));

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

// Tela cheia de erro: chuva ao fundo, código gigante abre do centro (mesmo clip-path do hero) e pisca como luz falhando.
// header/footer vêm de fora: são server components (leem o banco) e o error.tsx é client, e não deve depender do banco que pode ter causado o erro.
export default function ErrorScreen({ code, title, text, children, header, footer }: { code: string; title: string; text: string; children: ReactNode; header?: ReactNode; footer?: ReactNode }) {
  return (
    <div style={{ "--hd": "0.2s" } as CSSProperties}>
      {header}
      <main className="relative flex min-h-screen items-center overflow-hidden px-6 md:px-18.5">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {DROPS.map((p, i) => (
            <span
              key={i}
              style={{ left: `${p.left}%`, height: p.height, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }}
              className="rain-drop absolute -top-32 block w-px bg-linear-to-b from-transparent to-fg/40"
            />
          ))}
        </div>
        <div className="relative mx-auto w-full max-w-330">
          <p aria-hidden className="hero-art err-code font-latin text-[clamp(120px,32vw,360px)] font-bold leading-none">{code}</p>
          <h1 style={d(900)} className="hero-in -mt-2 font-latin text-2xl font-bold md:-mt-6 md:text-5xl">{title}</h1>
          <p style={d(1000)} className="hero-in mt-3 max-w-prose text-fg/70 md:text-lg">{text}</p>
          <div style={d(1100)} className="hero-in mt-8 flex flex-wrap gap-4">{children}</div>
        </div>
      </main>
      {footer}
    </div>
  );
}

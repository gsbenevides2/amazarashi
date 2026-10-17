"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import PlayIcon from "../PlayIcon";

// t = segundo do vídeo em que a linha começa; nulo = letra sem sincronia (só lista).
export type LyricLine = { t: number | null; text: string };
import { Verse, useShow } from "./LyricParts";

type YTPlayer = { getCurrentTime(): number; seekTo(s: number, allowSeekAhead: boolean): void; destroy(): void };
type YTEvent = { target: YTPlayer };
type YTWindow = Window & { YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer }; onYouTubeIframeAPIReady?: () => void };

const Ctx = createContext<{ host: RefObject<HTMLDivElement | null>; player: RefObject<YTPlayer | null>; active: number; lines: LyricLine[]; synced: boolean; youtubeId: string; started: boolean; start: (seek?: number) => void } | null>(null);

// Dono do player do YouTube e do verso ativo: o vídeo (SongPlayer) e a aba de letras (SyncedList) compartilham o mesmo.
// O iframe e a API do YouTube só carregam depois do primeiro clique (play ou verso): a página abre leve (LCP/INP).
export function PlayerProvider({ youtubeId, lines = [], children }: { youtubeId: string; lines?: LyricLine[]; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [active, setActive] = useState(-1);
  const synced = lines.some((l) => l.t != null);
  const [started, setStarted] = useState(false);
  const pending = useRef<number | null>(null); // verso clicado antes do player existir

  const start = (seek?: number) => {
    if (seek != null) pending.current = seek;
    setStarted(true);
  };

  useEffect(() => {
    if (!started) return;
    const w = window as YTWindow;
    const create = () => {
      if (!host.current || !w.YT) return;
      player.current = new w.YT.Player(host.current, {
        videoId: youtubeId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, autoplay: 1 },
        events: {
          onReady: (e: YTEvent) => {
            if (pending.current != null) e.target.seekTo(pending.current, true);
            pending.current = null;
          },
        },
      });
    };
    if (w.YT?.Player) create();
    else {
      w.onYouTubeIframeAPIReady = create;
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.head.append(s);
      }
    }
    const id = setInterval(() => {
      if (!synced) return;
      const t = player.current?.getCurrentTime?.();
      if (t == null) return;
      let i = -1;
      lines.forEach((l, n) => l.t != null && l.t <= t && (i = n));
      setActive(i);
    }, 250);
    return () => {
      clearInterval(id);
      player.current?.destroy?.();
    };
  }, [youtubeId, lines, synced, started]);

  return <Ctx.Provider value={{ host, player, active, lines, synced, youtubeId, started, start }}>{children}</Ctx.Provider>;
}

const useCtx = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("PlayerProvider ausente");
  return c;
};

export function SongPlayer({ title }: { title: string }) {
  const { host, youtubeId, started, start } = useCtx();
  return (
    <div className="relative aspect-video overflow-hidden bg-card">
      <div ref={host} className="size-full" />
      {!started && (
        <button type="button" onClick={() => start()} aria-label={`Reproduzir ${title}`} className="group/p absolute inset-0 cursor-pointer">
          <Image src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} alt="" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
          <PlayIcon />
        </button>
      )}
    </div>
  );
}

// Aba "Letras": versos que acendem com o vídeo; clicar num verso pula para ele.
// Sem sincronia (t nulo), mostra só a lista.
export function SyncedList() {
  const { player, active, lines, synced, start } = useCtx();
  const [show, toggles] = useShow();
  const box = useRef<HTMLOListElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const first = useRef(true);
  const [shown, setShown] = useState(false); // o painel começa `hidden`: só dá para rolar a lista depois que aparece

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShown(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!synced || !shown) return;
    const el = refs.current[active];
    if (!el || !box.current) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // rola só a lista (nunca a página); a 1ª vez, ao abrir a aba, vai direto
    box.current.scrollTo({ top: el.offsetTop - box.current.clientHeight / 2 + el.offsetHeight / 2, behavior: reduced || first.current ? "auto" : "smooth" });
    first.current = false;
  }, [active, synced, shown]);

  return (
    <div>
      {toggles}
      <ol
        ref={box}
        className={
          synced
            ? "relative mt-4 max-h-[60vh] space-y-1 overflow-y-auto pb-[15vh] pr-2 mask-[linear-gradient(transparent,#000_5%,#000_88%,transparent)] lg:max-h-[70vh]"
            : "relative mt-4 space-y-1 pr-2"
        }
      >
        {lines.map((l, i) => (
          <li key={i}>
            {synced ? (
              <button
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                aria-current={i === active}
                onClick={() => (player.current ? player.current.seekTo(l.t!, true) : start(l.t!))}
                className={`block w-full cursor-pointer border-l-2 py-4 pl-5 text-left transition-[opacity,transform,border-color] duration-500 ease-out-cubic motion-reduce:transition-none ${
                  i === active ? "border-fg opacity-100 motion-safe:translate-x-2" : "border-transparent opacity-35 hover:opacity-70"
                }`}
              >
                <Verse text={l.text} show={show} />
              </button>
            ) : (
              <div className="block w-full border-l-2 border-transparent py-4 pl-5 text-left">
                <Verse text={l.text} show={show} />
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

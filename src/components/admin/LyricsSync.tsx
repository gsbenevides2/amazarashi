"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Line = { t: string; kana: string; romaji: string; pt: string };
type Song = Record<string, unknown> & { id: number; romaji: string; youtubeId: string; lyrics: string };
type YTPlayer = { getCurrentTime(): number; seekTo(s: number, allow: boolean): void; playVideo(): void; pauseVideo(): void; getPlayerState(): number; destroy(): void };
type YTWindow = Window & { YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer }; onYouTubeIframeAPIReady?: () => void };

const input = "w-full border border-line bg-card px-2 py-1 text-sm";
const btn = "cursor-pointer border border-line px-3 py-1.5 text-sm hover:border-fg disabled:opacity-50";

const parse = (text: string): Line[] =>
  text.split("\n").filter(Boolean).map((l) => {
    const [t, kana, romaji, pt] = l.split(" | ");
    return { t: t ?? "", kana: kana ?? "", romaji: romaji ?? "", pt: pt ?? "" };
  });
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;

// Letra sincronizada: Espaço marca o início da linha da vez e avança; clicar no tempo da linha pula o vídeo para ela.
export default function LyricsSync({ id }: { id: number }) {
  const [song, setSong] = useState<Song | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [cursor, setCursor] = useState(0); // próxima linha a marcar
  const [active, setActive] = useState(-1); // linha tocando agora
  const [now, setNow] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const linesRef = useRef(lines);
  useEffect(() => void (linesRef.current = lines), [lines]);

  useEffect(() => {
    fetch(`/api/admin/songs/${id}`).then((r) => r.json()).then((s: Song) => {
      setSong(s);
      setLines(parse(s.lyrics));
    }).catch(() => setMsg({ ok: false, text: "Não foi possível carregar a música." }));
  }, [id]);

  const youtubeId = song?.youtubeId;
  useEffect(() => {
    if (!youtubeId) return;
    const w = window as YTWindow;
    const create = () => {
      if (host.current && w.YT) player.current = new w.YT.Player(host.current, { videoId: youtubeId, width: "100%", height: "100%", playerVars: { rel: 0 } });
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
    const tick = setInterval(() => {
      const t = player.current?.getCurrentTime?.();
      if (t == null) return;
      setNow(t);
      let i = -1;
      linesRef.current.forEach((l, n) => l.t !== "" && Number(l.t) <= t && (i = n));
      setActive(i);
    }, 100);
    return () => {
      clearInterval(tick);
      player.current?.destroy?.();
    };
  }, [youtubeId]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = (next: Line[]) => {
    setLines(next);
    setDirty(true);
    setMsg(null);
  };
  const patch = (i: number, p: Partial<Line>) => edit(lines.map((l, n) => (n === i ? { ...l, ...p } : l)));
  const seek = (s: number) => player.current?.seekTo(Math.max(0, s), true);
  const time = () => player.current?.getCurrentTime() ?? 0;

  const mark = useCallback(() => {
    const t = (player.current?.getCurrentTime() ?? 0).toFixed(2);
    setLines((ls) => ls.map((l, n) => (n === cursor ? { ...l, t } : l)));
    setCursor((c) => Math.min(c + 1, linesRef.current.length));
    setDirty(true);
    setMsg(null);
  }, [cursor]);

  // Atalhos só fora dos campos de texto: Espaço marca, setas pulam 2s.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return;
      const p = player.current;
      const act: Record<string, () => void> = {
        Space: mark,
        ArrowLeft: () => seek(time() - 2),
        ArrowRight: () => seek(time() + 2),
        KeyK: () => (p?.getPlayerState() === 1 ? p.pauseVideo() : p?.playVideo()),
      };
      if (!act[e.code]) return;
      e.preventDefault();
      act[e.code]();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mark]);

  const paste = (text: string) => {
    const added = text.split("\n").map((l) => l.trim()).filter(Boolean).map((kana) => ({ t: "", kana, romaji: "", pt: "" }));
    if (!added.length) return;
    setCursor(lines.length);
    edit([...lines, ...added]);
  };

  const save = async () => {
    if (!song) return;
    if (lines.some((l) => [l.kana, l.romaji, l.pt].some((x) => x.includes("|")))) return setMsg({ ok: false, text: 'O caractere "|" não pode aparecer no texto.' });
    const timed = lines.filter((l) => l.t !== "");
    if (timed.some((l) => Number.isNaN(Number(l.t)))) return setMsg({ ok: false, text: "Há tempos inválidos." });
    if (timed.length && timed.length !== lines.length) return setMsg({ ok: false, text: "Marque o tempo das linhas que faltam ou deixe todas vazias (letra sem sincronia)." });
    // todas com tempo: ordena e confere duplicatas; todas vazias: letra sem sincronia, mantém a ordem
    const sorted = timed.length ? [...lines].sort((a, b) => Number(a.t) - Number(b.t)) : lines;
    const dup = timed.length && sorted.find((l, i) => i && Number(l.t) === Number(sorted[i - 1].t));
    if (dup) return setMsg({ ok: false, text: `Duas linhas começam em ${dup.t}s.` });
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/songs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...song, lyrics: sorted.map((l) => [l.t === "" ? "" : Number(l.t), l.kana, l.romaji, l.pt].join(" | ")).join("\n") }),
      });
      if (!res.ok) throw new Error((await res.json())?.message ?? "Erro ao salvar");
      setLines(sorted);
      setCursor(0);
      setDirty(false);
      setMsg({ ok: true, text: "Letra salva." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao salvar" });
    } finally {
      setBusy(false);
    }
  };

  if (!song) return <p className="text-fg/50">{msg?.text ?? "Carregando…"}</p>;
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin/songs" className="text-sm text-fg/60 hover:text-fg">← Músicas</Link>
        <h1 className="font-latin text-2xl uppercase">{song.romaji}</h1>
        {dirty && <span className="text-xs text-fg/50">não salvo</span>}
        <button className={`${btn} ml-auto`} disabled={busy || !dirty} onClick={save}>{busy ? "Salvando…" : "Salvar"}</button>
      </div>
      {msg && <p role="alert" className={`mb-4 border p-3 text-sm ${msg.ok ? "border-line text-fg/70" : "border-red-500 text-red-400"}`}>{msg.text}</p>}

      <div className="sticky top-0 z-10 mb-6 grid gap-4 bg-bg pb-4 md:grid-cols-[minmax(0,420px)_1fr]">
        <div className="aspect-video bg-card"><div ref={host} className="size-full" /></div>
        <div className="flex flex-col gap-3">
          <p className="font-latin text-3xl tabular-nums">{fmt(now)}</p>
          <p className="min-h-12 text-sm text-fg/60">
            Próxima a marcar: <span className="text-fg">{lines[cursor]?.kana || "—"}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={`${btn} border-fg`} onClick={mark} disabled={cursor >= lines.length}>Marcar (Espaço)</button>
            <button className={btn} onClick={() => seek(time() - 2)}>−2s</button>
            <button className={btn} onClick={() => seek(time() + 2)}>+2s</button>
            <button className={btn} onClick={() => player.current?.playVideo()}>Tocar</button>
            <button className={btn} onClick={() => player.current?.pauseVideo()}>Pausar (K)</button>
          </div>
          <p className="text-xs text-fg/50">Toque a música e aperte Espaço no começo de cada linha. Clique na linha para pular o vídeo e na seta para recomeçar a marcação dali.</p>
        </div>
      </div>

      <ol className="border-t border-line">
        {lines.map((l, i) => (
          <li key={i} className={`grid grid-cols-[auto_5rem_1fr_auto] items-start gap-2 border-b border-line py-2 pl-2 ${i === active ? "bg-card" : ""} ${i === cursor ? "border-l-2 border-l-fg" : ""}`}>
            <button title="Marcar a partir daqui" onClick={() => setCursor(i)} className="w-6 cursor-pointer pt-1 text-xs text-fg/50 hover:text-fg">{i === cursor ? "▶" : i + 1}</button>
            <div className="flex flex-col gap-1">
              <input aria-label="Segundo" type="number" step="0.01" value={l.t} onChange={(e) => patch(i, { t: e.target.value })} className={input} />
              <button className="cursor-pointer text-xs text-fg/60 hover:text-fg" onClick={() => seek(Number(l.t))}>ir</button>
              <button className="cursor-pointer text-xs text-fg/60 hover:text-fg" onClick={() => patch(i, { t: time().toFixed(2) })}>agora</button>
            </div>
            <div className="grid gap-1">
              <input aria-label="Kana" value={l.kana} onChange={(e) => patch(i, { kana: e.target.value })} className={input} />
              <input aria-label="Romaji" placeholder="romaji" value={l.romaji} onChange={(e) => patch(i, { romaji: e.target.value })} className={`${input} italic`} />
              <input aria-label="Português" placeholder="português" value={l.pt} onChange={(e) => patch(i, { pt: e.target.value })} className={input} />
            </div>
            <div className="flex flex-col gap-1 pr-2">
              <button className="cursor-pointer text-xs text-fg/60 hover:text-fg" onClick={() => edit([...lines.slice(0, i + 1), { t: l.t === "" ? "" : (Number(l.t) + 0.01).toFixed(2), kana: "", romaji: "", pt: "" }, ...lines.slice(i + 1)])}>+ abaixo</button>
              <button className="cursor-pointer text-xs text-fg/60 hover:text-fg" onClick={() => edit(lines.filter((_, n) => n !== i))}>apagar</button>
            </div>
          </li>
        ))}
        {!lines.length && <li className="py-6 text-fg/50">Sem letra. Cole as linhas abaixo.</li>}
      </ol>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-fg/70">Colar linhas de texto</summary>
        <form className="mt-3 grid gap-2" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget.elements.namedItem("t") as HTMLTextAreaElement; paste(f.value); f.value = ""; }}>
          <textarea name="t" rows={6} placeholder="Uma linha de kana por linha" className={`${input} font-mono`} />
          <button className={`${btn} w-fit`}>Adicionar linhas</button>
        </form>
      </details>
    </section>
  );
}

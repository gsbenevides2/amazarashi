"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Album = { slug: string; title: string; romaji: string | null; nameEn: string | null; namePt: string | null; cover: string | null; date: string };
type Song = { slug: string; romaji: string; kana: string; nameEn: string; namePt: string; album: string | null; albumTitle: string; cover: string | null };
type Index = { albums: Album[]; songs: Song[] };

const LIMIT = 6;
// sem acento e sem caixa: "kyokaisen" acha "Kyōkaisen"
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const hit = (q: string, ...fields: (string | null)[]) => fields.some((f) => f && norm(f).includes(q));

function Thumb({ src }: { src: string | null }) {
  return <span className="relative block size-12 shrink-0 bg-card">{src && <Image src={src} alt="" fill sizes="48px" className="object-cover" />}</span>;
}

export default function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<Index | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [closing, setClosing] = useState(false);

  // Fecha só depois da animação de saída (sem ela, `animationend` nunca dispara)
  const close = () => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) onClose();
    else setClosing(true);
  };

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open || index) return;
    fetch("/api/search").then((r) => r.json()).then(setIndex).catch(() => setFailed(true));
  }, [open, index]);

  const n = norm(q.trim());
  const albums = index && n ? index.albums.filter((a) => hit(n, a.title, a.romaji, a.nameEn, a.namePt)) : [];
  const songs = index && n ? index.songs.filter((s) => hit(n, s.romaji, s.kana, s.nameEn, s.namePt)) : [];

  const group = (title: string, total: number, items: React.ReactNode[]) =>
    items.length > 0 && (
      <section aria-label={title}>
        <h2 className="mb-2 font-latin text-xs uppercase tracking-widest text-fg/50">{title} ({total})</h2>
        <ul>{items}</ul>
      </section>
    );
  const row = (href: string, cover: string | null, title: string, sub: string, i: number) => (
    <li key={href} className="search-item" style={{ "--d": `${i * 40}ms` } as React.CSSProperties}>
      <Link href={href} onClick={close} className="flex items-center gap-4 py-2 hover:bg-fg/5 focus-visible:bg-fg/5">
        <Thumb src={cover} />
        <span className="min-w-0">
          <span className="block truncate">{title}</span>
          <span className="block truncate font-latin text-sm text-fg/60">{sub}</span>
        </span>
      </Link>
    </li>
  );

  return (
    <dialog
      ref={dialog}
      aria-label="Buscar"
      data-closing={closing || undefined}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClose={onClose}
      onAnimationEnd={(e) => {
        if (!closing || e.target !== e.currentTarget) return;
        setClosing(false);
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && close()}
      className="search-dialog fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-black/85 p-0 text-fg backdrop:bg-transparent open:block"
    >
      <div className="search-panel mx-auto mt-[8vh] w-[calc(100%-3rem)] max-w-2xl bg-bg p-6 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-fg/30 pb-3">
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar álbuns e músicas"
            aria-label="Buscar álbuns e músicas"
            className="w-full bg-transparent text-xl outline-none placeholder:text-fg/40 [&::-webkit-search-cancel-button]:hidden"
          />
          <button type="button" onClick={close} aria-label="Fechar busca" className="cursor-pointer p-1 text-2xl leading-none text-fg/70 hover:text-fg">×</button>
        </div>
        <div className="mt-4 max-h-[60vh] space-y-6 overflow-y-auto">
          {failed && <p className="text-fg/60">Não foi possível carregar a busca.</p>}
          {!n && !failed && <p className="text-fg/50">Digite o nome em romaji, kana, inglês ou português.</p>}
          {n && index && !albums.length && !songs.length && <p className="text-fg/60">Nada encontrado para “{q.trim()}”.</p>}
          {group("Álbuns", albums.length, albums.slice(0, LIMIT).map((a, i) => row(`/album/${a.slug}`, a.cover, a.romaji ?? a.title, `${a.title} · ${a.date.slice(0, 4)}`, i)))}
          {group("Músicas", songs.length, songs.slice(0, LIMIT).map((s, i) => row(`/musica/${s.slug}`, s.cover, s.romaji, `${s.kana} · ${s.album ?? s.albumTitle}`, i)))}
        </div>
      </div>
    </dialog>
  );
}

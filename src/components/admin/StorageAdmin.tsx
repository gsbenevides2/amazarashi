"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Orphan = { key: string; size: number; modified: string; url: string };

const btn = "cursor-pointer border border-line px-4 py-2 text-sm hover:border-fg disabled:opacity-50";
const mb = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
// GIF/WEBM chegam a dezenas de MB: só imagens leves ganham miniatura.
const thumb = (k: string) => /\.(jpe?g|png|webp|avif)$/i.test(k);

async function call(init?: RequestInit) {
  const res = await fetch("/api/admin/storage", init);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Erro");
  return data;
}

export default function StorageAdmin() {
  const [rows, setRows] = useState<Orphan[] | null>(null); // null = carregando
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => call().then((r) => { setRows(r); setPicked(new Set()); }).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const toggle = (k: string) => setPicked((p) => { const n = new Set(p); if (!n.delete(k)) n.add(k); return n; });
  const selected = rows?.filter((r) => picked.has(r.key)) ?? [];
  const bytes = selected.reduce((a, r) => a + r.size, 0);

  const remove = async () => {
    if (!confirm(`Apagar ${selected.length} arquivo(s) do S3 (${mb(bytes)})? Não dá pra desfazer.`)) return;
    setBusy(true);
    setError("");
    try {
      await call({ method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keys: selected.map((r) => r.key) }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="font-latin text-2xl uppercase">Armazenamento</h1>
        <button className={btn} disabled={busy || !rows} onClick={() => { setRows(null); setError(""); load(); }}>Atualizar</button>
      </div>
      <p className="mb-6 text-sm text-fg/60">Arquivos do S3 que nenhum registro usa (uploads da última hora são ignorados). Nada vem marcado: confira antes de apagar.</p>
      {error && <p role="alert" className="mb-4 border border-red-500 p-3 text-sm text-red-400">{error}</p>}

      {rows && rows.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <button className={btn} onClick={() => setPicked(new Set(rows.map((r) => r.key)))}>Selecionar todos</button>
          <button className={btn} onClick={() => setPicked(new Set())}>Limpar</button>
          <span className="text-fg/60">{rows.length} órfãos · {mb(rows.reduce((a, r) => a + r.size, 0))}</span>
          <button className={`${btn} ml-auto`} disabled={busy || !selected.length} onClick={remove}>
            {busy ? "Apagando…" : `Apagar selecionados (${selected.length} · ${mb(bytes)})`}
          </button>
        </div>
      )}

      <ul className="border-t border-line">
        {rows?.map((r) => (
          <li key={r.key} className="flex items-center gap-4 border-b border-line py-3">
            <input type="checkbox" aria-label={r.key} checked={picked.has(r.key)} onChange={() => toggle(r.key)} className="size-4" />
            {thumb(r.key) ? <Image src={r.url} alt="" width={48} height={48} unoptimized className="size-12 object-cover" /> : <span className="size-12 bg-card" />}
            <a href={r.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm underline">{r.key}</a>
            <span className="hidden text-xs text-fg/50 sm:block">{new Date(r.modified).toLocaleDateString("pt-BR")}</span>
            <span className="w-20 text-right text-sm text-fg/70">{mb(r.size)}</span>
          </li>
        ))}
        {rows && !rows.length && <li className="py-6 text-fg/50">Nenhum arquivo órfão.</li>}
        {!rows && !error && <li role="status" className="py-6 text-fg/50">Procurando órfãos… (lê o bucket inteiro, pode demorar)</li>}
      </ul>
    </section>
  );
}

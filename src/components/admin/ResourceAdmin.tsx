"use client";

import { useEffect, useState } from "react";
import { specs, type Field } from "./specs";
import Image from "next/image";
import Link from "next/link";

type Row = Record<string, unknown> & { id: number };

const input = "w-full border border-line bg-card px-3 py-2 text-sm";
const btn = "cursor-pointer border border-line px-4 py-2 text-sm hover:border-fg disabled:opacity-50";

async function call(url: string, init?: RequestInit) {
  const res = await fetch(`/api/admin/${url}`, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? "Erro");
  return data;
}

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function ResourceAdmin({ resource }: { resource: string }) {
  const spec = specs[resource];
  const [rows, setRows] = useState<Row[] | null>(null); // null = carregando
  const [refs, setRefs] = useState<Record<string, Row[]>>({});
  const [form, setForm] = useState<Record<string, unknown> | null>(null); // id presente = edição
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => setRows(await call(resource));

  // setState só dentro dos callbacks das requisições, nunca no corpo do efeito.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia a lista ao trocar de recurso
    setRows(null);
    call(resource).then(setRows).catch((e) => setError(e.message));
    for (const f of spec.fields) if (f.ref) call(f.ref).then((r) => setRefs((p) => ({ ...p, [f.ref!]: r })));
  }, [resource, spec]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const edit = (id: number) => run(async () => setForm(await call(`${resource}/${id}`)));
  const remove = (r: Row) =>
    confirm(`Apagar "${r[spec.titleField]}"?`) && run(async () => { await call(`${resource}/${r.id}`, { method: "DELETE" }); await refresh(); });
  const save = () =>
    run(async () => {
      const id = form!.id;
      await call(id ? `${resource}/${id}` : resource, json(id ? "PUT" : "POST", form));
      setForm(null);
      await refresh();
    });
  const upload = (name: string, file: File) =>
    run(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await call("upload", { method: "POST", body: fd });
      setForm((p) => ({ ...p!, [name]: url }));
    });

  const set = (name: string, v: unknown) => setForm((p) => ({ ...p!, [name]: v }));

  const control = (f: Field) => {
    const v = form![f.name] ?? "";
    const id = `f-${f.name}`;
    switch (f.type) {
      case "textarea":
        return <textarea id={id} rows={f.virtual ? 10 : 4} value={String(v)} onChange={(e) => set(f.name, e.target.value)} className={`${input} font-mono`} />;
      case "select":
        return (
          <select id={id} value={String(v)} onChange={(e) => set(f.name, e.target.value)} className={input}>
            <option value="" />
            {f.options!.map((o) => <option key={o}>{o}</option>)}
          </select>
        );
      case "ref":
        return (
          <select id={id} value={String(v)} onChange={(e) => set(f.name, e.target.value)} className={input}>
            <option value="" />
            {(refs[f.ref!] ?? []).map((r) => <option key={r.id} value={r.id}>{String(r[specs[f.ref!].titleField])}</option>)}
          </select>
        );
      case "image":
        return (
          <div className="flex items-center gap-4">
            {v ? <Image src={String(v)} alt="" width={80} height={80} unoptimized className="size-20 object-cover" /> : null}
            <input id={id} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(f.name, e.target.files[0])} className="text-sm" />
            {v ? <button type="button" onClick={() => set(f.name, "")} className="text-sm underline">remover</button> : null}
          </div>
        );
      default:
        return <input id={id} type={f.type === "number" ? "number" : "text"} step="any" value={String(v)} onChange={(e) => set(f.name, e.target.value)} className={input} />;
    }
  };

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-latin text-2xl uppercase">{spec.label}</h1>
        {!form && <button className={btn} onClick={() => setForm({})}>Novo</button>}
      </div>
      {error && <p role="alert" className="mb-4 border border-red-500 p-3 text-sm text-red-400">{error}</p>}

      {form ? (
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-4">
          {resource === "songs" && form.id ? <Link href={`/admin/songs/${form.id}/letra`} className="w-fit text-sm underline">Abrir editor de letra sincronizada →</Link> : null}
          {spec.fields.map((f) => (
            <div key={f.name}>
              <label htmlFor={`f-${f.name}`} className="mb-1 block text-sm text-fg/70">{f.label}{f.required && " *"}</label>
              {control(f)}
              {f.help && <p className="mt-1 text-xs text-fg/50">{f.help}</p>}
            </div>
          ))}
          <div className="flex gap-3">
            <button type="submit" disabled={busy} className={btn}>{busy ? "Salvando…" : "Salvar"}</button>
            <button type="button" onClick={() => { setForm(null); setError(""); }} className={btn}>Cancelar</button>
          </div>
        </form>
      ) : (
        <ul className="border-t border-line">
          {rows?.map((r) => (
            <li key={r.id} className="flex items-center gap-4 border-b border-line py-3">
              <span className="w-10 text-sm text-fg/50">{r.id}</span>
              <span className="flex-1">{String(r[spec.titleField])}</span>
              {resource === "songs" && <Link href={`/admin/songs/${r.id}/letra`} className={btn}>Letra</Link>}
              <button className={btn} disabled={busy} onClick={() => edit(r.id)}>Editar</button>
              <button className={btn} disabled={busy} onClick={() => remove(r)}>Apagar</button>
            </li>
          ))}
          {rows && !rows.length && <li className="py-6 text-fg/50">Nada cadastrado.</li>}
          {!rows && !error && <li role="status" className="py-6 text-fg/50">Carregando…</li>}
        </ul>
      )}
    </section>
  );
}

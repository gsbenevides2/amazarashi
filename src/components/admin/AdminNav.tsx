"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { specs } from "./specs";

// Recursos agrupados por assunto (ordem de aparição em specs.ts); o atual fica destacado.
const groups = Object.entries(specs).reduce<Record<string, [string, string][]>>((acc, [key, s]) => {
  (acc[s.group] ??= []).push([key, s.label]);
  return acc;
}, {});

export default function AdminNav() {
  const path = usePathname();
  const [leaving, setLeaving] = useState(false);
  return (
    <nav aria-label="Admin" className="flex flex-col gap-6 text-sm md:sticky md:top-8 md:self-start">
      <Link href="/" className="text-fg/60 hover:text-fg">← Ver site</Link>
      {/* <a>, não <Link>: o prefetch dispararia o logout. */}
      <a href="/oauth/logout" onClick={() => setLeaving(true)} aria-disabled={leaving} className={`text-fg/60 hover:text-fg ${leaving ? "pointer-events-none opacity-50" : ""}`}>
        {leaving ? "Saindo…" : "Sair"}
      </a>
      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          <p className="mb-2 font-latin text-xs uppercase tracking-widest text-fg/40">{group}</p>
          <ul className="space-y-1">
            {items.map(([key, label]) => {
              const active = path === `/admin/${key}`;
              return (
                <li key={key}>
                  <Link href={`/admin/${key}`} aria-current={active ? "page" : undefined} className={`block border-l-2 py-1 pl-3 ${active ? "border-fg font-bold" : "border-line text-fg/70 hover:border-fg/50 hover:text-fg"}`}>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clientConfig } from "../lib/clientConfig";
import { track } from "../lib/track";

// Versão do aviso: mude quando o texto mudar para reaparecer para quem já dispensou.
const VERSION = "2026-11";
const KEY = "amz_telemetry_notice";

export default function TelemetryNotice() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Sem RUM nem GA configurados não há telemetria para avisar.
    const cfg = clientConfig();
    if (!cfg.rum && !cfg.ga) return;
    try {
      if (localStorage.getItem(KEY) === VERSION) return;
    } catch {}
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => setShown(true));
    track("telemetry_notice", { action: "view" });
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  useEffect(() => {
    if (!dismissed) return;
    const timer = setTimeout(() => setVisible(false), 250);
    return () => clearTimeout(timer);
  }, [dismissed]);

  if (!visible || pathname === "/telemetria") return null;

  const close = () => {
    try {
      localStorage.setItem(KEY, VERSION);
    } catch {}
    track("telemetry_notice", { action: "dismiss" });
    setShown(false);
    setDismissed(true);
  };

  return (
    <aside
      aria-label="Aviso de telemetria"
      className={`fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-80 border border-line bg-bg/95 p-4 text-sm shadow-2xl backdrop-blur transition-[opacity,transform] duration-300 ease-out-cubic ${
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={close}
        aria-label="Dispensar aviso de telemetria"
        className="-mr-1 -mt-1 float-right cursor-pointer p-1 text-lg leading-none text-fg/50 hover:text-fg"
      >
        ×
      </button>
      <p className="pr-4 font-latin text-xs font-bold uppercase tracking-widest text-fg/50">Telemetria</p>
      <p className="mt-2 leading-snug text-fg/85">
        Este site coleta dados de navegação, incluindo gravação de sessão, para entender o uso e corrigir erros.
      </p>
      <div className="mt-3 flex items-center gap-4">
        <Link
          href="/telemetria"
          onClick={() => {
            track("telemetry_notice", { action: "learn_more" });
            setShown(false);
            setDismissed(true);
          }}
          className="font-latin text-xs font-bold uppercase underline underline-offset-4 hover:opacity-70"
        >
          Saber mais
        </Link>
        <button type="button" onClick={close} className="cursor-pointer font-latin text-xs uppercase text-fg/60 hover:text-fg">
          Entendi
        </button>
      </div>
    </aside>
  );
}

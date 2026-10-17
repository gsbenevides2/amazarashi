"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { socialIcons, underline } from "../links";
import Image from "next/image";
import SearchDialog from "./SearchDialog";

type Menu = { label: string; href: string }[];
type Socials = { network: keyof typeof socialIcons; label: string; href: string }[];

// Medido em amazarashi.com: barra 2px, bottom 4px, cresce do centro (origin padrão), 0.4s cubic-bezier(.2,.37,.29,1.01)
const menuLink = `block py-2.5 after:bottom-1 ${underline}`;
// Limiar medido no site: body ganha `is-scrolled` a partir de 400px de scroll.
const SCROLL_THRESHOLD = 400;
// Site: 20 faixas verticais brancas (10,05% de largura) com scaleY 0->1, 0,8s cubic-bezier(.87,0,.13,1),
// atraso 0,06s por faixa, origem embaixo ao fechar / em cima ao abrir. Aqui 10 faixas (cobrem a largura).
const STRIPS = Array.from({ length: 10 }, (_, i) => i);
const bar = "absolute right-0 block h-0.5 w-10 bg-white transition-[width] ease-[cubic-bezier(0.165,0.84,0.44,1)]";
const closeBar = "absolute left-0 top-1.75 block h-0.5 bg-black ease-[cubic-bezier(0.165,0.84,0.44,1)]";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="block size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
  );
}

function SocialList({ socials, className, iconClass }: { socials: Socials; className: string; iconClass: string }) {
  return (
    <ul className={className}>
      {socials.map((s) => (
        <li key={s.href}>
          <a href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="-m-2 block p-2 hover:opacity-70">
            <svg viewBox={socialIcons[s.network].viewBox} className={iconClass} fill="currentColor" aria-hidden="true">
              <path d={socialIcons[s.network].d} transform={socialIcons[s.network].transform} />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function HeaderView({ menu, socials }: { menu: Menu; socials: Socials }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY >= SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      panel.current?.focus({ preventScroll: true });
      wasOpen.current = true;
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
      document.addEventListener("keydown", onKey);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", onKey);
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      button.current?.focus({ preventScroll: true });
    }
  }, [open]);

  // "/" ou Ctrl/Cmd+K abrem a busca, exceto dentro de campos de texto
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return;
      if (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setSearching(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const showBurger = scrolled || open;
  const close = () => setOpen(false);

  return (
    <header data-site-header className="header-in fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-x-6 px-6 py-5 max-[900px]:h-18 max-[900px]:py-0 md:px-10">
      <Link href="/" aria-label="Amazarashi BR" className="header-logo shrink-0">
        <Image src="/logo.svg" alt="Amazarashi BR" width={120} height={35} loading="eager" className="h-auto" />
      </Link>

      {/* Header normal: só no desktop; sai ao rolar (site: opacity .2s + translateY(-30px) 1.5s cubic-bezier(.19,1,.22,1)) */}
      <div
        inert={scrolled || open}
        aria-hidden={scrolled || open}
        className={`header-nav flex items-center gap-x-10 transition-[opacity,translate,visibility] max-[900px]:hidden motion-reduce:transition-none ${
          scrolled
            ? "invisible -translate-y-7.5 opacity-0 duration-1500 ease-[cubic-bezier(0.19,1,0.22,1)]"
            : "duration-1800 ease-[cubic-bezier(0.19,1,0.22,1)]"
        }`}
      >
        <nav aria-label="Principal">
          <ul className="flex gap-6 font-latin text-sm font-bold lowercase">
            {menu.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className={menuLink}>
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <SocialList socials={socials} className="flex gap-4 text-xs" iconClass="h-4.25 w-auto" />
        <button type="button" onClick={() => setSearching(true)} data-ga="search_open" aria-label="Buscar" className="-m-2 cursor-pointer p-2 hover:opacity-70">
          <SearchIcon />
        </button>
      </div>

      {/* Painel: fundo branco, texto preto (site: 20 faixas brancas crescendo em scaleY, escalonadas) */}
      <nav
        ref={panel}
        id="site-nav"
        aria-label="Principal"
        tabIndex={-1}
        inert={!open}
        aria-hidden={!open}
        className={`fixed inset-0 z-10 overflow-y-auto text-black outline-none ${
          open
            ? "visible opacity-100 transition-opacity duration-500"
            : "invisible opacity-0 transition-[opacity,visibility] delay-1000 duration-500 motion-reduce:delay-200 motion-reduce:duration-200"
        }`}
      >
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          {STRIPS.map((i) => (
            <div
              key={i}
              style={{ left: `${i * 10}%`, transitionDelay: `${i * 0.06}s` }}
              className={`absolute top-0 h-full w-[10.05%] bg-white transition-transform duration-800 ease-[cubic-bezier(0.87,0,0.13,1)] motion-reduce:transition-none ${
                open ? "origin-top scale-y-100" : "origin-bottom scale-y-0"
              }`}
            />
          ))}
        </div>
        <div className="relative flex min-h-full items-center px-6 py-12.5 md:py-20">
          <div
            className={`mx-auto flex w-full max-w-330 flex-col gap-10 transition-opacity md:w-[78.5%] md:flex-row md:justify-between ${
              open ? "opacity-100 delay-400 duration-300" : "opacity-0 duration-300"
            }`}
          >
            <Link href="/" onClick={close} aria-label="Amazarashi BR" className="block md:mt-2 md:w-[22.7%] md:max-w-62.5">
              <Image src="/logo.svg" alt="" width={240} height={70} className="h-auto w-full max-w-60 invert" />
            </Link>
            <ul className="font-latin font-bold lowercase leading-[1.2] text-[clamp(18px,6.133vw,30px)] md:w-[30%] md:text-[clamp(32px,2.857vw,48px)]">
              {menu.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} onClick={close} className={`${menuLink} md:py-0.5 md:after:bottom-0`}>
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
            <SocialList socials={socials} className="flex items-start gap-8 md:w-[26%]" iconClass="h-6.5 w-auto" />
          </div>
        </div>
      </nav>

      {/* Busca ao lado do hambúrguer (rolado ou mobile); no topo do desktop ela fica na barra de links */}
      <button
        type="button"
        onClick={() => setSearching(true)}
        data-ga="search_open" aria-label="Buscar"
        inert={open}
        className={`fixed right-20 top-4.5 z-20 cursor-pointer p-2 transition-[opacity,translate,visibility] ease-[cubic-bezier(0.19,1,0.22,1)] hover:opacity-70 motion-reduce:transition-none max-[900px]:md:right-24 min-[901px]:right-24 min-[901px]:top-6.75 ${
          open
            ? "invisible opacity-0 duration-300"
            : scrolled
              ? "visible translate-y-0 opacity-100 duration-1500"
              : "min-[901px]:invisible min-[901px]:translate-y-7.5 min-[901px]:opacity-0 min-[901px]:duration-1800"
        }`}
      >
        <SearchIcon />
      </button>

      {/* Hambúrguer: desktop só aparece rolado (translateY(30px)->0, opacity); mobile sempre. 3 barras 40x2, vira X ±30deg preto */}
      <button
        ref={button}
        type="button"
        data-ga="menu_toggle" aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((o) => !o)}
        className={`fixed right-6 top-4.5 z-20 h-9 before:absolute before:-inset-2 before:content-[''] w-11.25 cursor-pointer py-2.5 transition-[opacity,translate,visibility] ease-[cubic-bezier(0.19,1,0.22,1)] motion-reduce:transition-none max-[900px]:md:right-10 min-[901px]:right-8.75 min-[901px]:top-6.75 ${
          showBurger ? "visible translate-y-0 opacity-100 duration-1500" : "min-[901px]:invisible min-[901px]:translate-y-7.5 min-[901px]:opacity-0 min-[901px]:duration-1800"
        }`}
      >
        <span className="relative block h-full">
          {[0, 7, 14].map((top, i) => (
            <span
              key={top}
              style={{ top, transitionDelay: open ? `${i * 0.05}s` : `${0.3 + i * 0.05}s` }}
              className={`${bar} motion-reduce:transition-none ${open ? "w-0 duration-400" : "duration-600"}`}
            />
          ))}
        </span>
        <span className="absolute inset-0 block py-3">
          <span className="relative block h-full">
            {[45, -45].map((deg, i) => (
              <span
                key={deg}
                style={{
                  transform: open ? `rotate(${deg}deg)` : undefined,
                  transitionDelay: open ? "0.15s, 0.55s" : "0.25s, 0s",
                  transitionProperty: "width, transform",
                  width: open ? 40 : 0,
                  transitionDuration: open ? "0.4s" : "0.3s",
                  zIndex: i,
                }}
                className={`${closeBar} motion-reduce:transition-none`}
              />
            ))}
          </span>
        </span>
      </button>
      <SearchDialog open={searching} onClose={() => setSearching(false)} />
    </header>
  );
}

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { getChrome } from "../../lib/api";
import { outlineButton } from "../links";

// Os textos entram em sequência quando a imagem termina de abrir (hero-art dura 1.6s).
export default async function Hero() {
  const { settings } = await getChrome();
  return (
    <section
      aria-label="Destaque"
      className="relative flex h-[75vh] min-h-120 md:h-[85vh] md:min-h-140 items-end overflow-hidden p-6 pb-[calc(9vh+1.5rem)] md:p-16 md:pb-[calc(9vh+4rem)]"
    >
      <div aria-hidden className="hero-art absolute inset-0 bg-linear-to-b from-[#7f1d1d] to-[#dc2626]">
        {settings.hero_image && <Image fetchPriority="high" src={settings.hero_image} alt={`Arte de destaque: ${settings.hero_title ?? "Amazarashi"}`} fill priority sizes="100vw" className="object-cover" />}
      </div>
      <div className="relative">
        <h1 style={{ "--d": "1600ms" } as CSSProperties} className="hero-in font-latin text-4xl font-bold md:text-7xl">{settings.hero_title ?? "Amazarashi"}</h1>
        <p style={{ "--d": "1700ms" } as CSSProperties} className="hero-in mt-2 text-lg md:text-xl">{settings.hero_subtitle ?? "Sua FanPage brasileira"}</p>
        <Link href={settings.hero_cta_href ?? "/albuns-e-discos"} style={{ "--d": "1800ms" } as CSSProperties} className={`hero-in mt-6 ${outlineButton}`}>
          {settings.hero_cta ?? "VER ÁLBUNS"}
        </Link>
      </div>
    </section>
  );
}

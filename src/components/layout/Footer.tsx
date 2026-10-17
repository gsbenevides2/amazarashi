import { getChrome } from "../../lib/api";
import { underline } from "../links";
import Image from "next/image";

const link = `inline-block pb-1 after:bottom-0 ${underline}`;

export default async function Footer() {
  const { menu, socials, settings } = await getChrome();
  return (
    <footer className="mt-16 grid gap-8 px-6 pb-12 pt-10 md:mt-34.75 md:gap-12 md:pb-24 md:pt-22.5 md:grid-cols-[1fr_1fr_1fr_auto] md:px-18.5">
      <div className="flex w-fit flex-col items-center gap-2">
        <Image src="/logo-footer.svg" alt="Amazarashi BR" width={214} height={107} className="w-30 h-auto md:w-53.5" />
        <p className="font-latin text-sm">{settings.footer_tagline ?? "FANPAGE NÃO OFICIAL"}</p>
      </div>
      <ul className="space-y-2 font-latin text-lg font-bold lowercase md:text-xl">
        {menu.map((i) => (
          <li key={i.href}>
            <a href={i.href} className={link}>{i.label}</a>
          </li>
        ))}
      </ul>
      <div>
        <p className="mb-3 font-latin text-sm">REDES SOCIAIS</p>
        <ul className="space-y-1 text-sm">
          {socials.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noreferrer" className={link}>{s.label}</a>
            </li>
          ))}
        </ul>
      </div>
      <a
        href="#"
        aria-label="Voltar ao topo"
        className="group relative block size-26.25 self-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg md:justify-self-end min-[901px]:size-38.75"
      >
        <svg
          aria-hidden
          viewBox="0 0 310 310"
          className="absolute inset-0 size-full transition-transform duration-700 ease-out-cubic motion-safe:animate-[spin_9s_linear_infinite_reverse] min-[901px]:group-hover:scale-90"
        >
          <defs>
            {/* círculo horizontal: 0% = esquerda, 25% = topo, 50% = direita, 75% = base */}
            <path id="page-top-ring" d="M 37,155 a 118,118 0 1,1 236,0 a 118,118 0 1,1 -236,0" />
          </defs>
          <text className="fill-fg text-[34px] tracking-[0.12em]" style={{ fontFamily: "var(--font-montserrat)" }} textAnchor="middle">
            <textPath href="#page-top-ring" startOffset="25%">IR AO TOPO</textPath>
            <textPath href="#page-top-ring" startOffset="75%">IR AO TOPO</textPath>
          </text>
        </svg>
        <svg
          aria-hidden
          viewBox="0 0 73 50"
          className="absolute left-1/2 top-1/2 w-6.25 -translate-x-1/2 -translate-y-1/2 rotate-180 overflow-visible fill-fg min-[901px]:top-[48%] min-[901px]:w-9"
        >
          <polygon
            points="36.5 50 0 1.4 1.9 0 36.5 46.1 71.1 0 73 1.4 36.5 50"
            className="transition-transform duration-700 ease-out-cubic min-[901px]:group-hover:translate-y-1.5"
          />
          <path
            d="M36.5,21.3A10.7,10.7,0,1,1,47.2,10.7,10.7,10.7,0,0,1,36.5,21.3Zm0-18.9a8.3,8.3,0,1,0,8.3,8.3A8.3,8.3,0,0,0,36.5,2.4Z"
            className="transition-transform duration-700 ease-out-cubic min-[901px]:group-hover:-translate-y-1.5"
          />
        </svg>
      </a>
      <p className="text-xs text-line md:text-[11px] md:col-span-4">
        Fã-site não oficial. Imagens e marcas pertencem aos seus respectivos detentores.
      </p>
    </footer>
  );
}

// Imagem real: coloque o arquivo em public/ e passe image={{ src: "/nome.jpg", alt: "..." }}.
// ponytail: image.mobileSrc é aceito mas ignorado (next/image não usa <picture>); upgrade via getImageProps se precisar.
import Image from "next/image";
import ArrowIcon from "../ArrowIcon";
import { outlineButton } from "../links";

type Pos = "left" | "center" | "right";

export type InfoCardProps = {
  headline: string;
  subhead?: string;
  bodyText?: string;
  image?: { src: string; alt: string; mobileSrc?: string; href?: string };
  isFullModeStyle?: boolean;
  textPosition?: "left" | "center" | "right";
  textAlignment?: "left" | "center" | "right";
  callToAction?: { mode?: "button" | "link"; text: string; href: string; target?: "_self" | "_blank" };
};

// Texto sobe (translateY + opacity) quando o ancestral <Reveal> vira data-reveal="in"; escalonado por delay.
const up = "transition duration-[600ms] ease-out-cubic in-data-[reveal=pending]:translate-y-6 in-data-[reveal=pending]:opacity-0";
const d = (ms: number) => ({ transitionDelay: `${ms}ms` });

const align = { left: "text-left", center: "text-center", right: "text-right" } satisfies Record<Pos, string>;
const justify = { left: "justify-start", center: "justify-center", right: "justify-end" } satisfies Record<Pos, string>;

export default function InfoCard({
  headline,
  subhead,
  bodyText,
  image,
  isFullModeStyle = false,
  textPosition = "left",
  textAlignment = "left",
  callToAction: cta,
}: InfoCardProps) {
  const sizes = isFullModeStyle ? "(min-width: 1248px) 1200px, 100vw" : "(min-width: 1248px) 600px, (min-width: 768px) 50vw, 100vw";

  const picture = image ? (
    image.href ? (
      <a href={image.href} className="absolute inset-0">
        <Image src={image.src} alt={image.alt} fill sizes={sizes} className="object-cover" />
      </a>
    ) : (
      <Image src={image.src} alt={image.alt} fill sizes={sizes} className="object-cover" />
    )
  ) : (
    <div aria-hidden className="absolute inset-0 bg-linear-to-br from-card to-bg" />
  );

  const textAlign = isFullModeStyle ? align[textPosition] : align[textAlignment];

  const text = (
    <div className={textAlign}>
      <h3 style={d(0)} className={`${up} font-latin text-[26px] font-bold leading-tight md:text-[47.5px]`}>{headline}</h3>
      {subhead && <p style={d(100)} className={`${up} mt-3 text-[17px] md:text-2xl`}>{subhead}</p>}
      {bodyText && <p style={d(200)} className={`${up} mt-4 text-[15px] text-fg/80 md:text-[17px]`}>{bodyText}</p>}
      {cta && (
        <div style={d(300)} className={up}>
        <a
          href={cta.href}
          target={cta.target}
          rel={cta.target === "_blank" ? "noopener noreferrer" : undefined}
          className={
            cta.mode === "link"
              ? "group/a font-latin -mb-3 mt-3 inline-flex py-3 items-center text-sm font-normal uppercase tracking-widest"
              : `mt-6 ${outlineButton}`
          }
        >
          {cta.text}
          {cta.mode === "link" && <ArrowIcon direction="next" className="ml-3" />}
        </a>
        </div>
      )}
    </div>
  );

  if (isFullModeStyle) {
    return (
      <article className="relative min-h-90 overflow-hidden md:min-h-120">
        {picture}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-bg/90 via-bg/50 to-bg/20" />
        <div className={`pointer-events-none relative flex min-h-90 items-center px-6 py-10 md:min-h-120 md:py-12 md:px-16 ${justify[textPosition]}`}>
          <div className="pointer-events-auto max-w-140">{text}</div>
        </div>
      </article>
    );
  }

  // Split: mobile empilha (imagem em cima); desktop texto/imagem conforme textPosition.
  const textRight = textPosition === "right";
  return (
    <article className="grid md:min-h-120 md:grid-cols-2">
      <div className={`relative aspect-4/3 md:aspect-auto ${textRight ? "md:order-1" : "md:order-2"}`}>{picture}</div>
      <div className={`flex items-center px-6 py-8 md:px-12 md:py-10 ${textRight ? "md:order-2" : "md:order-1"}`}>
        <div className="w-full">{text}</div>
      </div>
    </article>
  );
}

// Imagem real: coloque o arquivo em public/ e passe image={{ src: "/nome.jpg", alt: "..." }}.
import Image from "next/image";

export type CardListItemProps = { title: string; description: string; href?: string; image?: { src: string; alt: string } };

// Texto sobe quando o <Reveal> ancestral vira "in"; --i (definido por CardList) escalona por item.
const up = "transition duration-[700ms] ease-out-cubic in-data-[reveal=pending]:translate-y-6 in-data-[reveal=pending]:opacity-0";

export default function CardListItem({ title, description, href, image }: CardListItemProps) {
  const card = (
    <article className="group">
      <div className="relative aspect-4/3 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-card to-bg transition-transform duration-700 ease-out-cubic motion-safe:group-hover:scale-105">
          {image && <Image src={image.src} alt={image.alt} fill sizes="(min-width: 768px) 384px, 100vw" className="object-cover" />}
        </div>
      </div>
      <h3 style={{ transitionDelay: "calc(var(--i,0)*80ms)" }} className={`${up} font-latin relative mt-4 w-fit pb-1 text-[17px] md:text-lg after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:scale-x-0 after:bg-current after:content-[''] motion-safe:after:transition-transform motion-safe:after:duration-400 motion-safe:after:ease-[cubic-bezier(0.2,0.37,0.29,1.01)] group-hover:after:scale-x-100`}>{title}</h3>
      <div style={{ transitionDelay: "calc(var(--i,0)*80ms + 100ms)" }} className={`${up} mt-2`}>
        <p className="text-[15px] md:text-sm text-fg/70 transition-colors duration-700 group-hover:text-fg">{description}</p>
      </div>
    </article>
  );
  return href ? <a href={href} className="block">{card}</a> : card;
}

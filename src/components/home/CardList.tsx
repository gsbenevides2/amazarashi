import type { CSSProperties } from "react";
import Reveal from "../Reveal";
import SectionTitle from "./SectionTitle";
import CardListSlider from "./CardListSlider";
import CardListItem, { type CardListItemProps } from "./CardListItem";

type Props = { id: string; title: string; items: CardListItemProps[]; variant?: "grid" | "slider" };

export default function CardList({ id, title, items, variant = "grid" }: Props) {
  const heading = (
    <SectionTitle id={`${id}-title`} className={variant === "slider" ? "pl-6 xl:pl-0" : "mb-6 px-6 md:mb-10 xl:px-0"}>
      {title}
    </SectionTitle>
  );

  return (
    <Reveal as="section" id={id} aria-labelledby={`${id}-title`} className="mt-10 overflow-x-clip pt-4 md:mt-16 md:pt-6">
      <div className="relative mx-auto max-w-300">
        {variant === "slider" ? null : heading}
        {variant === "slider" ? (
          <CardListSlider heading={heading}>
            {items.map((c, i) => (
              <div key={c.title} style={{ "--i": i } as CSSProperties} className="w-96 max-w-[85vw] shrink-0 snap-start">
                <CardListItem {...c} />
              </div>
            ))}
          </CardListSlider>
        ) : (
          <div className="grid grid-cols-1 gap-10 px-6 md:grid-cols-3 xl:px-0">
            {items.map((c, i) => (
              <div key={c.title} style={{ "--i": i } as CSSProperties}>
                <CardListItem {...c} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}

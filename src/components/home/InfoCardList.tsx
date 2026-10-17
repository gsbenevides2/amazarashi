import Reveal from "../Reveal";
import InfoCard, { type InfoCardProps } from "./InfoCard";

export default function InfoCardList({ items }: { items: InfoCardProps[] }) {
  return (
    <section aria-labelledby="novidades-title" className="mx-auto mt-16 md:mt-34.75 max-w-300 space-y-6 md:space-y-10 px-6 xl:px-0 [&>h2+*]:mt-0">
      <h2 id="novidades-title" className="sr-only">Novidades</h2>
      {items.map((item, i) => (
        <Reveal key={item.headline} delay={i * 100}>
          <InfoCard {...item} />
        </Reveal>
      ))}
    </section>
  );
}

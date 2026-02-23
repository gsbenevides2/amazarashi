import Image from "next/image";
import { HeroCTA } from "./CTA";

export interface HeroProps {
  title: string;
  description: string;
  backgroundImage: {
    source: string;
    alt: string;
  };

  coverImage: {
    source: string;
    alt: string;
  };
  cta: {
    label: string;
  };
}

export default function Hero({
  title,
  cta,
  backgroundImage,
  coverImage,
  description,
}: HeroProps) {
  return (
    <article className="z-10 relative lg:pb-[10dvh] h-full bottomAnimatedGradient">
      <div className="z-10 relative flex lg:flex-row flex-col-reverse justify-center items-center lg:items-end gap-8 lg:gap-10 p-6 lg:p-20 xl:p-36 lg:h-[90dvh] overflow-hidden">
        <div className="lg:text-left text-center bottomAnimationFadIn">
          <h1 className="mb-3">{title}</h1>
          <p className="whitespace-break-spaces">{description}</p>
          <HeroCTA cta={cta} />
        </div>
        <Image
          className="max-w-[40vw] lg:max-w-[25vw]"
          preload
          width={600}
          height={600}
          src={coverImage.source}
          alt={coverImage.alt}
          fetchPriority="high"
        />
      </div>
      <Image
        preload
        className="top-0 left-0 z-0 absolute w-full lg:h-[90dvh] object-cover"
        width={1200}
        height={675}
        src={backgroundImage.source}
        alt={backgroundImage.alt}
        fetchPriority="high"
      />
    </article>
  );
}

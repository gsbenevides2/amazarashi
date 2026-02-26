import Image from "next/image";
import Link from "next/link";

export interface CoverItemProps {
  cover: {
    source: string;
    alt: string;
  };
  title?: string;
  url?: string;
}

function Wrapper({
  children,
  url,
}: { children: React.ReactNode } & { url?: string }) {
  if (!url) {
    return <>{children}</>;
  }
  return <Link href={url}>{children}</Link>;
}

/** @title Cover Item */
export default function CoverItem(props: CoverItemProps) {
  return (
    <li className="group w-[calc(100vw_-_48px_-_24px)] md:w-[calc((100vw_-_48px_-_24px)/2)] lg:w-3/12 xl:w-2/12 carousel-item">
      <Wrapper url={props.url}>
        <div className="overflow-hidden">
          <Image
            src={props.cover.source}
            alt={props.cover.alt}
            width={600}
            height={600}
            className="group-hover:scale-110 transition-all"
          />
        </div>
        <h3 className="mt-5 lg:text-[26px] whitespace-break-spaces">
          {props.title}
        </h3>
      </Wrapper>
    </li>
  );
}

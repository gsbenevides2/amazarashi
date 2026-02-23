import Image from "next/image";

interface LatestReleaseProps {
  image: string;
  title: string;
  description: string;
  ctaLink: string;
}

export default function LatestRelease({
  image,
  title,
  description,
  ctaLink,
}: LatestReleaseProps) {
  return (
    <div className="px-6 lg:px-20 xl:px-36">
      <h2 className="mb-6">Ultimo Lançamento</h2>
      <div className="flex lg:flex-row flex-col gap-6">
        <a className="w-full lg:max-w-[30%]" href={ctaLink}>
          <Image className="w-full" src={image} alt={title} width={500} height={500} />
        </a>
        <div className="flex flex-col w-full lg:max-w-[70%]">
          <h3 className="mb-3">{title}</h3>
          <p className="mb-6">{description}</p>
          <a
            className="self-center lg:self-start mt-6 cursor-pointer animated"
            href={ctaLink}
          >
            Saiba Mais
          </a>
        </div>
      </div>
    </div>
  );
}
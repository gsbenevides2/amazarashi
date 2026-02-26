import Image from "next/image";
import BackButton from "../ui/BackButton";
import Icon from "../ui/Icon";

export interface AlbumInfoData {
  title: string;
  romanji: string;
  hiragana: string;
  english: string;
  portuguese: string;
  /** @format date */
  releaseDate: string;
  cover: {
    url: string;
    alt: string;
  };
}

export interface AlbumInfoProps {
  data: AlbumInfoData;
}

/** @title Album Info */
export default function AlbumInfo(props: AlbumInfoProps) {
  const {
    data: { title, romanji, hiragana, english, portuguese, releaseDate, cover },
  } = props;

  const formattedReleaseDate = releaseDate.split("-").reverse().join("/");
  return (
    <div className="flex flex-col px-6 lg:px-20 xl:px-36 text-center lg:text-start">
      <BackButton className="gap-2 my-5 py-1 w-fit text-white cursor-pointer flex! animated">
        <Icon id="ArrowBack" size={24} strokeWidth={2} />
        <span>Voltar</span>
      </BackButton>
      <div className="flex lg:flex-row flex-col-reverse justify-between items-center lg:items-end gap-3 bottomAnimationFadIn">
        <div>
          <h1>Informações do Album:</h1>
          <h2 className="mb-4">{title}</h2>
          <p className="italic [&>strong]:not-italic">
            <strong>Nome em Romanji:</strong> {romanji}
            <br />
            <strong>Nome em Hiragana:</strong> {hiragana}
            <br />
            <strong>Nome em Inglês:</strong> {english}
            <br />
            <strong>Nome em Português:</strong> {portuguese}
            <br />
            <strong>Data de Lançamento:</strong> {formattedReleaseDate}
          </p>
        </div>
        <Image
          src={cover.url}
          alt={cover.alt}
          width={500}
          preload
          height={500}
          fetchPriority="high"
        />
      </div>
    </div>
  );
}

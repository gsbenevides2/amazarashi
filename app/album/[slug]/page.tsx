import { getAlbum } from "@/app/_actions/getAlbum";
import AlbumInfo from "../../_components/AlbumInfo";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: Props) {
  const albumId = (await props.params).slug;
  const albumData = await getAlbum(albumId);
  if (!albumData) {
    return {
      title: "Álbum não encontrado",
    };
  }
  return {
    title: `${albumData.romanji} - ${albumData.portuguese}`,
    description: `Informações sobre o álbum ${albumData.romanji} (${albumData.portuguese}) lançado em ${albumData.releaseDate}.`,
    openGraph: {
      title: `${albumData.romanji} - ${albumData.portuguese}`,
      description: `Informações sobre o álbum ${albumData.romanji} (${albumData.portuguese}) lançado em ${albumData.releaseDate}.`,
      images: [
        {
          url: albumData.cover,
          alt: `Capa do álbum ${albumData.romanji} (${albumData.portuguese})`,
        },
      ],
    },
  };
}

export default async function Album(props: Props) {
  const albumId = (await props.params).slug;
  const albumData = await getAlbum(albumId);
  if (!albumData) {
    notFound();
  }
  return (
    <>
      <AlbumInfo
        data={{
          cover: {
            url: albumData.cover,
            alt: `Imagem do Album ${albumData.portuguese}`,
          },
          english: albumData.english,
          hiragana: albumData.hiragana,
          portuguese: albumData.portuguese,
          releaseDate: albumData.releaseDate,
          romanji: albumData.romanji,
          title: albumData.romanji,
        }}
      />
    </>
  );
}

import { getAlbum } from "@/app/_actions/getAlbum";
import AlbumInfo from "../../_components/AlbumInfo";
import { notFound } from "next/navigation";
import { getAlbumsIds } from "@/app/_actions/getAlbumsIds";
import Spacer from "@/app/_components/Spacer";
import MusicList from "@/app/_components/MusicList";
import { getMusicsFromAlbum } from "@/app/_actions/getMusicsFromAlbum";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const albumsIds = await getAlbumsIds();
  return albumsIds.map((id) => ({ slug: id }));
}

export async function generateMetadata(props: Props) {
  const albumId = (await props.params).slug;
  const albumData = await getAlbum(albumId);
  if (!albumData) {
    return {
      title: "Álbum não encontrado",
    };
  }
  return {
    title: `${albumData.nameRomaji} - ${albumData.namePortuguese}`,
    description: `Informações sobre o álbum ${albumData.nameRomaji} (${albumData.namePortuguese}) lançado em ${albumData.releaseDate}.`,
    openGraph: {
      title: `${albumData.nameRomaji} - ${albumData.namePortuguese}`,
      description: `Informações sobre o álbum ${albumData.nameRomaji} (${albumData.namePortuguese}) lançado em ${albumData.releaseDate}.`,
      images: [
        {
          url: albumData.image,
          alt: `Capa do álbum ${albumData.nameRomaji} (${albumData.namePortuguese})`,
        },
      ],
    },
  };
}

export default async function Album(props: Props) {
  const albumId = (await props.params).slug;

  const [albumData, musics] = await Promise.all([
    getAlbum(albumId),
    getMusicsFromAlbum(albumId),
  ]);

  if (!albumData) {
    notFound();
  }
  return (
    <>
      <AlbumInfo
        data={{
          cover: {
            url: albumData.image,
            alt: `Imagem do Album ${albumData.namePortuguese}`,
          },
          english: albumData.nameEnglish,
          hiragana: albumData.nameHiragana,
          portuguese: albumData.namePortuguese,
          releaseDate: albumData.releaseDate,
          romanji: albumData.nameRomaji,
          title: albumData.nameRomaji,
        }}
      />
      <Spacer desktop={40} mobile={20} />
      <MusicList
        musics={musics.map((music) => ({
          id: music.id,
          duration: music.duration,
          name: music.nameRomaji,
          position: music.position,
          spotifyId: music.spotifyId ?? undefined,
          youtubeMusicId: music.youtubeMusicId ?? undefined,
          url: `/music/${music.id}`,
        }))}
      />
    </>
  );
}

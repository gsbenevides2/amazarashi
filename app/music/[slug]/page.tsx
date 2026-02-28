import { notFound } from "next/navigation";
import { getAlbumsIds } from "@/app/_actions/Albums/getAlbumsIds";
import { getMusic } from "@/app/_actions/Musics/getMusic";
import MusicInfo from "@/app/_components/MusicInfo";
import Spacer from "@/app/_components/Spacer";
import ShowBeforeAnimation from "@/app/_components/ShowBeforeAnimation";
import MusicData from "@/app/_components/MusicData";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const albumsIds = await getAlbumsIds();
  return albumsIds.map((id) => ({ slug: id }));
}

export async function generateMetadata(props: Props) {
  const musicId = (await props.params).slug;
  const musicData = await getMusic(musicId);
  if (!musicData) {
    return {
      title: "Música não encontrada",
    };
  }
  return {
    title: `${musicData.nameRomaji} - ${musicData.namePortuguese}`,
    description: `Informações sobre a música ${musicData.nameRomaji} (${musicData.namePortuguese}) lançada em ${musicData.releaseDate}.`,
    openGraph: {
      title: `${musicData.nameRomaji} - ${musicData.namePortuguese}`,
      description: `Informações sobre a música ${musicData.nameRomaji} (${musicData.namePortuguese}) lançada em ${musicData.releaseDate}.`,
      images: [
        {
          url: musicData.videoClipCoverUrl,
          alt: `Capa da música ${musicData.nameRomaji} (${musicData.namePortuguese})`,
        },
      ],
    },
  };
}

export default async function Music(props: Props) {
  const musicId = (await props.params).slug;

  const [musicData] = await Promise.all([
    getMusic(musicId),
    //getMusicsFromAlbum(albumId),
  ]);

  if (!musicData) {
    notFound();
  }
  return (
    <>
      <MusicInfo
        data={{
          cover: {
            url: musicData.videoClipCoverUrl,
            alt: `Capa da música ${musicData.nameRomaji} (${musicData.namePortuguese})`,
            isSquare: false,
          },
          english: musicData.nameEnglish,
          hiragana: musicData.nameHiragana,
          portuguese: musicData.namePortuguese,
          releaseDate: musicData.releaseDate,
          romanji: musicData.nameRomaji,
          spotifyId: musicData.spotifyId,
          title: musicData.nameRomaji,
          youtubeMusicId: musicData.youtubeMusicId,
        }}
      />
      <Spacer desktop={40} mobile={20} />
      <ShowBeforeAnimation animation="awaitBottomAnimationFadInEnd">
        <MusicData
          data={{
            description: musicData.description,
            id: musicData.id,
            spotifyId: musicData.spotifyId,
            youtubeMusicId: musicData.youtubeMusicId,
            youtubeVideoClipId: musicData.youtubeVideoClipId,
          }}
          lyrics={[]}
        />
      </ShowBeforeAnimation>
    </>
  );
}

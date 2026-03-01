import { notFound } from "next/navigation";
import { getMusic } from "@/app/_actions/Musics/getMusic";
import { getMusicsIds } from "@/app/_actions/Musics/getMusicsIds";
import { getLyricsFromMusic } from "@/app/_actions/Lyrics/getLyricsFromMusic";
import LyricsSync from "@/app/_components/LyricsSync";
import { getLanguages } from "@/app/_actions/Lyrics/getLanguages";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const musicsIds = await getMusicsIds();
  return musicsIds.map((id) => ({ slug: id }));
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
    description: `Letras da música ${musicData.nameRomaji} (${musicData.namePortuguese}) lançada em ${musicData.releaseDate}.`,
    openGraph: {
      title: `${musicData.nameRomaji} - ${musicData.namePortuguese}`,
      description: `Letras da música ${musicData.nameRomaji} (${musicData.namePortuguese}) lançada em ${musicData.releaseDate}.`,
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

  const [musicData, lyricsData, languages] = await Promise.all([
    getMusic(musicId),
    getLyricsFromMusic(musicId),
    getLanguages(),
  ]);

  if (!musicData) {
    notFound();
  }
  return (
    <>
      <LyricsSync
        data={{
          musicInfo: {
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
          },
          languages: languages,
          lyrics: lyricsData,
        }}
      />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DetailShell from "../../../components/detalhes/DetailShell";
import { PlayerProvider, SongPlayer, SyncedList } from "../../../components/detalhes/LyricsPlayer";
import SongClip from "../../../components/detalhes/SongClip";
import SongTabs from "../../../components/detalhes/SongTabs";
import Reveal from "../../../components/Reveal";
import { api, brDate, getSong, unwrap } from "../../../lib/api";
import { pageMeta, isoDuration, clip, isDraft, songBlurb } from "../../../lib/site";
import JsonLd, { abs, artist, breadcrumb } from "../../../components/JsonLd";
import { outlineButton, underline } from "../../../components/links";
import Image from "next/image";

// Slug criado no admin depois do build renderiza sob demanda (bloqueante); os do build são estáticos.
export const instant = false;

export const generateStaticParams = async () => unwrap(await api.songs.get()).map(({ slug }) => ({ slug }));

export async function generateMetadata({ params }: PageProps<"/musica/[slug]">): Promise<Metadata> {
  const s = await getSong((await params).slug);
  if (!s) return { title: "Música não encontrada" };
  const lyr = s.lyrics.length > 0;
  const lead = `${lyr ? "Letra e tradução de" : "Música"} ${s.romaji} (${s.kana}), faixa ${s.trackNumber} de ${s.album.romaji ?? s.album.title}, ${s.releaseDate.slice(0, 4)}.`;
  return {
    ...pageMeta(`/musica/${s.slug}`, `${s.romaji} (${s.nameEn}) — ${lyr ? "letra e tradução" : "música"}`, clip(`${lead} ${songBlurb(s.description)}`.trim()), "music.song"),
    // sem letra e com descrição em rascunho = página fina: fora do índice
    ...(!lyr && isDraft(s.description) ? { robots: { index: true, follow: true } } : {}),
  };
}

export default async function SongPage({ params }: PageProps<"/musica/[slug]">) {
  return <Content slug={(await params).slug} />;
}

async function Content({ slug }: { slug: string }) {
  const song = await getSong(slug);
  if (!song) notFound();
  const { album, appearsIn } = song;
  const date = brDate(song.releaseDate);
  const description = isDraft(song.description) ? `Faixa ${song.trackNumber} de ${album.romaji ?? album.title}, lançada em ${date}.` : song.description;
  const ja = song.lyrics.map((l) => l.text.split("\n")[0]).join("\n");

  const info: [string, React.ReactNode][] = [
    ["Álbum", <Link key="a" href={`/album/${album.slug}`} className={`inline-block pb-1 after:bottom-0 ${underline}`}>{album.romaji} ({album.title})</Link>],
    ["Faixa", `${song.trackNumber} de ${album.trackCount}`],
    ["Duração", song.duration],
    ["Lançamento", date],
  ];

  return (
    <DetailShell eyebrow={`Faixa ${song.trackNumber} · ${album.romaji}`} names={{ romaji: song.romaji, kana: song.kana, en: song.nameEn, pt: song.namePt }} back={{ href: `/album/${album.slug}`, label: "Voltar ao álbum" }} cover={album.cover} date={date}>
      <JsonLd
        data={{
          "@type": "MusicRecording",
          name: song.romaji,
          alternateName: [song.kana, song.nameEn, song.namePt].filter(Boolean),
          url: abs(`/musica/${slug}`),
          image: album.cover || undefined,
          description,
          inLanguage: "ja",
          // lyrics vive em MusicComposition (a obra), não em MusicRecording (a gravação)
          ...(ja && { recordingOf: { "@type": "MusicComposition", name: song.romaji, inLanguage: "ja", lyrics: { "@type": "CreativeWork", inLanguage: "ja", text: ja } } }),
          ...(song.videoclip && {
            video: {
              "@type": "VideoObject",
              name: `Videoclipe de ${song.romaji}`,
              description: `Videoclipe oficial de ${song.romaji}, do Amazarashi.`,
              thumbnailUrl: song.videoclip.coverImage ?? `https://i.ytimg.com/vi/${song.videoclip.youtubeId}/hqdefault.jpg`,
              uploadDate: `${song.releaseDate}T00:00:00+09:00`,
              contentUrl: `https://www.youtube.com/watch?v=${song.videoclip.youtubeId}`,
              embedUrl: `https://www.youtube-nocookie.com/embed/${song.videoclip.youtubeId}`,
            },
          }),
          duration: isoDuration(song.duration),
          datePublished: song.releaseDate,
          byArtist: artist,
          inAlbum: { "@type": "MusicAlbum", name: album.romaji ?? album.title, url: abs(`/album/${album.slug}`) },
        }}
      />
      <JsonLd data={breadcrumb([["Início", "/"], ["Discografia", "/albuns-e-discos"], [album.romaji ?? album.title, `/album/${album.slug}`], [song.romaji, `/musica/${slug}`]])} />
      <PlayerProvider youtubeId={song.youtubeId} lines={song.lyrics}>
      <Reveal as="section" delay={1400} className="mx-auto grid max-w-367 gap-12 px-6 pb-8 md:px-18.5 lg:grid-cols-[1fr_minmax(0,560px)] lg:items-start lg:gap-16">
        <SongTabs
          tabs={[
            { label: "Descrição", content: <p>{description}</p> },
            {
              label: "Letras",
              content: song.lyrics.length ? (
                <SyncedList />
              ) : (
                <p>A letra desta música ainda não foi adicionada.</p>
              ),
            },
            {
              label: "Mais informações",
              content: (
                <dl className="grid gap-5">
                  {info.map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-latin text-xs uppercase text-fg/60">{k}</dt>
                      <dd className="mt-0.5 text-fg">{v}</dd>
                    </div>
                  ))}
                </dl>
              ),
            },
          ]}
        />
        <div className="max-lg:order-first lg:sticky lg:top-24 lg:self-start lg:pt-4">
          <SongPlayer title={song.romaji} />
          <div className="mt-6 flex flex-wrap gap-4">
            <a href={song.spotifyUrl} target="_blank" rel="noreferrer" className={outlineButton}>OUVIR NO SPOTIFY</a>
            <a href={song.youtubeMusicUrl} target="_blank" rel="noreferrer" className={outlineButton}>YOUTUBE MUSIC</a>
          </div>
        </div>
      </Reveal>
      </PlayerProvider>
      {song.videoclip && (
        <Reveal as="section" aria-labelledby="videoclipe" className="mx-auto grid max-w-367 gap-6 border-t border-line px-6 pt-12 md:px-18.5 md:pt-16 lg:mt-16 lg:grid-cols-[1fr_minmax(0,560px)] lg:gap-16">
          <div>
            <h2 id="videoclipe" className="font-latin text-2xl uppercase md:text-3xl">Videoclipe</h2>
            <p className="mt-3 text-fg/70">Versão oficial em vídeo de {song.romaji}.</p>
            <a href={`https://www.youtube.com/watch?v=${song.videoclip.youtubeId}`} target="_blank" rel="noreferrer" className={`mt-4 inline-block pb-1 after:bottom-0 ${underline} hover:after:scale-x-100`}>Assistir no YouTube</a>
          </div>
          <SongClip title={`Videoclipe de ${song.romaji}`} {...song.videoclip!} />
        </Reveal>
      )}
      <Reveal as="section" aria-labelledby="presente-em" className="mx-auto max-w-367 px-6 pb-8 pt-16 md:px-18.5 md:pt-24">
        <h2 id="presente-em" className="font-latin text-2xl uppercase md:text-3xl">Presente {appearsIn.length > 1 ? "nos álbuns" : "no álbum"}</h2>
        <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 min-[500px]:grid-cols-2 lg:grid-cols-4">
          {appearsIn.map((a) => (
            <li key={a.slug} className="group">
              <Link href={`/album/${a.slug}`} className="block">
                <div className="aspect-square overflow-hidden bg-card">
                  {a.cover ? <Image src={a.cover} alt={`Capa de ${a.romaji ?? a.title}`} width={600} height={600} sizes="(min-width: 1024px) 25vw, (min-width: 500px) 50vw, 100vw" className="size-full object-cover transition-transform duration-700 ease-out-cubic motion-safe:group-hover:scale-105" /> : null}
                </div>
                <p className="mt-4 font-latin text-sm text-fg/60 transition-colors duration-700 group-hover:text-fg">{brDate(a.releaseDate)} / {a.trackCount} faixas</p>
                <h3 className={`mt-1 w-fit pb-1 text-lg leading-snug after:bottom-0 ${underline} group-hover:after:scale-x-100`}>{a.title}</h3>
                <p className="font-latin text-sm text-fg/70">{a.romaji}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </DetailShell>
  );
}

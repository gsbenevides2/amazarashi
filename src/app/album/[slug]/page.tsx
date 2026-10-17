import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DetailShell from "../../../components/detalhes/DetailShell";
import Reveal from "../../../components/Reveal";
import { api, brDate, getAlbum, unwrap } from "../../../lib/api";
import { pageMeta, isoDuration, clip, releaseKind } from "../../../lib/site";
import JsonLd, { abs, artist, breadcrumb } from "../../../components/JsonLd";
import { outlineButton, underline } from "../../../components/links";

// Slug criado no admin depois do build renderiza sob demanda (bloqueante); os do build são estáticos.
export const instant = false;

export const generateStaticParams = async () => unwrap(await api.releases.get({ query: {} })).flatMap((r) => (r.slug ? [{ slug: r.slug }] : []));

export async function generateMetadata({ params }: PageProps<"/album/[slug]">): Promise<Metadata> {
  const a = await getAlbum((await params).slug);
  if (!a) return { title: "Álbum não encontrado" };
  // o tipo e o ano no título distinguem lançamentos homônimos (ex.: single e versão digital de Tsūkaku)
  const kind = releaseKind[a.category];
  const names = a.romaji ? `${a.romaji} (${a.title})` : a.title;
  const tracks = a.tracks.map((t) => t.romaji ?? t.title).join(", ");
  return pageMeta(`/album/${a.slug}`, `${names} — ${kind} de ${a.releaseDate.slice(0, 4)}`, clip(`${names}, ${kind} do Amazarashi de ${brDate(a.releaseDate)} com ${a.tracks.length} ${a.tracks.length === 1 ? "faixa" : "faixas"}: ${tracks}.`), "music.album");
}

export default async function AlbumPage({ params }: PageProps<"/album/[slug]">) {
  return <Content slug={(await params).slug} />;
}

async function Content({ slug }: { slug: string }) {
  const album = await getAlbum(slug);
  if (!album) notFound();

  const newLocal = "mx-auto max-w-[calc(1320px+9.25rem)] px-6 pb-8 md:px-18.5";
  return (
    <DetailShell eyebrow="Álbum" names={{ romaji: album.romaji ?? "", kana: album.title, en: album.nameEn ?? "", pt: album.namePt ?? "" }} back={{ href: "/albuns-e-discos", label: "Voltar aos discos" }} cover={album.cover} date={brDate(album.releaseDate)}>
      <JsonLd
        data={{
          "@type": "MusicAlbum",
          name: album.romaji ?? album.title,
          alternateName: [album.title, album.nameEn, album.namePt].filter(Boolean),
          url: abs(`/album/${slug}`),
          image: album.cover || undefined,
          datePublished: album.releaseDate,
          byArtist: artist,
          numTracks: album.tracks.length,
          track: album.tracks.map((t, i) => ({ "@type": "MusicRecording", position: i + 1, name: t.romaji ?? t.title, duration: isoDuration(t.duration), url: t.songSlug ? abs(`/musica/${t.songSlug}`) : undefined })),
        }}
      />
      <JsonLd data={breadcrumb([["Início", "/"], ["Discografia", "/albuns-e-discos"], [album.romaji ?? album.title, `/album/${slug}`]])} />
      <div className="mx-auto flex max-w-367 flex-wrap gap-4 px-6 pb-12 md:px-18.5">
        <a href={album.spotifyUrl ?? undefined} target="_blank" rel="noreferrer" className={outlineButton}>OUVIR NO SPOTIFY</a>
        <a href={album.youtubeMusicUrl ?? undefined} target="_blank" rel="noreferrer" className={outlineButton}>YOUTUBE MUSIC</a>
      </div>
      <Reveal as="section" aria-labelledby="faixas" className={newLocal}>
        <h2 id="faixas" className="font-latin text-2xl uppercase md:text-3xl">Lista de músicas</h2>
        <ol className="mt-6 border-t border-line">
          {album.tracks.map((t, i) => {
            const row = (
              <>
                <span className="w-10 font-latin text-fg/60 transition-colors duration-500 group-hover:text-fg">{String(i + 1).padStart(2, "0")}</span>
                <div className="relative flex-1 text-lg">
                  <h3 className={`relative inline-block pb-1 after:bottom-0 ${underline} group-hover:after:scale-x-100`}>{t.romaji ?? t.title}</h3>
                  {t.romaji && <span lang="ja" className="ml-3 text-sm text-fg/50">{t.title}</span>}
                </div>
                <span className="font-latin text-sm text-fg/60">{t.duration}</span>
              </>
            );
            const cls = "group flex items-center border-b border-line py-5";
            return (
              <li key={t.title}>
                {t.songSlug ? (
                  <Link href={`/musica/${t.songSlug}`} className={`${cls} transition-[padding] duration-500 ease-out-cubic hover:pl-3`}>
                    {row}
                  </Link>
                ) : (
                  <div className={cls}>{row}</div>
                )}
              </li>
            );
          })}
        </ol>
      </Reveal>
    </DetailShell>
  );
}

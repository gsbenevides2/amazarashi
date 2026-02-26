import { getAlbums } from "./_actions/getAlbums";
import CoverSlider from "./_components/CoverSlider";
import Hero from "./_components/Hero";
import LatestRelease from "./_components/LatestRelease";
import Spacer from "./_components/Spacer";

export default async function Home() {
  const albums = await getAlbums();
  const latestAlbums = albums
    .sort(
      (a, b) =>
        new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
    )
    .map((album) => ({
      cover: {
        alt: `Imagem do Album ${album.portuguese}`,
        source: album.cover,
      },
      title: album.portuguese,
      url: `/album/${album.id}`,
    }));
  return (
    <>
      <Hero
        title="Amazarashi"
        description={`Amazarashi é uma banda de rock japonesa da cidade de Aomori. Formada em 2007 pelos membros Hiromu Akita e Manami Toyokawa.\nAlgumas músicas notáveis são "Sora ni Utaeba" 3ª Opening de My Hero Academia, "Speed to Masatsu" Opening de Rampo Kitan: Game of Laplace, a famosa "Kisetsu wa Tsugitsugi Shindeiku"(Estações morrem uma após a outra) que é tema de encerramento de Tokyo Ghoul e "Kyoukaisen"(Fronteira) Opening de 2ª Temporada de Eighty-Six.`}
        backgroundImage={{
          source: "/pages/home/amazarashi_banner.jpeg",
          alt: "Cover da Crunchroll",
        }}
        coverImage={{
          source: "/pages/home/amazarashi_cover.jpg",
          alt: "Album Cidade Eterna",
        }}
        cta={{
          label: "Saiba Mais",
        }}
      />
      <LatestRelease
        title="Taxi Driver: Uma viagem poética pela escuridão da sociedade"
        description={
          'Amazarashi mais uma vez nos puxa para a realidade crua com "Taxi Driver", uma música que é tanto um desabafo quanto uma reflexão existencial. Em versos que mesclam o cotidiano sufocante das cidades com o vazio interno de seus personagens, a banda pinta um retrato brutalmente honesto da vida moderna — onde o conforto material contrasta com a desconexão humana.'
        }
        ctaLink="/music/taxi-driver"
        image="/albuns/sekai-shusoku-ni-ichi-ichi-roku.jpg"
      />
      <Spacer desktop={60} mobile={30} />
      <CoverSlider title="Ultimos Albums" covers={latestAlbums} />
    </>
  );
}

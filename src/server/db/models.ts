import { createSelectSchema } from "drizzle-orm/zod";
import type { z } from "zod";
import * as s from "./schema";

// Cada coluna recebe título e descrição para a documentação OpenAPI.
const m = (title: string, description: string) => [title, description] as const;
// Exige título para toda coluna e devolve o mesmo tipo do schema original.
const describe = <T extends z.ZodObject>(base: T, meta: Record<keyof T["shape"], readonly [string, string]>) =>
  base.extend(Object.fromEntries(Object.entries<readonly [string, string]>(meta).map(([k, [title, description]]) => [k, base.shape[k].meta({ title, description })]))) as T;
const position = m("Posição", "Ordem de exibição, crescente.");
const cover = m("Imagem", "URL da imagem enviada ao S3.");
const id = m("ID", "Identificador numérico do registro.");

export const releaseRow = describe(createSelectSchema(s.releases), {
  id,
  slug: m("Slug", "Nulo = sem página de detalhe."),
  category: m("Categoria", "single, album, dvd ou streaming."),
  title: m("Título", "Título na discografia, em japonês."),
  romaji: m("Romaji", "Título em romaji."),
  nameEn: m("Nome em inglês", "Título traduzido para o inglês."),
  namePt: m("Nome em português", "Título traduzido para o português."),
  coverImage: m("Capa", "URL da capa enviada ao S3."),
  releaseDate: m("Data de lançamento", "ISO, YYYY-MM-DD."),
  spotifyUrl: m("Link do Spotify", "URL da página no Spotify."),
  youtubeMusicUrl: m("Link do YouTube Music", "URL da página no YouTube Music."),
});

export const songRow = describe(createSelectSchema(s.songs), {
  id,
  slug: m("Slug", "Identificador legível usado na URL."),
  releaseId: m("ID do lançamento", "ID do lançamento (álbum, single…) de origem."),
  romaji: m("Romaji", "Título em romaji."),
  kana: m("Kana", "Título em kana."),
  nameEn: m("Nome em inglês", "Título traduzido para o inglês."),
  namePt: m("Nome em português", "Título traduzido para o português."),
  duration: m("Duração", "mm:ss."),
  releaseDate: m("Data de lançamento", "ISO, YYYY-MM-DD."),
  youtubeId: m("ID do YouTube (áudio)", "Vídeo só com o áudio, usado na letra sincronizada."),
  videoclipId: m("ID do YouTube (videoclipe)", "Videoclipe oficial, quando existe."),
  spotifyUrl: m("Link do Spotify", "URL da página no Spotify."),
  youtubeMusicUrl: m("Link do YouTube Music", "URL da página no YouTube Music."),
  description: m("Descrição", "Texto descritivo."),
});

export const musicVideoRow = describe(createSelectSchema(s.musicVideos), {
  id,
  youtubeId: m("ID do YouTube", "ID do vídeo no YouTube."),
  title: m("Título", "Em japonês."),
  romaji: m("Romaji", "Título em romaji."),
  gradientFrom: m("Gradiente (início)", "Cor CSS de reserva."),
  gradientTo: m("Gradiente (fim)", "Cor CSS de reserva."),
  coverImage: m("Miniatura", "URL da miniatura no S3."),
  gifPreview: m("GIF de prévia", "GIF animado dos 10s iniciais, no S3."),
  webmPreview: m("WEBM de prévia", "WEBM dos 10s iniciais, no S3."),
  position,
});

export const animeSongRow = describe(createSelectSchema(s.animeSongs), {
  id,
  song: m("Música", "Nome da música."),
  romaji: m("Romaji", "Título em romaji."),
  anime: m("Anime", "Título do anime."),
  role: m("Função", "Ex.: abertura, encerramento."),
  year: m("Ano", "Ano em quatro dígitos."),
  coverImage: m("Capa", "Nulo = usa a capa do lançamento da música."),
  songId: m("ID da música", "Nulo = sem página da música."),
});

export const bandMemberRow = describe(createSelectSchema(s.bandMembers), { id, name: m("Nome", "Nome completo."), role: m("Função", "Papel exercido."), bio: m("Biografia", "Texto biográfico."), position });
export const timelineEventRow = describe(createSelectSchema(s.timelineEvents), { id, yearLabel: m("Ano", "Ano em quatro dígitos."), text: m("Texto", "Conteúdo em texto."), position });
export const bandStatRow = describe(createSelectSchema(s.bandStats), { id, value: m("Valor", "Valor exibido."), label: m("Rótulo", "Texto exibido."), position });
export const sourceRow = describe(createSelectSchema(s.sources), { id, label: m("Rótulo", "Texto exibido."), href: m("Link", "URL de destino.") });
export const highlightRow = describe(createSelectSchema(s.highlights), { id, title: m("Título", "Título exibido."), description: m("Descrição", "Texto descritivo."), coverImage: cover, href: m("Link", "Destino do card (opcional)."), imageAlt: m("Texto alternativo", "Descrição da imagem."), position });

export const infoCardRow = describe(createSelectSchema(s.infoCards), {
  id,
  headline: m("Título", "Título exibido."),
  subhead: m("Subtítulo", "Texto secundário abaixo do título."),
  bodyText: m("Texto", "Conteúdo em texto."),
  coverImage: cover,
  imageAlt: m("Texto alternativo", "Descrição da imagem."),
  layout: m("Layout", "split ou full."),
  textPosition: m("Posição do texto", "left, center ou right."),
  ctaMode: m("Tipo de chamada", "button ou link."),
  ctaText: m("Texto da chamada", "Texto do botão ou link de chamada."),
  ctaHref: m("Link da chamada", "URL de destino da chamada."),
  position,
});

export const menuItemRow = describe(createSelectSchema(s.menuItems), { id, label: m("Rótulo", "Texto exibido."), href: m("Link", "URL de destino."), position });
export const socialLinkRow = describe(createSelectSchema(s.socialLinks), { id, network: m("Rede", "x, youtube ou instagram."), label: m("Rótulo", "Texto exibido."), href: m("Link", "URL de destino."), position });

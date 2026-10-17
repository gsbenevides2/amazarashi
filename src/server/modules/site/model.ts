import { z } from "zod";
import {
  animeSongRow,
  bandMemberRow,
  bandStatRow,
  highlightRow,
  infoCardRow,
  menuItemRow,
  musicVideoRow,
  releaseRow,
  socialLinkRow,
  songRow,
  sourceRow,
  timelineEventRow,
} from "../../db/models";

export const musicVideosResponse = z.array(musicVideoRow).meta({ title: "Videoclipes", description: "Videoclipes na ordem de exibição." });

export const chromeResponse = z
  .object({
    settings: z.record(z.string().meta({ title: "Chave", description: "Nome da configuração." }), z.string().meta({ title: "Valor", description: "Valor do campo." })).meta({ title: "Configurações", description: "Textos soltos do site por chave." }),
    menu: z.array(menuItemRow).meta({ title: "Menu", description: "Itens do menu do cabeçalho." }),
    socials: z.array(socialLinkRow).meta({ title: "Redes sociais", description: "Links de redes sociais do rodapé." }),
  })
  .meta({ title: "Cabeçalho e rodapé", description: "Dados compartilhados por todas as páginas." });

export const homeResponse = z
  .object({
    highlights: z.array(highlightRow).meta({ title: "Destaques", description: "Itens da lista Destaques da home." }),
    infoCards: z.array(infoCardRow).meta({ title: "Cards de informação", description: "Blocos de texto e imagem da home." }),
  })
  .meta({ title: "Home", description: "Dados da página inicial." });

export const searchResponse = z
  .object({
    albums: z
      .array(
        releaseRow
          .pick({ slug: true, title: true, romaji: true, nameEn: true, namePt: true })
          .extend({ cover: z.string().nullable().meta({ title: "Capa", description: "URL da capa; pode ser nula." }), date: z.string().meta({ title: "Data de lançamento", description: "Data no formato ISO, YYYY-MM-DD." }) }),
      )
      .meta({ title: "Álbuns", description: "Lançamentos que têm página de detalhe." }),
    songs: z
      .array(
        songRow
          .pick({ slug: true, romaji: true, kana: true, nameEn: true, namePt: true })
          .extend({
            album: z.string().nullable().meta({ title: "Álbum", description: "Romaji do álbum." }),
            albumTitle: z.string().meta({ title: "Título do álbum", description: "Título do álbum em japonês." }),
            cover: z.string().nullable().meta({ title: "Capa", description: "URL da capa; pode ser nula." }),
          }),
      )
      .meta({ title: "Músicas", description: "Lista de músicas." }),
  })
  .meta({ title: "Índice de busca", description: "Índice completo para o cliente filtrar." });

export const biographyResponse = z
  .object({
    stats: z.array(bandStatRow).meta({ title: "Estatísticas", description: "Números de destaque da banda." }),
    members: z.array(bandMemberRow).meta({ title: "Membros", description: "Integrantes da banda." }),
    timeline: z.array(timelineEventRow).meta({ title: "Linha do tempo", description: "Eventos da história da banda." }),
    animeSongs: z
      .array(animeSongRow.extend({ slug: z.string().nullable().meta({ title: "Slug", description: "Slug da página da música, se houver." }) }))
      .meta({ title: "Músicas em animes", description: "Músicas usadas em animes." }),
    sources: z.array(sourceRow).meta({ title: "Fontes", description: "Fontes consultadas." }),
  })
  .meta({ title: "Biografia", description: "Dados da página de biografia." });

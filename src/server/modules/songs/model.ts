import { z } from "zod";
import { releaseRow, songRow } from "../../db/models";

export const slugParams = z.object({
  slug: z.string().meta({ title: "Slug", description: "Identificador legível usado na URL.", example: "kyohioroji" }),
});

const albumRef = releaseRow
  .pick({ slug: true, title: true, romaji: true, releaseDate: true })
  .extend({
    cover: z.string().meta({ title: "Capa", description: "URL da capa; vazia se não houver." }),
    trackCount: z.number().meta({ title: "Total de faixas", description: "Quantidade de faixas do lançamento." }),
  })
  .meta({ title: "Lançamento", description: "Resumo de um lançamento (álbum, single, DVD…)." });

export const listResponse = z
  .array(
    songRow.pick({ slug: true, releaseDate: true }).extend({ thin: z.boolean().meta({ title: "Página fina", description: "Sem letra e com descrição em rascunho: fica com noindex." }) }),
  )
  .meta({ title: "Músicas", description: "Lista de músicas." });

export const songResponse = songRow
  .extend({
    videoclip: z
      .object({
        youtubeId: z.string().meta({ title: "ID do YouTube", description: "ID do vídeo no YouTube." }),
        coverImage: z.string().nullable().meta({ title: "Miniatura", description: "URL da miniatura enviada ao S3." }),
        gifPreview: z.string().nullable().meta({ title: "GIF de prévia", description: "URL do GIF animado dos 10s iniciais." }),
      })
      .nullable()
      .meta({ title: "Videoclipe", description: "Videoclipe oficial, quando existe." }),
    trackNumber: z.number().meta({ title: "Número da faixa", description: "No álbum da música." }),
    album: albumRef.meta({ title: "Álbum", description: "Lançamento de origem." }),
    appearsIn: z.array(albumRef).meta({ title: "Aparece em", description: "Todos os lançamentos que têm esta faixa." }),
    lyrics: z
      .array(
        z.object({
          t: z.number().nullable().meta({ title: "Início", description: "Segundo de início da linha; nulo em letras sem sincronia." }),
          text: z.string().meta({ title: "Texto", description: "kana\\nromaji\\npt." }),
        }),
      )
      .meta({ title: "Letra", description: "Linhas da letra sincronizada com o áudio." }),
  })
  .meta({ title: "Música", description: "Dados completos de uma música." });

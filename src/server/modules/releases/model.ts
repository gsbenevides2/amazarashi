import { z } from "zod";
import { releaseRow } from "../../db/models";

export const listQuery = z.object({
  category: releaseRow.shape.category.optional().meta({ title: "Categoria", description: "Filtra os lançamentos por categoria." }),
});

export const slugParams = z.object({
  slug: z.string().meta({ title: "Slug", description: "Identificador legível usado na URL.", example: "kanashimi-sae-otonabite" }),
});

export const listResponse = z
  .array(
    releaseRow
      .pick({ slug: true, category: true, title: true, romaji: true, releaseDate: true })
      .extend({ cover: z.string().meta({ title: "Capa", description: "URL da capa; vazia se não houver." }) }),
  )
  .meta({ title: "Lançamentos", description: "Lista de lançamentos, do mais recente ao mais antigo." });

export const releaseResponse = releaseRow
  .omit({ coverImage: true })
  .extend({
    cover: z.string().meta({ title: "Capa", description: "URL da capa; vazia se não houver." }),
    tracks: z
      .array(
        z.object({
          title: z.string().meta({ title: "Título", description: "Título da faixa." }),
          duration: z.string().meta({ title: "Duração", description: "Duração no formato mm:ss." }),
          songSlug: z.string().nullable().meta({ title: "Slug da música", description: "Nulo = faixa sem página." }),
          romaji: z.string().nullable().meta({ title: "Romaji", description: "Título em romaji." }),
        }),
      )
      .meta({ title: "Faixas", description: "Faixas do lançamento, na ordem do disco." }),
  })
  .meta({ title: "Lançamento", description: "Resumo de um lançamento (álbum, single, DVD…)." });

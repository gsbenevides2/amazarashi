import { Elysia, status } from "elysia";
import { messageResponse } from "../../model";
import { listResponse, slugParams, songResponse } from "./model";
import { Songs } from "./service";

export const songsModule = new Elysia({ prefix: "/songs", detail: { tags: ["Songs"] } })
  .get("/", () => Songs.list(), { response: listResponse, detail: { summary: "Listar músicas", description: "Retorna slug, data de lançamento e se a página é fina (sem letra nem descrição) de cada música." } })
  .get(
    "/:slug",
    async ({ params }) => {
      const song = await Songs.get(params.slug);
      if (!song) return status(404, { message: "Música não encontrada" });
      return song;
    },
    { params: slugParams, response: { 200: songResponse, 404: messageResponse }, detail: { summary: "Obter música", description: "Retorna a música com letra, álbum, videoclipe e onde ela aparece." } },
  );

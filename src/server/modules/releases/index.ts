import { Elysia, status } from "elysia";
import { messageResponse } from "../../model";
import { listQuery, listResponse, releaseResponse, slugParams } from "./model";
import { Releases } from "./service";

export const releasesModule = new Elysia({ prefix: "/releases", detail: { tags: ["Releases"] } })
  .get("/", ({ query }) => Releases.list(query.category), {
    query: listQuery,
    response: listResponse,
    detail: { summary: "Listar lançamentos", description: "Lista álbuns, singles, DVDs e streaming, do mais recente ao mais antigo." },
  })
  .get(
    "/:slug",
    async ({ params }) => {
      const release = await Releases.get(params.slug);
      if (!release) return status(404, { message: "Álbum não encontrado" });
      return release;
    },
    { params: slugParams, response: { 200: releaseResponse, 404: messageResponse }, detail: { summary: "Obter lançamento", description: "Retorna um lançamento com a lista de faixas." } },
  );

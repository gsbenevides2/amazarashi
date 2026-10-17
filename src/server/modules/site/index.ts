import { Elysia } from "elysia";
import { biographyResponse, chromeResponse, homeResponse, musicVideosResponse, searchResponse } from "./model";
import { Site } from "./service";

export const siteModule = new Elysia({ detail: { tags: ["Site"] } })
  .get("/music-videos", () => Site.musicVideos(), { response: musicVideosResponse, detail: { summary: "Videoclipes", description: "Videoclipes na ordem de exibição." } })
  .get("/chrome", () => Site.chrome(), { response: chromeResponse, detail: { summary: "Cabeçalho e rodapé", description: "Configurações do site, menu e redes sociais." } })
  .get("/home", () => Site.home(), { response: homeResponse, detail: { summary: "Home", description: "Destaques e cards de informação da página inicial." } })
  .get("/search", () => Site.search(), { response: searchResponse, detail: { summary: "Índice de busca", description: "Álbuns e músicas inteiros; o cliente filtra." } })
  .get("/biography", () => Site.biography(), { response: biographyResponse, detail: { summary: "Biografia", description: "Estatísticas, membros, linha do tempo, músicas de anime e fontes." } });

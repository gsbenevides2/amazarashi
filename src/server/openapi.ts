import { openapi } from "@elysia/openapi";
import { z } from "zod";

export const docs = openapi({
  mapJsonSchema: { zod: z.toJSONSchema },
  documentation: {
    info: { title: "amazarashi API", version: "1.0.0", description: "API do site de fãs de amazarashi." },
    tags: [
      { name: "Releases", description: "Álbuns, singles e DVDs" },
      { name: "Songs", description: "Músicas e letras" },
      { name: "Site", description: "Dados das páginas públicas" },
      { name: "Admin", description: "CRUD do painel administrativo" },
    ],
  },
});

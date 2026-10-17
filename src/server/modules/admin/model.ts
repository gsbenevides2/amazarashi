import { z } from "zod";

const resource = z.string().meta({ title: "Recurso", description: "Nome do recurso do admin.", example: "releases" });

export const resourceParams = z.object({ resource });

export const idParams = z.object({
  resource,
  id: z.coerce.number().meta({ title: "ID", description: "Identificador numérico do registro.", example: 1 }),
});

export const uploadBody = z.object({
  file: z.file().mime(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]).max(10 * 1024 * 1024).meta({ title: "Imagem", description: "Até 10 MB." }),
});

export const uploadResponse = z.object({ url: z.string().meta({ title: "URL", description: "URL da imagem no S3." }) }).meta({ title: "Imagem enviada", description: "URL da imagem salva no S3." });

const record = z.record(z.string().meta({ title: "Campo", description: "Nome do campo." }), z.any().meta({ title: "Valor", description: "Valor do campo." }));

export const recordBody = record.meta({ title: "Registro", description: "Campos conforme o spec do recurso (components/admin/specs.ts)." });
export const recordResponse = record.meta({ title: "Registro", description: "Registro do recurso, com os campos definidos no spec." });
export const listResponse = z.array(recordResponse).meta({ title: "Registros", description: "Todos os registros do recurso." });

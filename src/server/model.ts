import { z } from "zod";

export const messageResponse = z
  .object({ message: z.string().meta({ title: "Mensagem", description: "Descrição do erro.", example: "Não encontrado" }) })
  .meta({ title: "Erro", description: "Resposta de erro." });
export const idResponse = z.object({ id: z.number().meta({ title: "ID", description: "Identificador numérico do registro.", example: 1 }) }).meta({ title: "ID do registro", description: "Registro criado, atualizado ou apagado." });

import { revalidatePath } from "next/cache";
import { Elysia, status } from "elysia";
import { uploadImage } from "../../s3";
import { idResponse, messageResponse } from "../../model";
import { idParams, listResponse, recordBody, recordResponse, resourceParams, uploadBody, uploadResponse } from "./model";
import { Admin } from "./service";

// As páginas públicas são pré-renderizadas; qualquer edição invalida todas.
const done = () => revalidatePath("/", "layout");
// O drizzle esconde o erro do Postgres em `cause`.
const reason = (e: unknown) => (e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : "Erro ao salvar");
const fail = (e: unknown) =>
  status(400, { message: /foreign key/i.test(reason(e)) ? "Há itens que dependem deste registro (ex.: músicas do álbum). Apague-os antes." : reason(e).replace(/^Failed query:[\s\S]*$/, "Erro ao salvar") });
const unknownResource = () => status(404, { message: "Recurso inexistente" });

export const admin = new Elysia({ prefix: "/admin", detail: { tags: ["Admin"] } })
  .post("/upload", async ({ body }) => {
    try {
      return { url: await uploadImage(body.file) };
    } catch (e) {
      return fail(e);
    }
  }, { body: uploadBody, response: { 200: uploadResponse, 400: messageResponse }, detail: { summary: "Enviar imagem", description: "Envia uma imagem para o S3 e retorna a URL." } })
  .get("/:resource", ({ params }) => {
    const name = params.resource;
    if (!Admin.isResource(name)) return unknownResource();
    return Admin.list(name);
  }, { params: resourceParams, response: { 200: listResponse, 404: messageResponse }, detail: { summary: "Listar registros", description: "Lista todos os registros do recurso." } })
  .get("/:resource/:id", async ({ params }) => {
    const name = params.resource;
    if (!Admin.isResource(name)) return unknownResource();
    const row = await Admin.get(name, params.id);
    if (!row) return status(404, { message: "Não encontrado" });
    return row;
  }, { params: idParams, response: { 200: recordResponse, 404: messageResponse }, detail: { summary: "Obter registro", description: "Retorna um registro (com campos virtuais) do recurso." } })
  .post("/:resource", async ({ params, body }) => {
    const name = params.resource;
    if (!Admin.isResource(name)) return unknownResource();
    try {
      const id = await Admin.create(name, body);
      done();
      return { id };
    } catch (e) {
      return fail(e);
    }
  }, { params: resourceParams, body: recordBody, response: { 200: idResponse, 400: messageResponse, 404: messageResponse }, detail: { summary: "Criar registro", description: "Cria um registro e invalida as páginas públicas." } })
  .put("/:resource/:id", async ({ params, body }) => {
    const name = params.resource;
    if (!Admin.isResource(name)) return unknownResource();
    try {
      await Admin.update(name, params.id, body);
      done();
      return { id: params.id };
    } catch (e) {
      return fail(e);
    }
  }, { body: recordBody, params: idParams, response: { 200: idResponse, 400: messageResponse, 404: messageResponse }, detail: { summary: "Atualizar registro", description: "Atualiza um registro e invalida as páginas públicas." } })
  .delete("/:resource/:id", async ({ params }) => {
    const name = params.resource;
    if (!Admin.isResource(name)) return unknownResource();
    try {
      await Admin.remove(name, params.id);
      done();
      return { id: params.id };
    } catch (e) {
      return fail(e);
    }
  }, { params: idParams, response: { 200: idResponse, 400: messageResponse, 404: messageResponse }, detail: { summary: "Apagar registro", description: "Apaga um registro (e filhos dependentes) e invalida as páginas públicas." } });

import { trace } from "@opentelemetry/api";
import { Elysia } from "elysia";
import { recordSpanError } from "./span";

// Anexa resposta e erro ao span ativo (o do Next). `as: "global"`: hooks são locais por padrão e não
// rodariam nas rotas dos outros módulos; sem um afterHandle o Elysia nem expõe `responseValue`.
export const elysiaOtel = new Elysia({ name: "otel" })
  .onAfterHandle({ as: "global" }, ({ responseValue }) => {
    if (responseValue === undefined || responseValue instanceof Response) return;
    const text = typeof responseValue === "object" ? JSON.stringify(responseValue) : String(responseValue);
    trace.getActiveSpan()?.setAttributes({ "http.response.body": text, "http.response.body.size": Buffer.byteLength(text) });
  })
  .onError({ as: "global" }, ({ error }) => {
    const span = trace.getActiveSpan();
    if (span) recordSpanError(span, error);
  });

import { type Span, SpanStatusCode } from "@opentelemetry/api";

export function recordSpanError(span: Span, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  span.recordException(err);
  span.setAttribute("error.type", err.name);
  span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
}

// JSON.stringify que não derruba quem chama: BigInt (ex.: count(*)) vira string e falha de serialização vira texto.
export function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v)) ?? String(value);
  } catch {
    return "[unserializable]";
  }
}

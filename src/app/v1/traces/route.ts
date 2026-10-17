import { parseKeyPairsIntoRecord } from "@opentelemetry/core";

// Proxy dos spans do front para o collector: o header de auth fica no servidor, fora do bundle.
export async function POST(request: Request) {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return new Response(null, { status: 204 });
  try {
    const response = await fetch(`${endpoint}/v1/traces`, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") ?? "application/x-protobuf", ...parseKeyPairsIntoRecord(process.env.OTEL_EXPORTER_OTLP_HEADERS) },
      body: await request.arrayBuffer(),
      skipInstrumentation: true,
    } as RequestInit);
    return new Response(null, { status: response.status });
  } catch {
    return new Response(null, { status: 502 }); // collector fora: o exporter do browser tenta de novo
  }
}

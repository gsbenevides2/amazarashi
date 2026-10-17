import { context, propagation, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { httpClientDuration } from "./metrics";
import { recordSpanError } from "./span";

const SECRET_HEADERS = new Set(["authorization", "cookie", "set-cookie", "x-amz-security-token"]);
const TEXTUAL = /text|json|xml|x-www-form-urlencoded/i;

function headerAttributes(prefix: string, headers: Headers) {
  const attributes: Record<string, string> = {};
  for (const [key, value] of headers.entries()) attributes[`${prefix}.${key.toLowerCase()}`] = SECRET_HEADERS.has(key.toLowerCase()) ? "[redacted]" : value;
  return attributes;
}

// Lê o corpo sem consumi-lo para quem chamou; só texto (imagens/binários não viram atributo).
async function peekBody(resource: Request | Response): Promise<string | undefined> {
  if (!resource.body || !TEXTUAL.test(resource.headers.get("content-type") ?? "")) return undefined;
  try {
    return (await resource.clone().text()) || undefined;
  } catch {
    return undefined;
  }
}

/** `skipInstrumentation: true` pula tudo para um fetch específico. */
export interface InstrumentedInit extends RequestInit {
  skipInstrumentation?: boolean;
}

export function instrumentFetch(): void {
  const originalFetch = globalThis.fetch;
  const tracer = trace.getTracer("fetch");
  // Nunca traceia o próprio exporter OTLP (loop infinito).
  const otlpHost = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? new URL(process.env.OTEL_EXPORTER_OTLP_ENDPOINT).host : undefined;

  const newFetch = async (input: string | Request | URL, init?: InstrumentedInit) => {
    if (init?.skipInstrumentation) return originalFetch(input, init);
    const rawUrl = input instanceof Request ? input.url : input.toString();
    if (otlpHost && rawUrl.includes(otlpHost)) return originalFetch(input, init);

    const request = new Request(input, init);
    const url = new URL(request.url);

    return tracer.startActiveSpan(
      `${request.method} ${url.hostname}`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "http.request.method": request.method,
          "url.full": request.url,
          "server.address": url.hostname,
          "server.port": Number(url.port || (url.protocol === "https:" ? 443 : 80)),
        },
      },
      async (span) => {
        const start = performance.now();
        let statusCode = 0;
        try {
          span.setAttributes(headerAttributes("http.request.header", request.headers));
          const requestBody = await peekBody(request);
          if (requestBody !== undefined) span.setAttributes({ "http.request.body": requestBody, "http.request.body.size": Buffer.byteLength(requestBody) });

          const headers = new Headers(request.headers);
          propagation.inject(context.active(), headers, { set: (carrier, key, value) => carrier.set(key, value) });

          const response = await originalFetch(new Request(request, { headers }));
          statusCode = response.status;
          span.setAttribute("http.response.status_code", response.status);
          span.setAttributes(headerAttributes("http.response.header", response.headers));
          if (!response.ok) {
            span.setAttribute("error.type", String(response.status));
            span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${response.status} ${response.statusText}` });
          }
          const responseBody = await peekBody(response);
          if (responseBody !== undefined) span.setAttributes({ "http.response.body": responseBody, "http.response.body.size": Buffer.byteLength(responseBody) });
          return response;
        } catch (error) {
          recordSpanError(span, error);
          throw error;
        } finally {
          httpClientDuration.record(performance.now() - start, { "http.request.method": request.method, "server.address": url.hostname, "http.response.status_code": statusCode });
          span.end();
        }
      },
    );
  };

  newFetch.preconnect = (url: string | URL, options: Parameters<typeof globalThis.fetch.preconnect>["1"]) => originalFetch.preconnect(url, options);
  globalThis.fetch = newFetch;
}

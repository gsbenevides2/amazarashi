import { openobserveLogs } from "@openobserve/browser-logs";
import { openobserveRum } from "@openobserve/browser-rum";
import { SpanStatusCode } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { UserInteractionInstrumentation } from "@opentelemetry/instrumentation-user-interaction";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor, StackContextManager, WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { acquisition } from "../lib/acquisition";
import { clientConfig } from "../lib/clientConfig";
import packageJson from "../../package.json";

const sessionId = () => {
  try {
    return openobserveRum.getInternalContext()?.session_id;
  } catch {
    return undefined;
  }
};

// IP e localização (headers do Cloudflare, via /geo). Com timeout: sem ele o RUM sobe sem geo em vez de atrasar.
async function geo(): Promise<Record<string, string>> {
  try {
    const r = await fetch("/geo", { cache: "no-store", signal: AbortSignal.timeout(1000) });
    return (await r.json()) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function instrumentFrontend(): Promise<void> {
  const cfg = clientConfig().rum;
  if (!cfg) return;
  const service = "amazarashi-web";
  const env = process.env.NODE_ENV === "production" ? "production" : "development";
  const version = packageJson.version;
  // Vem do servidor em runtime (window.__CFG__), não de process.env: o build não tem env.
  const { token: clientToken, site, org: organizationIdentifier } = cfg;
  // Resolvido ANTES do init: a view inicial já sai com origem e localização.
  const ctx = { ...acquisition(), ...(await geo()) };
  const shared = { clientToken, site, organizationIdentifier, service, env, version, insecureHTTP: false, apiVersion: "v1" };

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: service, "service.version": version, "deployment.environment.name": env }),
    spanProcessors: [
      // Marca todo span com a sessão do RUM: é o que junta trace e sessão.
      { onStart: (span) => { const id = sessionId(); if (id) span.setAttribute("session.id", id); }, onEnd: () => {}, forceFlush: () => Promise.resolve(), shutdown: () => Promise.resolve() },
      // Mesma origem: /v1/traces é proxy no servidor, que injeta o header de auth do collector.
      new BatchSpanProcessor(new OTLPTraceExporter({ url: `${window.location.origin}/v1/traces` })),
    ],
  });
  provider.register({ contextManager: new StackContextManager() });
  registerInstrumentations({
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new UserInteractionInstrumentation({ shouldPreventSpanCreation: (_type, element, span) => { span.setAttribute("target.label", element.textContent ?? ""); } }),
    ],
  });

  openobserveRum.init({
    ...shared,
    applicationId: service,
    trackResources: true,
    trackLongTasks: true,
    trackUserInteractions: true,
    defaultPrivacyLevel: "mask-user-input", // /admin tem formulários
    sessionPersistence: "local-storage", // reload/navegação mantém a sessão (sem cookie); expira por inatividade
    // O RUM é o único dono do traceparent (não adicionar FetchInstrumentation: dois injetores = dois trace ids).
    // Não é tráfego de usuário: o próprio export (/v1/traces) e estáticos saem das sessões.
    beforeSend: (event) =>
      !(event.type === "resource" && (["css", "js", "image", "font", "media"].includes(event.resource.type) || new URL(event.resource.url, window.location.origin).pathname === "/v1/traces")),
    allowedTracingUrls: [{ match: `${window.location.origin}/api`, propagatorTypes: ["tracecontext"] }],
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
  });
  // Contexto em TODO evento do RUM: origem da visita, IP e localização. É o que permite cruzar origem x comportamento.
  for (const [k, v] of Object.entries(ctx)) openobserveRum.setGlobalContextProperty(k, v);
  openobserveLogs.init({ ...shared, forwardErrorsToLogs: true });
  openobserveRum.startSessionReplayRecording();

  // Erros não tratados viram spans ligados ao trace ativo.
  const tracer = provider.getTracer("errors");
  const record = (name: string, error: unknown) => {
    const span = tracer.startSpan(name);
    span.recordException(error instanceof Error ? error : String(error));
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
  };
  window.addEventListener("error", (e) => record("window.error", e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => record("window.unhandledrejection", e.reason));
}

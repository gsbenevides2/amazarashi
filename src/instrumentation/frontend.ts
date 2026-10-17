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
import packageJson from "../../package.json";

const sessionId = () => {
  try {
    return openobserveRum.getInternalContext()?.session_id;
  } catch {
    return undefined;
  }
};

export function instrumentFrontend(): void {
  const service = "amazarashi-web";
  const env = process.env.NODE_ENV === "production" ? "production" : "development";
  const version = packageJson.version;
  // Literais NEXT_PUBLIC_*: o Next só inlina acesso direto, não destructuring.
  const clientToken = process.env.NEXT_PUBLIC_RUM_TOKEN!;
  const site = process.env.NEXT_PUBLIC_RUM_SITE!;
  const organizationIdentifier = process.env.NEXT_PUBLIC_OTEL_ORGANIZATION!;
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
    sessionPersistence: "memory", // reload = sessão nova
    // O RUM é o único dono do traceparent (não adicionar FetchInstrumentation: dois injetores = dois trace ids).
    // Não é tráfego de usuário: o próprio export (/v1/traces) e estáticos saem das sessões.
    beforeSend: (event) =>
      !(event.type === "resource" && (["css", "js", "image", "font", "media"].includes(event.resource.type) || new URL(event.resource.url, window.location.origin).pathname === "/v1/traces")),
    allowedTracingUrls: [{ match: `${window.location.origin}/api`, propagatorTypes: ["tracecontext"] }],
    sessionSampleRate: 100,
    sessionReplaySampleRate: 100,
  });
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

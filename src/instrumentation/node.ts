import { metrics } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor, NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { instrumentFetch } from "./instrumentFetch";
import { setupLoggerProvider } from "./instrumentLogger";
import { appResource } from "./resource";
import { flushTelemetryOnExit } from "./shutdown";

// Chamado por src/instrumentation.ts. Sem OTEL_EXPORTER_OTLP_ENDPOINT (dev local) não liga nada.
// O Next já emite spans de request/render/route handler assim que há um TracerProvider global.
export function setupNodeTelemetry(): void {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;
  new NodeTracerProvider({ resource: appResource, spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())] }).register();
  metrics.setGlobalMeterProvider(new MeterProvider({ resource: appResource, readers: [new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() })] }));
  setupLoggerProvider();
  instrumentFetch();
  flushTelemetryOnExit();
}

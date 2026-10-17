import { metrics, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";

type Flushable = { forceFlush?: () => Promise<void> };

// Providers globais são proxies; desembrulha para chegar no real.
const real = (provider: unknown) => ((provider as { getDelegate?: () => unknown }).getDelegate?.() ?? provider) as Flushable;

// Esvazia spans, logs e métricas pendentes para o último lote não se perder no restart.
export async function flushTelemetry(): Promise<void> {
  await Promise.allSettled([real(trace.getTracerProvider()).forceFlush?.(), real(logs.getLoggerProvider()).forceFlush?.(), real(metrics.getMeterProvider()).forceFlush?.()]);
}

export function flushTelemetryOnExit(): void {
  for (const signal of ["SIGTERM", "SIGINT"] as const) process.once(signal, () => void flushTelemetry().finally(() => process.exit(0)));
}

import { context } from "@opentelemetry/api";
import { type Logger, logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { appResource } from "./resource";

type LogAttrs = Record<string, string | number | boolean>;

export function setupLoggerProvider(): void {
  const provider = new LoggerProvider({ resource: appResource });
  provider.addLogRecordProcessor(new BatchLogRecordProcessor(new OTLPLogExporter()));
  logs.setGlobalLoggerProvider(provider);
}

export const getLogger = (name: string): Logger => logs.getLogger(name);

// Registro OTLP com trace_id/span_id ativos (junta com o trace) e espelho no stdout.
function emit(logger: Logger, severityNumber: SeverityNumber, mirror: typeof console.log, message: string, attributes: LogAttrs = {}) {
  logger.emit({ severityNumber, body: message, attributes, context: context.active() });
  mirror(message, attributes);
}

export const logInfo = (l: Logger, m: string, a?: LogAttrs) => emit(l, SeverityNumber.INFO, console.log, m, a);
export const logWarn = (l: Logger, m: string, a?: LogAttrs) => emit(l, SeverityNumber.WARN, console.warn, m, a);
export function logError(l: Logger, m: string, error?: unknown, a: LogAttrs = {}) {
  if (error instanceof Error) Object.assign(a, { "error.type": error.name, "error.message": error.message, ...(error.stack && { "error.stack": error.stack }) });
  else if (error !== undefined) a["error.message"] = String(error);
  emit(l, SeverityNumber.ERROR, console.error, m, a);
}

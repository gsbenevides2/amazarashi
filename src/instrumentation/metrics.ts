import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("amazarashi");

export const httpClientDuration = meter.createHistogram("http.client.request.duration", { description: "Outgoing HTTP request duration.", unit: "ms" });
export const dbDuration = meter.createHistogram("db.client.operation.duration", { description: "Database query duration.", unit: "ms" });

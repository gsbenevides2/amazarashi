import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import packageJson from "../../package.json";

export const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? "amazarashi";

// Um único resource para traces, logs e métricas: tudo junta pela mesma identidade de serviço.
export const appResource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: SERVICE_NAME,
  [ATTR_SERVICE_VERSION]: packageJson.version,
  "deployment.environment.name": process.env.NODE_ENV ?? "development",
  "service.instance.id": process.env.HOSTNAME ?? crypto.randomUUID(),
});

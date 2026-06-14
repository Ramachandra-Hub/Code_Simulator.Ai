/**
 * OpenTelemetry bootstrap — activates when OTEL_EXPORTER_OTLP_ENDPOINT is set.
 * Install optional deps: @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http
 */
import { isOtelEnabled } from "./otel-config";

let initialized = false;

export async function initOpenTelemetry(serviceName = "nexusedge-api"): Promise<boolean> {
  if (initialized) return true;
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return false;

  try {
    const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<Record<string, unknown>>;
    const otel = await dynamicImport("@opentelemetry/sdk-node").catch(() => null);
    const exporter = await dynamicImport("@opentelemetry/exporter-trace-otlp-http").catch(() => null);
    const resources = await dynamicImport("@opentelemetry/resources").catch(() => null);
    const semconv = await dynamicImport("@opentelemetry/semantic-conventions").catch(() => null);

    if (!otel || !exporter || !resources || !semconv) {
      console.warn(JSON.stringify({ level: "warn", service: "otel", message: "OpenTelemetry packages not installed" }));
      return false;
    }

    const NodeSDK = otel.NodeSDK as new (opts: object) => { start: () => Promise<void> };
    const Resource = resources.Resource as new (attrs: object) => object;
    const OTLPTraceExporter = exporter.OTLPTraceExporter as new (opts: object) => object;
    const attrs = semconv.SemanticResourceAttributes as { SERVICE_NAME: string };

    const sdk = new NodeSDK({
      resource: new Resource({ [attrs.SERVICE_NAME]: serviceName }),
      traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    });
    await sdk.start();
    initialized = true;
    console.log(JSON.stringify({ level: "info", service: "otel", message: "OpenTelemetry initialized", endpoint }));
    return true;
  } catch (err) {
    console.warn(
      JSON.stringify({
        level: "warn",
        service: "otel",
        message: "OpenTelemetry init failed",
        detail: err instanceof Error ? err.message : String(err),
      })
    );
    return false;
  }
}

export { isOtelEnabled };

import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const exporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces',
});

export const otelSDK = new NodeSDK({
  serviceName: 'inventory-service',  // different name — shows separately in Jaeger
  traceExporter: exporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

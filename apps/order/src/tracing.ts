import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// This file must be imported BEFORE anything else in main.ts.
// OpenTelemetry patches Node.js internals (http, net, etc.) at startup —
// if NestJS loads first, those modules won't be instrumented.

const exporter = new JaegerExporter({
  // Jaeger's default collector endpoint
  endpoint: 'http://localhost:14268/api/traces',
});

export const otelSDK = new NodeSDK({
  // serviceName appears in Jaeger UI to identify which service a trace came from
  serviceName: 'order-service',

  traceExporter: exporter,

  // Auto-instrumentation patches http, express, net, dns, etc. automatically.
  // No manual span creation needed for basic request tracing.
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations for cleaner traces in development
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

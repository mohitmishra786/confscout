/**
 * Next.js instrumentation hook.
 *
 * Full Sentry setup only loads when CI=1 (matches next.config.ts).
 * Local builds alias @sentry/nextjs to a stub so webpack does not compile
 * the OpenTelemetry dependency graph (that path hung `next build`).
 */
export async function register() {
  if (!process.env.CI) {
    return;
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export async function onRequestError(
  ...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>
) {
  if (!process.env.CI) {
    return;
  }
  const Sentry = await import('@sentry/nextjs');
  return Sentry.captureRequestError(...args);
}

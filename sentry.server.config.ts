import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  beforeSend(event, hint) {
    if (event.user) {
      delete event.user.email;
    }

    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
      delete event.request.headers['x-api-key'];
    }

    // Filter out health check transactions
    const healthCheckUrls = ['/health', '/api/health', '/_next/health'];
    const url = event.request?.url;
    
    if (url && healthCheckUrls.some(checkUrl => url.includes(checkUrl))) {
      return null;
    }

    return event;
  },
});
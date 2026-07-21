/**
 * Empty stub for @sentry/nextjs used only during local (non-CI) builds.
 * Prevents webpack from compiling the full Sentry + OpenTelemetry graph,
 * which was hanging `next build` for several minutes at 0% CPU.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

export function init(_options?: unknown): void {}

export function captureException(_error?: unknown): string {
  return '';
}

export function captureRequestError(..._args: unknown[]): void {}

export function captureRouterTransitionStart(..._args: unknown[]): void {}

export function replayIntegration(_options?: unknown): unknown {
  return {};
}

export function browserTracingIntegration(_options?: unknown): unknown {
  return {};
}

const noop = (..._args: unknown[]): void => {};

export const logger = {
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
  fatal: noop,
  trace: noop,
  fmt: String,
};

const Sentry = {
  init,
  captureException,
  captureRequestError,
  captureRouterTransitionStart,
  replayIntegration,
  browserTracingIntegration,
  logger,
};

export default Sentry;

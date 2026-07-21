import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  poweredByHeader: false, // SECURITY FIX: Disable X-Powered-By header
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', // Common CDN, just in case
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL || 'https://www.confscouting.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
      {
        // The static JSON fallback is only read when DB + Redis are both down.
        // Serve it from Vercel's edge cache for 1 h, allow stale for 24 h.
        source: '/data/:path*.json',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=(), payment=(), usb=(), bluetooth=()'
          }
        ]
      }
    ];
  },
};

const configWithIntl = withNextIntl(nextConfig);

// Sentry wraps webpack with 3 extra compilations (Node/Edge/Client) and uploads
// source maps — this makes local builds appear hung with no console output for
// several minutes. Keep full Sentry integration for CI/Vercel only.
const isCI = Boolean(process.env.CI);

// Webpack customisation:
// 1. Local builds: stub @sentry/nextjs so webpack never walks its OpenTelemetry
//    tree (avoids hung builds after instrument/rsc compile).
// 2. Edge runtime: alias @upstash/redis → cloudflare entry. The default nodejs
//    entry references process.version for telemetry and Next.js flags that as
//    unsupported in Edge (middleware imports rateLimit → redis).
// 3. Local: disable webpack filesystem cache (can stall on near-full disks).
{
  const previousWebpack = configWithIntl.webpack;
  configWithIntl.webpack = (config, options) => {
    const resolved =
      typeof previousWebpack === "function"
        ? previousWebpack(config, options)
        : config;
    resolved.resolve = resolved.resolve ?? {};
    const alias: Record<string, string | false | string[]> = {
      ...(resolved.resolve.alias as Record<string, string | false | string[]>),
    };

    if (!isCI) {
      alias["@sentry/nextjs"] = path.join(
        process.cwd(),
        "src/lib/sentry-stub.ts"
      );
      resolved.cache = false;
    }

    // nextRuntime is 'edge' | 'nodejs' | undefined (client)
    if (options.nextRuntime === "edge") {
      alias["@upstash/redis"] = path.join(
        process.cwd(),
        "node_modules/@upstash/redis/cloudflare.js"
      );
    }

    resolved.resolve.alias = alias;
    return resolved;
  };
}

const sentryOptions = {
  org: "implement-from-scratch",
  project: "confscout",
  silent: !isCI,
  telemetry: isCI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  sourcemaps: {
    disable: !isCI,
  },
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

export default isCI
  ? withSentryConfig(configWithIntl, sentryOptions)
  : configWithIntl;

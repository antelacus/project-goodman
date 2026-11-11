import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';
import fs from 'fs';
import packageJson from './package.json';

// The commit being built, which /api/health reports so a deploy can check what is served.
// The image has no .git: the deploy writes BUILD_SHA into the build context first.
const commit = process.env.GIT_SHA ?? (fs.existsSync('BUILD_SHA') ? fs.readFileSync('BUILD_SHA', 'utf8').trim() : 'unknown');

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/**
 * Security Headers Configuration
 * REQ-008: Security response headers for production protection
 * 
 * @see https://owasp.org/www-project-secure-headers/
 */
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",  // Next.js hydration requires unsafe-inline; Cloudflare Web Analytics
      "style-src 'self' 'unsafe-inline'",   // Tailwind CSS requires unsafe-inline
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.openai.com https://*.supabase.co https://cloudflareinsights.com",  // Added Cloudflare analytics endpoint
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  // Inject version from package.json at build time
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_APP_COMMIT: commit,
  },
  // Externalize @sentry/node to prevent webpack bundling Node.js-specific modules
  serverExternalPackages: ['@sentry/node', '@sentry/node-core'],
  // V3.10: instrumentation.ts is used for cleanup scheduler and admin init
  // Note: In Next.js 15.3+, instrumentation works by default (no experimental flag needed)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);

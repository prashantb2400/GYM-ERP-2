import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://www.googletagmanager.com https://static.cloudflareinsights.com https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://www.googletagmanager.com",
      "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:* http://*.local:* ws://*.local:* https://*.supabase.co wss://*.supabase.co https://graph.facebook.com https://www.google-analytics.com",
      "worker-src 'self' blob:",
      "frame-src https://checkout.razorpay.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@node-rs/bcrypt", "puppeteer"],

  turbopack: {
    resolveAlias: {
      '@vladmandic/human': './node_modules/@vladmandic/human/dist/human.esm.js',
      '@tensorflow/tfjs-node': './src/lib/face-attendance/empty-stub.js',
    },
  },

  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@vladmandic/human'] = require('path').resolve(__dirname, 'node_modules/@vladmandic/human/dist/human.esm.js');
    config.resolve.alias['@tensorflow/tfjs-node'] = require('path').resolve(__dirname, 'src/lib/face-attendance/empty-stub.js');
    return config;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Redirect www → non-www in production
  async redirects() {
    return process.env.NODE_ENV === "production"
      ? [
          {
            source: "/:path*",
            has: [{ type: "host", value: "www.yourdomain.com" }],
            destination: "https://yourdomain.com/:path*",
            permanent: true,
          },
        ]
      : [];
  },

  async rewrites() {
    const postgrestUrl = process.env.INTERNAL_POSTGREST_URL || 'http://localhost:54321';
    return [
      {
        source: "/rest/v1/:path*",
        destination: `${postgrestUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;

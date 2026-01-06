/** @type {import('next').NextConfig} */

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",

  // critical: never cache API routes
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkOnly",
      options: {
        cacheName: "no-cache-anywhere",
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: false,
  experimental: {
    appDir: true,
  },
};

module.exports = withPWA(nextConfig);

/** @type {import('next').NextConfig} */

const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  reactStrictMode: false,

  experimental: {
    appDir: true,
  },

  // VERY IMPORTANT: do NOT add headers that interfere with downloads
  headers: async () => {
    return [];
  },
};

module.exports = withPWA(nextConfig);

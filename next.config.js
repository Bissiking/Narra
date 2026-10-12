/** @type {import('next').NextConfig} */
const nextConfig = {
  // QA and build checks use their own output so a running dev server keeps its cache.
  distDir: process.env.NARRA_NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [],
  },
};

module.exports = nextConfig;

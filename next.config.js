/** @type {import('next').NextConfig} */
const nextConfig = {
  // QA and build checks use their own output so a running dev server keeps its cache.
  distDir: process.env.NARRA_NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return [
      { source: "/project/:projectId/edit-v2", destination: "/project/:projectId/edit", permanent: true },
      { source: "/project/:projectId/scenes", destination: "/project/:projectId/edit", permanent: true },
      { source: "/project/:projectId/scenes/:sceneId", destination: "/project/:projectId/edit?scene=:sceneId", permanent: true },
    ];
  },
};

module.exports = nextConfig;

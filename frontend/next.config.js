/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Scope Turbopack to this directory so dependency and lockfile detection
  // stays inside the frontend project instead of walking up parent folders.
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;

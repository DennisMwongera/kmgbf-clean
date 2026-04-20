/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Still shows warnings in IDE but doesn't block production build
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}
module.exports = nextConfig

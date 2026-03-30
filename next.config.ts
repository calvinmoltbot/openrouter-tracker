import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack has a bug with non-localhost connections — use Webpack
  // (Next.js 16 defaults to Turbopack)
}

export default nextConfig

// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack is default in Next.js 16
  reactCompiler: false,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },

  // @react-pdf/renderer needs these server-only exclusions
  serverExternalPackages: ['@react-pdf/renderer'],
}

export default nextConfig

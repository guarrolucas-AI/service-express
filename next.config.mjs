/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Evitar que webpack bundlee estos módulos — se cargan desde node_modules en runtime.
    // En Next.js 14.x la clave correcta es serverComponentsExternalPackages (no serverExternalPackages).
    serverComponentsExternalPackages: [
      '@prisma/client',
      'pdfkit',
    ],
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.vercel.app' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }],
      },
    ]
  },
}

export default nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14.2+ — no bundear estos paquetes, se cargan desde node_modules en runtime
  serverExternalPackages: [
    '@prisma/client',
    '@react-pdf/renderer',
    '@react-pdf/layout',
    '@react-pdf/font',
    '@react-pdf/pdfkit',
    '@react-pdf/png-js',
    'yoga-layout',
    'fontkit',
    'canvas',
  ],

  // yoga-layout carga sus binarios WASM/asm.js con require() de path relativo.
  // El file-tracer de Vercel no los detecta → hay que declararlos explícitamente.
  outputFileTracingIncludes: {
    '/api/pdf/**': [
      './node_modules/yoga-layout/binaries/**',
      './node_modules/yoga-layout/src/**',
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

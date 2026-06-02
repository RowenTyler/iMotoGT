/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  // ─── Image Optimisation ─────────────────────────────────────────────────────
  images: {
    // Enable Next.js image optimisation
    // This serves images as WebP/AVIF via the /_next/image endpoint
    // and applies proper cache headers automatically
    unoptimized: false,

    // Serve modern formats — browser picks the best it supports
    formats: ["image/avif", "image/webp"],

    // Allow images from your Supabase Storage bucket
    // Without this, Next.js <Image> will refuse to optimise Supabase URLs
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mwzrrrnmtyiyrwdqhcqb.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],

    // Device widths used to generate srcset — keeps image sizes sensible
    // Prevents the browser downloading a 1920px image for a 400px card
    deviceSizes: [640, 828, 1080, 1200, 1920],

    // Icon/thumbnail sizes
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Cache optimised images for 60 seconds minimum
    // Supabase Storage CDN adds its own cache headers on top
    minimumCacheTTL: 60,
  },

  // ─── Compression ────────────────────────────────────────────────────────────
  // Enable gzip/brotli compression for all responses
  compress: true,

  // Remove X-Powered-By header (minor security + tiny response size improvement)
  poweredByHeader: false,

  // ─── Bundle Size ────────────────────────────────────────────────────────────
  experimental: {
    // Tree-shake these packages so only the icons/components you use
    // are included in the bundle — not the entire library
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-slider",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-checkbox",
    ],
  },
}

export default nextConfig

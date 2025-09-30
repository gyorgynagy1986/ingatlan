

// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fotos15.apinmo.com",
      },
    ],
    // Képméret optimalizációk
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // AVIF első helyen, utána WebP fallback
    formats: ["image/avif", "image/webp"],

    // Cache beállítások - 1 év (másodpercben)
    // Ez azt mondja meg a Next.js-nek, hogy a távoli képeket meddig cache-elje
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },

  // Kísérleti funkciók
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

module.exports = nextConfig;

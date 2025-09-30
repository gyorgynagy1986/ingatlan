// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fotos15.apinmo.com',
        pathname: '/**', // pontosítsuk, hogy minden útvonal jöhet
      },
    ],

    // Csak a ténylegesen szükséges szélességek:
    // - mobil: 360/414
    // - kártya: ~400
    // - tablet: 640
    // - ritkán: 828 (tipikus Next breakpoint)
    deviceSizes: [360, 400, 414, 640, 828],

    // Ikonok/thumbnail-ek – bőven elég ez a készlet
    imageSizes: [16, 24, 32, 48, 64, 96, 128],

    // Modern formátumok (a böngésző tárgyal – ha tud AVIF-et, azt kap)
    formats: ['image/avif', 'image/webp'],

    // CDN cache idő – ha a képek ritkán változnak, maradhat magas.
    // Ha sűrűn frissülnek (pl. ügynökség képeket cserél), inkább 30–90 nap.
    minimumCacheTTL: 60 * 60 * 24 * 90, // 90 nap (javaslat)
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;

//// next.config.js
///** @type {import('next').NextConfig} */
//const nextConfig = {
//  images: {
//    remotePatterns: [
//      {
//        protocol: 'https',
//        hostname: 'fotos15.apinmo.com',
//      },
//    ],
//    // Képméret optimalizációk
//    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
//    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
//    
//    // AVIF első helyen, utána WebP fallback
//    formats: ['image/avif', 'image/webp'],
//    
//    // Cache beállítások - 1 év (másodpercben)
//    // Ez azt mondja meg a Next.js-nek, hogy a távoli képeket meddig cache-elje
//    minimumCacheTTL: 60 * 60 * 24 * 365,
//  },
//  
//  // Kísérleti funkciók
//  experimental: {
//    optimizePackageImports: ['lucide-react'],
//  },
//};
//
//module.exports = nextConfig;
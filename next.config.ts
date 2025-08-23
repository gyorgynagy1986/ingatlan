// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fotos15.apinmo.com',
      },
      // ha több domain kell:
      // { protocol: 'https', hostname: 'másik-domain.com' }
    ],
  },
};

module.exports = nextConfig;

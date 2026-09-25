/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@supabase/ssr"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Immutable Vercel Edge & browser caching for all static assets, media, fonts, and animation models
        source: "/:all*(svg|jpg|jpeg|png|webp|ico|woff|woff2|ttf|eot|json|mp4|webm)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, s-maxage=31536000, immutable",
          },
        ],
      },
      {
        // High-speed CDN caching for the 3D Drone Lottie animation asset
        source: "/Drone.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, s-maxage=31536000, immutable",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
        ],
      },
      {
        // Public Catalog & Map Pages: Serve from Vercel Edge CDN with Stale-While-Revalidate
        source: "/(events|campus-map|announcements)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=180, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Robots and crawlers
        source: "/robots.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Global preconnect headers for sub-millisecond Auth and Supabase Handshakes
        source: "/:path*",
        headers: [
          {
            key: "Link",
            value: "<https://accounts.google.com>; rel=preconnect, <https://sakumcryvbblzvxzklso.supabase.co>; rel=preconnect",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

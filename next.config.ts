import type { NextConfig } from "next"

import { routeHeaders } from "@/lib/site/route-headers"

const nextConfig: NextConfig = {
  ...(process.env["VERCEL"] ? {} : { output: "standalone" as const }),
  agentRules: false,
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  reactCompiler: true,
  compiler: {
    removeConsole: {
      exclude: ["error"],
    },
  },
  images: {
    unoptimized: true,
    remotePatterns: [],
  },
  experimental: {
    optimizePackageImports: ["@base-ui/react"],
    serverActions: {
      allowedOrigins: ["fiona.sm", "www.fiona.sm"],
      bodySizeLimit: "8kb",
    },
  },
  async headers() {
    return routeHeaders
  },
  async redirects() {
    return [
      {
        source: "/plain",
        destination: "/",
        permanent: true,
      },
    ]
  },
}

export default nextConfig

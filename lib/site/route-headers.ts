import { securityHeaders } from "./security-headers"

export const routeHeaders = [
  {
    source: "/:path*",
    headers: [...securityHeaders],
  },
  ...["/", "/privacy", "/canary", "/blog", "/blog/tickerbox-cli"].map(
    (source) => ({
      source,
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, s-maxage=60, must-revalidate",
        },
      ],
    })
  ),
  {
    source: "/fiona.asc",
    headers: [
      {
        key: "Content-Type",
        value: "application/pgp-keys; charset=utf-8",
      },
      {
        key: "Cache-Control",
        value: "public, max-age=300, must-revalidate",
      },
    ],
  },
  {
    source: "/canary.asc",
    headers: [
      {
        key: "Content-Type",
        value: "text/plain; charset=utf-8",
      },
      {
        key: "Cache-Control",
        value: "public, max-age=300, must-revalidate",
      },
    ],
  },
  {
    source: "/posts.asc",
    headers: [
      {
        key: "Content-Type",
        value: "text/plain; charset=utf-8",
      },
      {
        key: "Cache-Control",
        value: "public, max-age=300, must-revalidate",
      },
    ],
  },
  {
    source: "/posts/:slug/:digest.txt",
    headers: [
      {
        key: "Content-Type",
        value: "text/plain; charset=utf-8",
      },
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ],
  },
  {
    source: "/posts/:slug.txt",
    headers: [
      {
        key: "Content-Type",
        value: "text/plain; charset=utf-8",
      },
      {
        key: "Cache-Control",
        value: "public, max-age=300, must-revalidate",
      },
    ],
  },
  {
    source:
      "/:asset(icon-192\\.png|icon-512\\.png|icon-192-maskable\\.png|icon-512-maskable\\.png|safari-pinned-tab\\.svg|favicon\\.ico|icon\\.svg|apple-icon\\.png|manifest\\.webmanifest)",
    headers: [
      {
        key: "Cache-Control",
        value: "public, max-age=86400, stale-while-revalidate=2592000",
      },
    ],
  },
  {
    source:
      "/:asset(home\\.gif|home-static\\.png|blog\\.gif|blog-static\\.png|canary\\.gif|canary-static\\.png|verify\\.gif|verify-static\\.png|privacy\\.gif|privacy-static\\.png|404\\.gif|404-static\\.png|error\\.gif|error-static\\.png|globalerror\\.gif|globalerror-static\\.png)",
    headers: [
      {
        key: "Cache-Control",
        value: "public, max-age=3600, must-revalidate",
      },
    ],
  },
  {
    source: "/post-art/:path*",
    headers: [
      {
        key: "Cache-Control",
        value: "public, max-age=3600, must-revalidate",
      },
    ],
  },
  {
    source: "/.well-known/openpgpkey/hu/:hash",
    headers: [
      {
        key: "Content-Type",
        value: "application/octet-stream",
      },
      {
        key: "Access-Control-Allow-Origin",
        value: "*",
      },
      {
        key: "Cross-Origin-Resource-Policy",
        value: "cross-origin",
      },
      {
        key: "Cache-Control",
        value: "public, max-age=300, must-revalidate",
      },
    ],
  },
  {
    source: "/.well-known/openpgpkey/policy",
    headers: [
      {
        key: "Content-Type",
        value: "text/plain; charset=utf-8",
      },
      {
        key: "Access-Control-Allow-Origin",
        value: "*",
      },
      {
        key: "Cross-Origin-Resource-Policy",
        value: "cross-origin",
      },
      {
        key: "Cache-Control",
        value: "public, max-age=300, must-revalidate",
      },
    ],
  },
  {
    source: "/canary/:date.asc",
    headers: [
      {
        key: "Content-Type",
        value: "text/plain; charset=utf-8",
      },
      {
        key: "Cache-Control",
        value: "public, max-age=0, must-revalidate",
      },
    ],
  },
  {
    source: "/feed.xml",
    headers: [
      {
        key: "Content-Type",
        value: "application/atom+xml; charset=utf-8",
      },
      {
        key: "Cache-Control",
        value: "public, max-age=0, s-maxage=60, must-revalidate",
      },
    ],
  },
]

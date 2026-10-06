import type { ReactElement, ReactNode } from "react"

import { fontClassName } from "@/app/fonts"
import { SkipLink } from "@/components/skip-link"
import { site } from "@/lib/site/site"

import courierPrime400 from "@openbunny/theme/fonts/courier-prime-latin-400-normal.woff2"
import jetbrainsMono400 from "@openbunny/theme/fonts/jetbrains-mono-latin-400-normal.woff2"

import "./globals.css"

export { metadata, viewport } from "@/lib/site/metadata"

const preloadedFonts = [courierPrime400, jetbrainsMono400]

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>): ReactElement {
  return (
    <html
      lang={site.language}
      className={fontClassName}
      data-scroll-behavior="smooth"
    >
      <body>
        {preloadedFonts.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
        <link
          rel="alternate"
          type="application/atom+xml"
          title={`${site.name}'s posts`}
          href={site.feedPath}
        />
        <SkipLink />
        {children}
      </body>
    </html>
  )
}

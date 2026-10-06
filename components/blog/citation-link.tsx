import type { ReactElement, ReactNode } from "react"

type CitationLinkProps = {
  readonly href: string
  readonly className?: string
  readonly children: ReactNode
}

export function CitationLink({
  href,
  className,
  children,
}: CitationLinkProps): ReactElement {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

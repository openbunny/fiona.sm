import Link from "next/link"
import type { ReactElement } from "react"

export type PathSegment = {
  readonly label: string
  readonly href: string | null
}

export function splitPath(label: string): {
  readonly prefix: string | null
  readonly name: string
} {
  const slashIndex = label.lastIndexOf("/")
  if (slashIndex < 0) {
    return { prefix: null, name: label }
  }
  return {
    prefix: label.slice(0, slashIndex + 1),
    name: label.slice(slashIndex + 1),
  }
}

export function pathSegments(path: string): readonly PathSegment[] {
  const parts = path.split("/").filter((part) => part.length > 0)
  return parts.map((part, index) => ({
    label: part,
    href: `/${parts.slice(0, index + 1).join("/")}`,
  }))
}

export function PathTrail({
  segments,
  linkClassName,
}: {
  readonly segments: readonly PathSegment[]
  readonly linkClassName?: string
}): ReactElement {
  return (
    <span>
      {segments.map((segment, index) => {
        const { prefix, name } = splitPath(segment.label)
        return (
          <span key={segment.label}>
            {index > 0 ? "/" : null}
            {prefix !== null ? prefix : null}
            {segment.href === null ? (
              <span aria-current="page">{name}</span>
            ) : (
              <Link href={segment.href} className={linkClassName}>
                {name}
              </Link>
            )}
          </span>
        )
      })}
    </span>
  )
}

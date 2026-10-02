import { Fragment } from "react"
import type { ReactElement } from "react"

import { CitationLink } from "@/components/blog/citation-link"
import type { Reference } from "@/lib/blog/bibliography"

export type CitationRegistry = {
  readonly numberOf: (id: string) => number
  readonly recordOccurrence: (id: string) => number
  readonly citedIds: () => readonly string[]
  readonly occurrenceCount: (id: string) => number
}

export function createCitationRegistry(): CitationRegistry {
  const order: string[] = []
  const occurrences = new Map<string, number>()

  return {
    numberOf(id) {
      let position = order.indexOf(id)
      if (position === -1) {
        order.push(id)
        position = order.length - 1
      }
      return position + 1
    },
    recordOccurrence(id) {
      const next = (occurrences.get(id) ?? 0) + 1
      occurrences.set(id, next)
      return next
    },
    citedIds() {
      return order
    },
    occurrenceCount(id) {
      return occurrences.get(id) ?? 0
    },
  }
}

export function Cite({
  id,
  registry,
}: {
  readonly id: string
  readonly registry: CitationRegistry
}): ReactElement {
  const number = registry.numberOf(id)
  const occurrence = registry.recordOccurrence(id)

  return (
    <a
      id={`cite-${id}-${occurrence}`}
      href={`#ref-${id}`}
      className="text-ink hover:text-sprout"
    >
      [{number}]
    </a>
  )
}

export function References({
  items,
  registry,
}: {
  readonly items: readonly Reference[]
  readonly registry: CitationRegistry
}): ReactElement {
  const cited = registry.citedIds()

  return (
    <ol className="mt-4 flex flex-col gap-3 font-display text-[0.85rem] leading-[1.6]">
      {cited.map((id) => {
        const reference = items.find((item) => item.id === id)
        if (reference === undefined) {
          throw new Error(`references list has no entry for cited id "${id}"`)
        }

        const occurrences = registry.occurrenceCount(id)
        const number = registry.numberOf(id)
        const backLinks =
          occurrences > 1
            ? Array.from({ length: occurrences }, (_value, index) => index + 1)
            : [1]

        return (
          <li id={`ref-${id}`} key={id}>
            {reference.authors} ({reference.year}). {reference.title}.{" "}
            {reference.venue}.
            {reference.url !== undefined ? (
              <>
                {" "}
                <CitationLink id={id} href={reference.url} className="link">
                  source
                </CitationLink>
              </>
            ) : null}
            {backLinks.map((k) => (
              <Fragment key={k}>
                {" "}
                <a href={`#cite-${id}-${String(k)}`} className="link">
                  <span className="sr-only">
                    {occurrences > 1
                      ? `back to citation ${String(number)}, occurrence ${String(k)} of ${String(occurrences)}`
                      : `back to citation ${String(number)}`}
                  </span>
                  <span aria-hidden="true">
                    {occurrences > 1 ? `^${String(k)}` : "^"}
                  </span>
                </a>
              </Fragment>
            ))}
          </li>
        )
      })}
    </ol>
  )
}

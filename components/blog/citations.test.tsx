/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { Reference } from "@/lib/blog/bibliography"

import {
  Cite,
  References,
  createCitationRegistry,
} from "@/components/blog/citations"

afterEach(() => {
  cleanup()
})

const references: readonly Reference[] = [
  {
    id: "a",
    authors: "Ada, A.",
    year: 2001,
    title: "first",
    venue: "venue a",
  },
  {
    id: "b",
    authors: "Byte, B.",
    year: 2002,
    title: "second",
    venue: "venue b",
  },
  {
    id: "c",
    authors: "Carr, C.",
    year: 2003,
    title: "unused",
    venue: "venue c",
  },
]

describe("Cite and References", () => {
  it("numbers citations by first appearance, reusing the number on repeat", () => {
    const registry = createCitationRegistry()
    render(
      <>
        <Cite id="b" registry={registry} />
        <Cite id="a" registry={registry} />
        <Cite id="b" registry={registry} />
      </>
    )

    const marks = screen.getAllByRole("link")
    expect(marks.map((mark) => mark.textContent)).toEqual(["[1]", "[2]", "[1]"])
  })

  it("links each marker to its reference entry", () => {
    const registry = createCitationRegistry()
    render(<Cite id="a" registry={registry} />)

    expect(screen.getByRole("link").getAttribute("href")).toBe("#ref-a")
  })

  it("renders the marker inline, not as a superscript", () => {
    const registry = createCitationRegistry()
    render(<Cite id="a" registry={registry} />)

    expect(screen.getByRole("link").closest("sup")).toBeNull()
  })

  it("renders only the entries cited, in first-appearance order", () => {
    const registry = createCitationRegistry()
    render(
      <>
        <Cite id="b" registry={registry} />
        <Cite id="a" registry={registry} />
        <References items={references} registry={registry} />
      </>
    )

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(items[0]?.id).toBe("ref-b")
    expect(items[1]?.id).toBe("ref-a")
    expect(screen.queryByText(/unused/)).toBeNull()
  })

  it("gives a source cited twice one numbered back-link per occurrence, each with an announced name", () => {
    const registry = createCitationRegistry()
    render(
      <>
        <Cite id="a" registry={registry} />
        <Cite id="a" registry={registry} />
        <References items={references} registry={registry} />
      </>
    )

    const first = screen.getByRole("link", {
      name: "back to citation 1, occurrence 1 of 2",
    })
    const second = screen.getByRole("link", {
      name: "back to citation 1, occurrence 2 of 2",
    })
    expect(first.getAttribute("href")).toBe("#cite-a-1")
    expect(second.getAttribute("href")).toBe("#cite-a-2")
    expect(first.querySelector('[aria-hidden="true"]')?.textContent).toBe("^1")
    expect(second.querySelector('[aria-hidden="true"]')?.textContent).toBe("^2")
  })

  it("gives a source cited once a single, unnumbered back-link with an announced name", () => {
    const registry = createCitationRegistry()
    render(
      <>
        <Cite id="a" registry={registry} />
        <References items={references} registry={registry} />
      </>
    )

    const backLink = screen.getByRole("link", { name: "back to citation 1" })
    expect(backLink.getAttribute("href")).toBe("#cite-a-1")
    expect(backLink.querySelector('[aria-hidden="true"]')?.textContent).toBe(
      "^"
    )
  })

  it("throws when the references list has no entry for a cited id", () => {
    const registry = createCitationRegistry()
    render(<Cite id="missing" registry={registry} />)

    expect(() =>
      render(<References items={references} registry={registry} />)
    ).toThrow(/no entry for cited id "missing"/)
  })
})

/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { Reference } from "@/lib/blog/bibliography"

import {
  Cite,
  CiteGroup,
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

describe("CiteGroup", () => {
  it("renders one bracketed marker carrying every number in the group", () => {
    const registry = createCitationRegistry()
    const { container } = render(
      <CiteGroup ids={["a", "b"]} registry={registry} />
    )

    expect(container.textContent).toBe("[1, 2]")
  })

  it("gives each number its own link to its own reference entry", () => {
    const registry = createCitationRegistry()
    render(<CiteGroup ids={["a", "b"]} registry={registry} />)

    const marks = screen.getAllByRole("link")
    expect(marks.map((mark) => mark.textContent)).toEqual(["1", "2"])
    expect(marks.map((mark) => mark.getAttribute("href"))).toEqual([
      "#ref-a",
      "#ref-b",
    ])
  })

  it("numbers a group from the registry the same way single markers are numbered", () => {
    const registry = createCitationRegistry()
    render(
      <>
        <Cite id="c" registry={registry} />
        <CiteGroup ids={["b", "a"]} registry={registry} />
      </>
    )

    const marks = screen.getAllByRole("link")
    expect(marks.map((mark) => mark.textContent)).toEqual(["[1]", "2", "3"])
    expect(marks.map((mark) => mark.getAttribute("href"))).toEqual([
      "#ref-c",
      "#ref-b",
      "#ref-a",
    ])
  })

  it("anchors each number where its reference's back-link lands", () => {
    const registry = createCitationRegistry()
    render(
      <>
        <CiteGroup ids={["a", "b"]} registry={registry} />
        <References items={references} registry={registry} />
      </>
    )

    expect(document.querySelector("#cite-a-1")).not.toBeNull()
    expect(document.querySelector("#cite-b-1")).not.toBeNull()
    expect(
      screen
        .getByRole("link", { name: "back to citation 1" })
        .getAttribute("href")
    ).toBe("#cite-a-1")
    expect(
      screen
        .getByRole("link", { name: "back to citation 2" })
        .getAttribute("href")
    ).toBe("#cite-b-1")
  })

  it("lists every grouped source as its own reference entry, in group order", () => {
    const registry = createCitationRegistry()
    render(
      <>
        <CiteGroup ids={["b", "a"]} registry={registry} />
        <References items={references} registry={registry} />
      </>
    )

    const items = screen.getAllByRole("listitem")
    expect(items.map((item) => item.id)).toEqual(["ref-b", "ref-a"])
  })

  it("throws when the references list has no entry for a grouped id", () => {
    const registry = createCitationRegistry()
    render(<CiteGroup ids={["a", "missing"]} registry={registry} />)

    expect(() =>
      render(<References items={references} registry={registry} />)
    ).toThrow(/no entry for cited id "missing"/)
  })

  it("renders nothing but the brackets when given no ids", () => {
    const registry = createCitationRegistry()
    const { container } = render(<CiteGroup ids={[]} registry={registry} />)

    expect(container.textContent).toBe("[]")
    expect(screen.queryAllByRole("link")).toHaveLength(0)
  })
})

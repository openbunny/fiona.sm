/** @vitest-environment jsdom */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { CvViewer } from "@/components/cv-viewer"

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  destroy: vi.fn(async () => undefined),
  pageRender: vi.fn(),
  cancel: vi.fn(),
}))

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: mocks.getDocument,
}))

const pdfPage = {
  getViewport: vi.fn(({ scale }: { scale: number }) => ({
    width: 360 * scale,
    height: 480 * scale,
  })),
  render: mocks.pageRender,
}
const pdfDocument = {
  numPages: 2,
  getPage: vi.fn(async () => pdfPage),
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => ({}) as CanvasRenderingContext2D
  )
  mocks.getDocument.mockReturnValue({
    promise: Promise.resolve(pdfDocument),
    destroy: mocks.destroy,
  })
  mocks.pageRender.mockImplementation(() => ({
    promise: Promise.resolve(),
    cancel: mocks.cancel,
  }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  mocks.getDocument.mockReset()
  mocks.pageRender.mockReset()
  mocks.destroy.mockClear()
  mocks.cancel.mockClear()
  pdfDocument.getPage.mockClear()
  pdfPage.getViewport.mockClear()
})

describe("CV document viewer", () => {
  it("renders every PDF page without enabling evaluation or external fonts", async () => {
    const { container } = render(<CvViewer />)

    await waitFor(() => {
      expect(screen.getByText("2 pages")).toBeInTheDocument()
      expect(container.querySelectorAll("canvas")).toHaveLength(2)
    })

    expect(mocks.getDocument).toHaveBeenCalledWith({
      url: "/cv.pdf",
      isEvalSupported: false,
      useSystemFonts: false,
    })
    expect(pdfDocument.getPage).toHaveBeenCalledTimes(2)
    expect(pdfPage.getViewport).toHaveBeenCalledWith({ scale: 2 })
    const first = container.querySelector("canvas")
    expect(first?.width).toBe(720)
    expect(first?.height).toBe(960)
    expect(first).toHaveAttribute("aria-label", "cv page 1 of 2")
    expect(mocks.pageRender).toHaveBeenCalledTimes(2)
  })

  it("zooms with plus and minus and resets without refetching", async () => {
    const { container } = render(<CvViewer />)
    await waitFor(() => {
      expect(container.querySelectorAll("canvas")).toHaveLength(2)
    })

    expect(
      screen.getByRole("button", { name: "reset zoom" })
    ).toHaveTextContent("100%")
    fireEvent.click(screen.getByRole("button", { name: "zoom in" }))
    expect(container.querySelector(".cv-pages")).toHaveAttribute(
      "data-zoom",
      "125"
    )
    expect(
      screen.getByRole("button", { name: "reset zoom" })
    ).toHaveTextContent("125%")
    fireEvent.click(screen.getByRole("button", { name: "zoom in" }))
    expect(container.querySelector(".cv-pages")).toHaveAttribute(
      "data-zoom",
      "150"
    )
    fireEvent.click(screen.getByRole("button", { name: "zoom out" }))
    expect(container.querySelector(".cv-pages")).toHaveAttribute(
      "data-zoom",
      "125"
    )
    fireEvent.click(screen.getByRole("button", { name: "reset zoom" }))
    expect(container.querySelector(".cv-pages")).toHaveAttribute(
      "data-zoom",
      "100"
    )
    expect(mocks.getDocument).toHaveBeenCalledTimes(1)
  })

  it("pans the zoomed PDF by dragging, but not at default zoom", async () => {
    const { container } = render(<CvViewer />)
    await waitFor(() =>
      expect(container.querySelectorAll("canvas")).toHaveLength(2)
    )

    const scroll = container.querySelector<HTMLElement>(".cv-scroll")
    expect(scroll).not.toBeNull()
    if (!scroll) throw new Error("Missing CV scroll container")
    scroll.setPointerCapture = vi.fn()
    scroll.hasPointerCapture = vi.fn(() => true)
    scroll.releasePointerCapture = vi.fn()
    scroll.scrollLeft = 70
    scroll.scrollTop = 90

    fireEvent.pointerDown(scroll, {
      pointerId: 4,
      pointerType: "mouse",
      button: 0,
      clientX: 120,
      clientY: 120,
    })
    expect(scroll).toHaveAttribute("data-dragging", "false")

    fireEvent.click(screen.getByRole("button", { name: "zoom in" }))
    expect(scroll).toHaveAttribute("data-draggable", "true")
    fireEvent.pointerDown(scroll, {
      pointerId: 4,
      pointerType: "mouse",
      button: 0,
      clientX: 120,
      clientY: 120,
    })
    expect(scroll).toHaveAttribute("data-dragging", "true")
    fireEvent.pointerMove(scroll, {
      pointerId: 4,
      clientX: 100,
      clientY: 80,
    })
    expect(scroll.scrollLeft).toBe(90)
    expect(scroll.scrollTop).toBe(130)
    fireEvent.pointerUp(scroll, { pointerId: 4 })
    expect(scroll).toHaveAttribute("data-dragging", "false")
    expect(scroll.releasePointerCapture).toHaveBeenCalledWith(4)
  })

  it("saves the unchanged original PDF on click, Ctrl+S and Command+S", () => {
    const downloads: { href: string; filename: string }[] = []
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloads.push({ href: this.pathname, filename: this.download })
    })

    render(<CvViewer />)

    fireEvent.click(screen.getByRole("button", { name: "save pdf" }))
    const ctrl = new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      cancelable: true,
    })
    window.dispatchEvent(ctrl)
    const command = new KeyboardEvent("keydown", {
      key: "S",
      metaKey: true,
      cancelable: true,
    })
    window.dispatchEvent(command)
    fireEvent.keyDown(window, { key: "s", ctrlKey: true, altKey: true })

    expect(ctrl.defaultPrevented).toBe(true)
    expect(command.defaultPrevented).toBe(true)
    expect(downloads).toEqual([
      { href: "/cv.pdf", filename: "fiona-cv.pdf" },
      { href: "/cv.pdf", filename: "fiona-cv.pdf" },
      { href: "/cv.pdf", filename: "fiona-cv.pdf" },
    ])
    expect(screen.getByRole("link", { name: "direct pdf" })).toHaveAttribute(
      "href",
      "/cv.pdf"
    )
  })

  it("shows a direct PDF fallback if document loading fails", async () => {
    mocks.getDocument.mockImplementation(() => {
      throw new Error("invalid document")
    })

    render(<CvViewer />)

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "unable to display the cv. use the pdf link below."
      )
    })
    expect(screen.getByRole("link", { name: "direct pdf" })).toHaveAttribute(
      "href",
      "/cv.pdf"
    )
  })

  it("shows a fallback if the browser has no canvas context", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => null
    )

    render(<CvViewer />)

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "unable to display the cv. use the pdf link below."
      )
    })
  })

  it("destroys the PDF document and removes the keyboard handler on unmount", async () => {
    const { unmount } = render(<CvViewer />)
    await waitFor(() => expect(screen.getByText("2 pages")).toBeInTheDocument())
    unmount()

    expect(mocks.destroy).toHaveBeenCalled()
  })
})

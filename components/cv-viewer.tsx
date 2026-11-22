"use client"

import { useEffect, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react"

const pdfPath = "/cv.pdf"
const filename = "fiona-cv.pdf"
const zoomLevels = [75, 100, 125, 150, 175, 200] as const
type PanStart = {
  readonly pointerId: number
  readonly x: number
  readonly y: number
  readonly left: number
  readonly top: number
}

function saveOriginalPdf(): void {
  const download = document.createElement("a")
  download.href = pdfPath
  download.download = filename
  document.body.append(download)
  download.click()
  download.remove()
}

export function CvViewer(): ReactElement {
  const pagesRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(100)
  const panStart = useRef<PanStart | null>(null)
  const [dragging, setDragging] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [message, setMessage] = useState("loading cv…")

  useEffect(() => {
    let cancelled = false
    let documentTask: { destroy: () => Promise<void> } | undefined
    let renderTask: { cancel: () => void } | undefined

    async function render(): Promise<void> {
      const target = pagesRef.current
      if (!target) return

      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
        if (cancelled) return

        pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs"
        const task = pdfjs.getDocument({
          url: pdfPath,
          isEvalSupported: false,
          useSystemFonts: false,
        })
        documentTask = task
        const pdfDocument = await task.promise
        if (cancelled) return

        setPageCount(pdfDocument.numPages)
        setMessage("")
        target.replaceChildren()

        for (let number = 1; number <= pdfDocument.numPages; number++) {
          if (cancelled) return
          const page = await pdfDocument.getPage(number)
          if (cancelled) return

          const viewport = page.getViewport({ scale: 2 })
          const canvas = document.createElement("canvas")
          canvas.width = Math.ceil(viewport.width)
          canvas.height = Math.ceil(viewport.height)
          canvas.setAttribute("role", "img")
          canvas.setAttribute(
            "aria-label",
            `cv page ${number} of ${pdfDocument.numPages}`
          )
          canvas.className = "cv-canvas"
          const wrapper = document.createElement("div")
          wrapper.className = "cv-page"
          wrapper.append(canvas)
          target.append(wrapper)
          const context = canvas.getContext("2d")
          if (!context) throw new Error("Your browser cannot render the PDF")

          const rendering = page.render({
            canvas,
            canvasContext: context,
            viewport,
          })
          renderTask = rendering
          await rendering.promise
          renderTask = undefined
        }
      } catch {
        if (!cancelled)
          setMessage("unable to display the cv. use the pdf link below.")
      }
    }

    void render()
    return () => {
      cancelled = true
      renderTask?.cancel()
      void documentTask?.destroy()
      pagesRef.current?.replaceChildren()
    }
  }, [])

  useEffect(() => {
    function saveShortcut(event: KeyboardEvent): void {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "s"
      ) {
        event.preventDefault()
        saveOriginalPdf()
      }
    }

    window.addEventListener("keydown", saveShortcut)
    return () => window.removeEventListener("keydown", saveShortcut)
  }, [])

  function changeZoom(direction: -1 | 1): void {
    setZoom((current) => {
      const index = zoomLevels.findIndex((level) => level === current)
      const next = Math.max(
        0,
        Math.min(zoomLevels.length - 1, index + direction)
      )
      return zoomLevels[next] ?? 100
    })
  }

  function beginPan(event: ReactPointerEvent<HTMLDivElement>): void {
    if (zoom <= 100 || event.pointerType === "touch" || event.button !== 0)
      return
    const element = event.currentTarget
    panStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: element.scrollLeft,
      top: element.scrollTop,
    }
    element.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>): void {
    const start = panStart.current
    if (!start || start.pointerId !== event.pointerId) return
    event.currentTarget.scrollLeft = start.left - (event.clientX - start.x)
    event.currentTarget.scrollTop = start.top - (event.clientY - start.y)
  }

  function endPan(event: ReactPointerEvent<HTMLDivElement>): void {
    if (panStart.current?.pointerId !== event.pointerId) return
    panStart.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <section className="cv-viewer" aria-label="curriculum vitae">
      <div className="cv-toolbar">
        <span className="font-mono text-xs text-muted">
          {pageCount > 0 ? `${pageCount} pages` : "pdf viewer"}
        </span>
        <div className="cv-toolbar-actions">
          <div className="cv-zoom" role="group" aria-label="pdf zoom">
            <button
              type="button"
              className="cv-action"
              aria-label="zoom out"
              disabled={zoom === zoomLevels[0]}
              onClick={() => changeZoom(-1)}
            >
              −
            </button>
            <button
              type="button"
              className="cv-action"
              aria-label="reset zoom"
              disabled={zoom === 100}
              onClick={() => setZoom(100)}
            >
              {zoom}%
            </button>
            <button
              type="button"
              className="cv-action"
              aria-label="zoom in"
              disabled={zoom === zoomLevels[zoomLevels.length - 1]}
              onClick={() => changeZoom(1)}
            >
              +
            </button>
          </div>
          <button
            className="cv-action"
            type="button"
            onClick={() => {
              saveOriginalPdf()
            }}
          >
            save pdf
          </button>
        </div>
      </div>
      <div
        className="cv-scroll"
        aria-busy={message === "loading cv…"}
        data-draggable={zoom > 100}
        data-dragging={dragging}
        onPointerDown={beginPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onLostPointerCapture={() => {
          panStart.current = null
          setDragging(false)
        }}
      >
        {message ? (
          <p role="status" className="cv-message">
            {message}
          </p>
        ) : null}
        <div ref={pagesRef} className="cv-pages" data-zoom={zoom} />
      </div>
      <p className="mt-3 text-xs text-muted">
        ctrl+s / ⌘s saves the original pdf.{" "}
        <a className="link" href={pdfPath} download={filename}>
          direct pdf
        </a>
      </p>
    </section>
  )
}

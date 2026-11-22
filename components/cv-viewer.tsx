"use client"

import { useEffect, useRef, useState } from "react"
import type { ReactElement } from "react"

const pdfPath = "/cv.pdf"
const filename = "fiona-cv.pdf"
type Zoom = "85" | "100" | "115" | "130"

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
  const [zoom, setZoom] = useState<Zoom>("100")
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

  return (
    <section className="cv-viewer" aria-label="curriculum vitae">
      <div className="cv-toolbar">
        <span className="font-mono text-xs text-muted">
          {pageCount > 0 ? `${pageCount} pages` : "pdf viewer"}
        </span>
        <div className="cv-toolbar-actions">
          <label className="cv-zoom">
            <span>zoom</span>
            <select
              aria-label="pdf zoom"
              value={zoom}
              onChange={(event) => setZoom(event.target.value as Zoom)}
            >
              <option value="85">85%</option>
              <option value="100">100%</option>
              <option value="115">115%</option>
              <option value="130">130%</option>
            </select>
          </label>
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
      <div className="cv-scroll" aria-busy={message === "loading cv…"}>
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

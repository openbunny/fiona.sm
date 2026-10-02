import type { ReactElement } from "react"

export function ChevronIcon({
  direction,
}: {
  readonly direction: "left" | "right"
}): ReactElement {
  const d = direction === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"

  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}

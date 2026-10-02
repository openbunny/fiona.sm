import type { ReactElement, ReactNode } from "react"

import { CommandLine } from "@/components/command-line"
import { CopyButton } from "@/components/copy-button"
import { PageSection } from "@/components/page-section"
import { SectionHeading } from "@/components/section-heading"
import type { CommandStep } from "@/lib/canary/command-step"

type CommandBlockProps = {
  readonly id: string
  readonly number: string
  readonly title: string
  readonly steps: ReadonlyArray<CommandStep>
  readonly note?: string
  readonly copyAll?: boolean
  readonly lead?: ReactNode
}

export function CommandBlock({
  id,
  number,
  title,
  steps,
  note,
  copyAll = false,
  lead,
}: CommandBlockProps): ReactElement {
  return (
    <PageSection id={id}>
      <div className="flex items-baseline justify-between gap-4">
        <SectionHeading number={number}>{title}</SectionHeading>
        {copyAll ? (
          <CopyButton
            text={steps.map((step) => step.command).join(" &&\n")}
            label={`copy all ${title} commands`}
            caption="copy all"
          />
        ) : null}
      </div>
      {lead}
      <ol className="flex flex-col gap-4">
        {steps.map((step, index) => (
          <li key={step.command} className="flex flex-col gap-1">
            <p className="flex items-baseline gap-3 font-display text-[0.92rem] leading-[1.6]">
              <span
                aria-hidden="true"
                className="font-mono text-[0.62rem] text-muted"
              >
                {number}.{index + 1}
              </span>
              {step.comment}
            </p>
            <CommandLine command={step.command} />
          </li>
        ))}
      </ol>
      {note === undefined ? null : (
        <p className="mt-1 font-display text-[0.92rem] leading-[1.7] text-pretty text-muted">
          {note}
        </p>
      )}
    </PageSection>
  )
}

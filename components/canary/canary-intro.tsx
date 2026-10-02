import type { ReactElement } from "react"

export function CanaryIntro(): ReactElement {
  return (
    <>
      <p className="mt-12 font-display text-[0.92rem] leading-[1.7] text-pretty">
        this page is a cryptographic canary. the statement below is{" "}
        <strong>signed</strong> with the key whose fingerprint appears above. if
        verification fails, the displayed page is not what was signed: treat it
        as <strong>tampered with</strong>. a missed renewal is a different
        thing. it means the statement no longer speaks for today, not that the
        key is known to be compromised.
      </p>
      <p className="mt-6 font-display text-[0.92rem] leading-[1.7] text-pretty">
        the statement carries <strong>five</strong> numbered clauses. they are
        the whole of what is being asserted, so read them rather than the date
        alone: a clause that is missing, reordered, or altered in a later
        statement is itself the signal, and it will arrive under a signature
        that verifies and a renewal that is on time.
      </p>
    </>
  )
}

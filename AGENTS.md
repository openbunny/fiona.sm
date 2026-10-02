# AGENTS.md

Rules for anyone or anything changing this repository. Read this before
touching visitor-facing text, `app/globals.css`, or the canary pipeline.

## 1. Lowercase

All visitor-facing text is lowercase. Exceptions, and only these:

- Text inside signed or armored material (`public/fiona.asc`,
  `public/canary.asc`, anything clearsigned) — changing its case breaks
  signature verification.
- Anything where case is behaviour: code identifiers, paths, package and
  command names, env var names, flags, object keys, strings the code
  compares against a fixed value.
- Real people's surnames in a bibliography.
- Mathematical notation.

A string that fails none of the above and still has a capital letter in it
violates the rule.

This rule has been reverted and reinstated more than once in this project's
history. Before running a tree-wide lowercase sweep, confirm with the owner
that it is still current rather than assuming this file is up to date — a
rule this document states can still have been superseded by an instruction
you have not seen.

## 2. The display name is "fiona"

No surname, no initial, lowercase. `canary.displayName` in
`lib/canary/canary.ts` already carries this and is the value pages render.

`canary.name` in the same file is a separate field, also `"fiona"`, used to
build the PGP identity string `scripts/verify-asc.ts` checks against
`public/fiona.asc`'s primary user id. The key's primary user id is
`"fiona <mail@fiona.sm>"`, and `canary.name` matches it, so
`bun run scripts/verify-asc.ts` has nothing to flag on this point. Confirm
`canary.name` still matches the primary user id after any future key or
display-name change rather than assuming the two stay in sync on their own.

## 3. Design system

- Light mode only. `:root` sets `color-scheme: light` explicitly in
  `app/globals.css`. There is no dark variant to keep in sync.
- Every radius token (`--radius-sm` through `--radius-4xl`) is `0`. A
  rounded corner anywhere on the page is a regression, not a style choice.
- One border width: `1px`, always `var(--line)`. Do not introduce a second
  border color or weight; a heavier or lighter rule reads as a second
  system next to the first.
- At most two sections on a page carry card chrome (a filled ground,
  distinct from `--paper`, wrapping a block of content). A page that
  needs a third has confused emphasis with decoration; cut back to two
  before adding container styling to a third section.
- One accent, `var(--sprout)`, used structurally — state (valid/signed),
  a rail, a rare emphasis mark. It is not a decoration color; if a use
  does not mark a state or a structural role, it does not qualify.
- Two type families, both loaded from self-hosted `@openbunny/theme` assets
  (no remote font host — the CSP forbids one; see §5): Courier Prime is
  the voice (`--font-display`, `--font-sc`, body copy, headings, prose)
  and JetBrains Mono is the machine (`--font-mono`, code, commands,
  fingerprints, anything quoting a literal value).
- `PageShell` from `@openbunny/react` fixes the content measure at
  `max-w-[65ch]`. Build new pages inside it rather than setting a
  competing max-width.
- `Plate` from `@openbunny/react` renders a page's masthead artwork: an
  animated GIF that swaps for a static first-frame PNG under
  `prefers-reduced-motion`, both named by a `PlateAsset` constant in
  `lib/images/plates.ts`. Keep a plate's GIF and static PNG updated
  together — a new mark or a motion change to one needs the other changed
  in the same commit, not the GIF alone. `Logo` (`components/logo.tsx`) is
  `Plate` fixed to `HOME_PLATE` (`public/home.gif` /
  `public/home-static.png`) and is the brand identity shown on the home
  page and on any route added without a plate of its own. A blog post is
  the exception: it carries its own artwork or none, never `Logo`, so a
  post never shows two pieces of artwork at once. The blog index
  (`/blog` and `/blog/page/N`), `/canary`, and `/blog/verify-posts` each carry
  their own plate instead (`BLOG_PLATE`, `CANARY_PLATE`, `VERIFY_PLATE`),
  and the three status pages
  (`app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`) each carry
  their own as well (`NOT_FOUND_PLATE`, `ERROR_PLATE`,
  `GLOBAL_ERROR_PLATE`). A page's plate is a one-line change: swap which
  constant it passes to `Plate`, in `lib/images/plates.ts` or at the call
  site, not a hardcoded path.
- A blog post may declare its own artwork, shown on that post's own page
  only — never on the blog index, which keeps `BLOG_PLATE` regardless.
  Declare it on the post's entry in `lib/blog/posts.ts` with
  `artwork: postArtwork(slug, width, height)`; a post with no `artwork`
  field renders nothing in that position, not a fallback plate and not an
  empty placeholder. `postArtwork` points at
  `public/post-art/<slug>.gif` and `public/post-art/<slug>-static.png` —
  never `public/blog/`, which would collide with the `/blog` route itself.
  `BlogPost["artwork"]` is a `PlateAsset`, so a post cannot declare a GIF
  without its static PNG; the type makes that incomplete declaration
  unrepresentable, not merely discouraged. A GIF placed under
  `public/post-art/` must carry the Netscape loop extension — a GIF
  without it plays once and then freezes on the page. Every plate's
  integer-scale and `image-rendering: pixelated` rules in `@openbunny/react/styles.css`
  apply here too; choose the display width once the real asset's native
  size is known, the same way `BLOG_PLATE` and `CANARY_PLATE` did.
- `SiteFooter` (`components/site-footer.tsx`) is the one footer, rendered on
  every route. A page needing different footer content changes `SiteFooter`
  itself; it does not get its own footer component.
- Every color pairing in `app/globals.css` is computed against its real
  ground, not chosen by eye — two muted swatches that look alike can
  differ widely in contrast, and that failure is silent until a reader
  with low vision hits it. Verify a new or changed pairing with a WCAG
  2.1 contrast-ratio check (4.5:1 for body text, 3:1 for large text,
  borders, and UI outlines) against the actual background it will sit
  on, not against white or a placeholder ground. This repo has no
  checker script committed; run the check by hand before landing a
  color change and state the ratio in the commit or PR, since nothing
  else records it.

## 4. The canary must verify, or the build must fail

The site does not build without a signed statement at `public/canary.asc`,
deliberately. `bun run verify-asc` (`scripts/verify-asc.ts`) runs before
`next build` in both `vercel.json`'s `buildCommand` and the `Dockerfile`,
and it fails the pipeline if `public/canary.asc` is missing, malformed, or
does not clearsign-verify against `public/fiona.asc`, or if the statement's
claims (origin, key location, fingerprint, dates, chained hash) disagree
with the constants in `lib/canary/canary.ts`.

This is intentional: a site that would silently serve without a verifiable
canary is a site that could hide a compromise. Do not make `verify-asc`
tolerant of a missing or unverifiable statement, and do not route around
it by calling `next build` directly in a deploy path.

`lib/canary/canary.ts` enforces the same invariant at import time:
`canary.signedStatement` is a required `string`, and reading it throws when
`public/canary.asc` is absent, unreadable, or otherwise fails — there is no
degraded "no statement is published" rendering anywhere in the app. A fresh
checkout without `public/canary.asc` therefore cannot import
`lib/canary/canary.ts`, let alone build; add the file before running
anything that touches the canary.

Renew only through `bun run canary renew` (`lib/renew/canary-renew.ts`), never
by hand-running `gpg --clearsign`. The statement's proof of date is a live
Monero block height and hash quoted at signing time, and the renewal command
is what fetches that block, checks its height exceeds the currently published
one, and rejects an advance implausible for the time elapsed since the last
signing — a hand-signed statement has no source for that block and no check
against a fabricated or stale one. Renewal needs two YubiKey touches: the
command rehearses every output file against provisional values first, so a
mistake caught during rehearsal aborts before either touch.

## 5. The CSP is strict and self-only

`lib/site/security-headers.ts` sets `default-src 'self'` with every other
directive scoped to `'self'`, `'none'`, or `data:` for `img-src`. In
practice this forbids, anywhere in the app:

- A font, script, or stylesheet loaded from another origin. Theme font
  assets are self-hosted for this reason — do not add a
  `<link>` to Google Fonts, a CDN script tag, or any other cross-origin
  asset.
- A runtime `fetch`, `XMLHttpRequest`, or `WebSocket` to another origin
  (`connect-src 'self'`).
- An inline `style` attribute. `style-src-attr 'none'` blocks it outright,
  so a component cannot fall back to `style={{ ... }}` for something
  Tailwind cannot express — find the Tailwind or CSS-file route instead.
- `script-src` allows `'unsafe-inline'` (development also allows
  `'unsafe-eval'`), but `script-src-attr` does not — no `onclick="..."`
  or other inline event-handler attribute.

`next/image` sets an inline style attribute on every image whose `alt` is
empty, so the CSP blocks it on exactly the decorative images, and this
repository uses a raw `<img>` throughout. That is why
`@next/next/no-img-element` is off in `eslint.config.mjs`: its only
suggested fix is the one the CSP forbids.

A change that needs an exception to any of these is a change to
`securityHeaders`, made deliberately and reviewed as a security change, not
an inline workaround in the component that hit the wall.

## 6. Gates

Run from the justfile, not ad hoc:

- `just check` — the pre-push gate: spelling, Renovate config validation,
  semgrep. Offline and deterministic.
- `just quality` — the merge gate: `check` plus a lockfile OSV scan and a
  gitleaks history scan.
- `just exhaustive` — `quality` plus the Playwright end-to-end suite. Not
  required to merge.
- `just bun` (called by the gates above and directly) runs `bun run check`,
  which is `prettier`, `eslint`, `tsc --noEmit`, `markdownlint`, `cspell`,
  `editorconfig-checker`, `taplo`, `knip`, `vitest` (via `bun run test`,
  which builds the site first), `stylelint`, and `html-validate`, each
  reported independently by `concurrently -m 1`.

The end-to-end suite drives `next start`, not the deployed site, so a header
it observes is the one that server sends. Vercel serves the prerendered
not-found response as a static asset and sets its own `Cache-Control` on it,
which is why `e2e/headers.spec.ts` asserts the invariant a 404 must hold —
`max-age=0`, `must-revalidate`, no `stale-while-revalidate`, no non-zero
`s-maxage`, so no 404 is ever served stale — rather than one exact header
string. Both environments satisfy that invariant; only one of them satisfies
`next start`'s `private, no-store` default, and that default is not a policy
this repository chose. `lib/site/route-headers.ts` configures
`/canary/:date.asc` as `public, max-age=0, must-revalidate`, production
sends exactly that, and `next start` overrides it for the not-found path.
Pinning the exact string again would assert local behaviour and claim it as
evidence about production. Verify a header against the deployed origin with
`curl -I` when the header itself is the thing under test.

A colocated `*.test.ts(x)` tests the file beside it. `tests/unit/*.test.ts`
tests a cross-cutting or build-output invariant with no single colocated
subject; a `*.build-output.test.ts` suffix additionally marks one that
requires a prior `bun run build`. `test/*.ts` holds non-test setup and
realm-shim files consumed through `vitest.config.ts`'s `setupFiles`, never
a `*.test.ts` spec itself.

Never weaken a gate to get to green — not by loosening an assertion,
deleting a failing case, widening a suppression, or skipping a step. If a
gate is wrong, fix the gate and say so in the commit; if the code is wrong,
fix the code.

## 7. The post content manifest must verify, or the build must fail

`public/posts.asc` is a clearsigned manifest attesting to the built
`<article>` text of every published post — a different claim from signed
commits, which attest to source, not to what a reader's browser receives.
`public/posts/<slug>.txt` publishes that exact text for each post, byte for
byte, so a reader with no access to this repository can still re-derive and
check the hash: without it, re-deriving a hash would need the private
normalisation source and a local build, which only someone with repository
access has. `docs/post-manifest.md` has the normalisation, the file format,
and the regeneration and signing commands; this section states what that
document depends on.

The site does not build without a manifest that verifies, the same
invariant §4 states for the canary. `bun run manifest verify` runs after
`next build` in both `vercel.json`'s `buildCommand` and the `Dockerfile` —
after, not before like `verify-asc`, because the manifest hashes the built
`<article>` HTML, which does not exist until `next build` has produced it.
It fails the pipeline on any of, each a distinct state in
`lib/manifest/manifest-gate.ts` and a distinct exit code in
`lib/manifest/manifest-report.ts`:

- `public/posts.asc` absent (exit 32).
- Present but not a clearsigned PGP message (exit 16).
- Clearsigned, but not by the key `lib/canary/canary.ts` names, or the
  manifest's declared fingerprint disagreeing with that key, or the signed
  body not matching the signature (exit 8).
- The published post list is empty (exit 128) — nothing for the manifest or
  the per-post checks below to attest to, failed rather than passed
  vacuously.
- A published post's built hash differing from the manifest's entry for it
  (exit 1) — a stale manifest is exactly what "up to date" excludes.
- A published post with no entry in the manifest (exit 2).
- A manifest entry for a post `lib/blog/posts.ts` no longer publishes
  (exit 4).
- A published, manifested post's `public/posts/<slug>.txt` missing
  (exit 256).
- That file present but not byte-identical to the freshly built article
  text, or its own sha-256 disagreeing with the manifest's entry (exit 512)
  — the manifest can verify while this unsigned companion file has drifted
  from it, which is exactly what this check closes.
- A `public/posts/*.txt` file for a slug `lib/blog/posts.ts` no longer
  publishes (exit 1024).
- A published post's current digest with no archived revision at
  `public/posts/<slug>/<sha-256>.txt` (exit 2048) — a citation carrying that
  digest would resolve to nothing.
- An archived revision whose content no longer hashes to the digest its own
  file name claims (exit 4096). The archive is addressed by content, so this
  is the check that makes it worth citing; an archive nobody verifies is a
  promise rather than a record.

Exits 1, 2, 4, 256, 512, 2048, and 4096 combine bitwise when more than one
post or check drifts; 8, 16, 32, and 128 each replace the per-post checks entirely, since
nothing about post content can be trusted once the manifest itself does not
verify, or there is no post for it to verify; 64 means the verifier itself
failed, for example because the build output a published post needs is
missing.

These are `ManifestRunResult.exitCode` values, not the process's exit
status: a process exit status is one byte, so a value of 256 or above
reaches the command line as a status that cannot be told apart from another
one in that range by its number alone. `manifestProcessExitCode` in
`lib/manifest/manifest-report.ts` is the one place that maps the richer
value to what `process.exit` receives, keeping only the invariant that zero
stays zero and every other value still fails the command;
`cli/manifest.ts` calls it, never `process.exit` on the raw value. The
printed message is what still names the exact defect past that point.

`lib/manifest/manifest-policy.ts`'s `manifestEnforcementEnabled` is `true`
and is the one named place that decides this: `bun run manifest verify`
reads it as the default for its `--enforce` flag, so it is what makes the
deploy commands above fail on drift rather than only report it. Flipping
the constant back to `false` turns both of them back into a report-only
run; pass `--no-enforce` to report drift without failing a single
invocation, for diagnosis, which neither `vercel.json` nor the `Dockerfile`
does.

This is not duplicated in `just check`, `just quality`, or `just
exhaustive`. Those gates build the site (via `bun run test`, see §6) but
never run `verify-asc` either, so neither of this repository's two
signed-artifact invariants is re-checked there: the deploy command
sequences — `vercel.json`, the `Dockerfile`, and Vercel's own preview build
of a pull request — are where a built artifact's signature is the thing
under test, and `just`'s gates are where the source is. Leaving both
invariants out of `just` is the consistent choice; wiring one in without
the other would be the inconsistency.

Only the owner's YubiKey-backed key signs the manifest, the same
restriction §4 states for the canary: sign through `bun run manifest sign`
(`lib/manifest/manifest-sign.ts`), never by hand-running `gpg --clearsign`.
`manifest sign` combines generating the manifest and clearsigning it into
one run: it checks the card's fingerprint against the one
`lib/canary/canary.ts` names and refuses to sign on a mismatch, then
verifies the signed result against the published public key before writing
it. `--dry-run` prints the generated text without
reading the card. An agent asked to touch the manifest produces that
dry-run text and stops there; it never runs `manifest sign` without
`--dry-run`.

## 8. `knip` gates in default mode, not `--production`

The gate runs plain `knip`. That carries a known blind spot: a module
reachable only from a test counts as used, so a module whose last real
consumer was deleted stays green until someone reads for it.

`knip --production` closes that blind spot and is still the wrong gate
here. It excludes test files from the graph, so every export that exists
to be tested reads as unused — `parseInfo` and `parseBlockHeader` in
`lib/renew/monero.ts`, `zBase32` and `wkdHash` in `lib/publish/wkd.ts`
and `hashArticleText` in `lib/manifest/article-hash.ts` among them.
Adopting it means either deleting tested code or carrying a suppression
per export, and a gate read through a dozen suppressions is not read.

Its output is also wrong here. `lib/canary/renewal-reminder.ts` comes back as an
unused file while `scripts/canary-renewal-check.ts` imports it
statically and `scripts/*.ts!` is a declared production entry.

Closing the blind spot is a reading task, not a flag: when a module's
only importers are its own test and nothing else, delete it. Run
`knip --production` by hand when sweeping for dead code, and treat each
line as a question rather than a finding.

## 9. Dependency hygiene splits across two checkers, by defect class

Three ways `package.json` can go wrong each have a named owner. An
unused dependency and a phantom one (imported in source but never
declared) are `knip`'s job: its `include` list carries `dependencies`
and `unlisted`, and both fire today with a specific package name and,
for the phantom case, a file and line. Do not add a second tool for
either — a duplicate checker for an already-checked defect is machinery
that can disagree with the first one later, and the disagreement itself
becomes a thing to debug.

A soft-pinned version — `^1.2.3`, `~1.2.3`, `*`, an `x`/`X` wildcard
segment, a comparator (`>`, `<`, `>=`, `<=`), `||`, a hyphenated range,
or a bare dist-tag like `latest` — is nobody's job but
`scripts/check-pinned-deps.ts`, run as `bun run check-pinned-deps` and
wired into `bun run check`. Nothing else in the gate set inspects a
version string's shape: `tsc` and the build only care that an import
resolves, not what range let it resolve; `renovate-config-validator`
checks `renovate.json`'s own schema, not the ranges it would propose;
`bun install --frozen-lockfile` checks the lockfile against
`package.json`, not whether `package.json`'s strings are exact. A range
lets two installs of the same commit resolve a different version of the
same package, which is exactly what a lockfile-pinned, reproducible
build is supposed to prevent — the gate exists because nothing else in
this list closes that gap. The checker scans `dependencies`,
`devDependencies`, `optionalDependencies`, and `peerDependencies` only;
it never visits `engines` or `packageManager`, where a version string is
a tool-version constraint, not an installable package pin, and a range
there is a different decision this gate does not make.

A dependency whose only importer is a `*.test.ts` file is invisible to
`knip` for the same reason §8 gives for a module in general: vitest's
entry globs are part of knip's declared project graph, so a test-only
consumer reads as a real one. That blind spot applies to a dependency
exactly as it applies to a module — closing it is the same reading task
§8 names, not a new flag here either.

`eslint-plugin-unicorn` is held at the last release that accepts eslint 9,
which is a pin against a peer range rather than a soft version, so
`check-pinned-deps` passes it and nothing else reports it. Later releases
require eslint 10, and eslint 10 is itself held back by
[eslint-plugin-react#4022](https://github.com/jsx-eslint/eslint-plugin-react/issues/4022).
Taking the newer unicorn alone would mean an unsatisfied peer range, not a
working upgrade.

Holding it costs nothing measurable here: this repository never extends
unicorn's recommended config, so only the rules `eslint.config.mjs` names
are active, and every one of them exists in the pinned release. Confirm that
by counting the active unicorn rules rather than assuming it, since the cost
changes the moment a future config extends the recommended set. Both the pin
and the eslint 9 constraint lift together when that issue closes; neither
lifts alone.

This section is about `package.json`'s own content, not the files next
to it. Two adjacent gaps are known and deliberately unaddressed by
either checker: `bun install --frozen-lockfile`, the only command that
would catch `bun.lock` drifting from or being tampered against
`package.json`, runs in CI and at deploy time but in no `just` gate, so
a local `just check` or `just quality` pass does not confirm the
lockfile is honest. Separately, `mise.toml`'s `lockfile = true` setting
means a tool-version edit with no matching `mise.lock` update is
resolved and silently written back the next time a gated command
happens to invoke that tool, rather than rejected — no gate here passes
`--locked`. Neither gap is a soft, unused, or phantom dependency, so
fixing either is a separate decision, not an extension of this
section's two checkers.

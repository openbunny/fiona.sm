# The post content manifest

`public/posts.asc` is a clearsigned list of SHA-256 hashes, one per published
blog post, each paired with the post's slug. It closes a gap the repository's
signed-commit requirement does not: a signed commit attests to the source a
post was written from, not to the HTML a reader's browser receives.
Someone with hosting access could serve altered content while git history
stayed untouched. A reader who fetches the manifest, the public key, and the
live page, and reruns the hash themselves, can tell the two apart.

Re-deriving a hash from the live page needs the normalisation this document
defines and a local build, both of which require repository access that this
repository does not grant. `public/posts/<slug>.txt` closes that gap: it
publishes, for each published post, the exact string the manifest hashed —
byte for byte, with no extra framing. A reader with no access to this
repository fetches that file, hashes it with a standard tool, and compares
the digest against the manifest's line for that slug: see
`/blog/verify-posts`, step 3. The file itself is not signed; `bun run
manifest verify` is what checks it against the signed manifest and against a
fresh build, so a `.txt` file that drifted from either would fail the build,
not merely mislead a reader who trusted it on its own.

## What it attests, and what it does not

A matching hash means the article text a reader's browser received, after
the normalisation below, is byte-for-byte what was hashed when the manifest
was last generated and signed.

It does not attest to:

- markup, inline scripts, or styling inside the post, since none of that is
  hashed
- anything outside the post's `<article>` element: navigation, the masthead,
  the footer, citations and their back-links (`References` renders as a
  sibling of `<article>`, not inside it)
- source history; `git log` and commit signing already cover who wrote what
- a post published after the manifest was last generated and signed
- anything, for a reader who never fetches and checks the manifest. The
  signature proves nothing to someone who does not verify it.
- the moment of reading. A hash that matched when checked an hour ago says
  nothing about what is served now; the only way to know is to check again.

A manifest signed after its content changed proves only that the signer
attested to the content as it stood at signing time, not that the content
has been stable since.

## Normalisation, precisely

Both the generator (`bun run manifest generate`) and the verifier
(`bun run manifest verify`) call the same function,
`extractArticleText` in `lib/manifest/article-text.ts`, so neither can drift
from the other. Given a built page's full HTML:

1. Parse the HTML and find the page's `<article>` element. There must be
   exactly one; zero or more than one is an error, not a post to hash.
2. Within that element, drop `<script>`, `<style>`, and `<annotation>`
   elements (a MathML tag dropped defensively; no post renders one since the
   KaTeX-based maths module was removed), and drop any element
   carrying the `sr-only` class (visually hidden, screen-reader only) or
   `aria-hidden="true"` (hidden from assistive technology). The two classes
   of hidden content are dropped for one reason: neither is what the post
   says. `aria-hidden` here is a copy control's caption, a shell prompt
   glyph, a step number — chrome the page draws around the text. The text
   is published at `/posts/<slug>.txt` for a reader to compare against the
   post, so chrome in it reads as a discrepancy in the post.
3. Read the remaining text. At the boundary of each block-level element
   (`p`, `div`, `li`, `h1`–`h6`, `blockquote`, `pre`, `dt`, `dd`, `tr`,
   `caption`, `figcaption`, `table`, `ul`, `ol`, `section`, `header`,
   `footer`) insert a line break; everything else flows inline.
4. Collapse every run of whitespace, including a literal newline from the
   source, to one `U+0020` space, then trim each line.
5. Drop empty lines (left behind by a dropped element or by whitespace-only
   content), and join what remains with a single `\n`.
6. Unicode-normalise the result to NFC.
7. Encode as UTF-8 and hash with SHA-256. The manifest records the digest as
   64 lowercase hex characters.

A reader who wants to check one post by hand reads this list, or reads
`lib/manifest/article-text.ts` directly: the function is the normalisation,
not a description of it that could fall out of date.

## The manifest's format

One plain-text file, `public/posts.asc`, clearsigned in place. A short
lowercase header names the signing key's fingerprint and what the file
attests; the table below it lists one line per post, sorted by slug, as a
64-character hex digest, two spaces, and the slug — the same column
convention `sha256sum` uses. A worked example, truncated after the first
entry (`bun run manifest generate` writes the real file, one line per
published post, not this excerpt):

```text
post content manifest for fiona <mail@fiona.sm>
key fingerprint: 4820 fa93 8ba2 573d e08e 4fad 45b4 b546 0d72 a034

each line below pairs the sha-256 of one published post's normalised
article text with its slug. normalisation is defined in
docs/post-manifest.md and implemented in lib/manifest/article-text.ts:
re-deriving a hash needs the built html and that file, not this prose.

this file does not attest to markup, scripts, or styling; to anything
outside a post's <article> element; to git history (commit signing
already covers that); or to a post published after this file was
generated. a reader who never checks this file against the key above
gains nothing from its existence.

sha256                                                            slug
45cf59a16067a075eefbec46810bf7306cef7438e6997b52a15bb41332208976  canary-silence
...
```

`lib/manifest/manifest-text.ts` builds and parses this format;
`buildManifestText` and `parseManifestEntries`/`parseManifestFingerprint`
round-trip it exactly.

## Regenerating and signing

```sh
bun run build             # the generator hashes built output, not source
bun run manifest generate # writes public/posts/<slug>.txt, the exact text each hash covers
bun run manifest sign     # regenerates public/posts.asc and clearsigns it in one step
```

`bun run manifest generate` (`lib/manifest/manifest-generate.ts`) writes three
things from the same pass over the build output: the unsigned manifest text;
for every published post, its normalised article text to
`public/posts/<slug>.txt`; and the same text to the archive
`public/posts/<slug>/<sha-256>.txt`, which keeps an existing file and drops
archived revisions no signed manifest ever attested. Commit all three; the `.txt` files are public
artifacts exactly as `public/posts.asc` is, not build output excluded from
git.

`bun run manifest sign` (`lib/manifest/manifest-sign.ts`) mirrors
`bun run canary renew`: it hashes the current build, reads the signing key
from the OpenPGP card, checks that key's fingerprint against the one
`lib/canary/canary.ts` names and refuses to sign on a mismatch, clearsigns
the manifest, then verifies the result against the published public key
before touching disk, and only then writes `public/posts.asc`. Sign through this
command, not by hand: never run `gpg --clearsign` against the manifest, the
same rule §4 of `AGENTS.md` states for the canary. It does not write the
`.txt` files itself; run `bun run manifest generate` first so they exist
before `bun run manifest verify` checks them.

`--dry-run` on `manifest sign` prints the generated manifest text without
reading the card or signing anything, for inspecting the manifest or
exercising the command without a YubiKey; it does not write the `.txt` files
either.

The manifest carries no key identity of its own: it always signs with
whatever key `canary.fingerprint` currently names, so it has no `--rotate`
flag of its own. Rotating the signing key is done once, through
`bun run canary renew --rotate`, which updates `lib/canary/canary.ts`;
`manifest sign` then checks the card against whatever that file names next.

## Verifying

```sh
bun run manifest verify
```

Recomputes every published post's hash from the current build, compares it
against the signed manifest, and separately checks each post's committed
`public/posts/<slug>.txt` against both the fresh build and the manifest
entry, reporting distinct states — never collapsed into one:

| State                 | Meaning                                                               |
| --------------------- | --------------------------------------------------------------------- |
| `matching`            | the built hash and the manifest's hash agree                          |
| `differing`           | both exist for this slug, and disagree                                |
| `missingFromManifest` | the post is published; the manifest has no entry for it               |
| `orphanInManifest`    | the manifest has an entry; `lib/blog/posts.ts` no longer publishes it |

For every post with both a manifest entry and a built page, the article-text
file is checked independently of the state above — the signed manifest and
the committed `.txt` can agree with each other while the `.txt` itself has
drifted, since only the manifest is signed:

| Article text state | Meaning                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `ok`               | `public/posts/<slug>.txt` is byte-identical to the fresh build and hashes to the manifest entry |
| `missing`          | the post has a manifest entry and a built page, but no committed `.txt` file                    |
| `stale`            | the `.txt` file exists but fails either check above                                             |

A `.txt` file that exists for a slug `lib/blog/posts.ts` no longer publishes
is reported separately, as an orphaned article-text file, the `.txt`
counterpart to `orphanInManifest`.

Before any per-post comparison runs, the command checks the manifest itself
and can stop at one of four earlier states instead: the file is missing,
the file exists but is not a clearsigned PGP message, its signature does not
verify against `public/fiona.asc` (wrong signer, a tampered body, or a
declared key fingerprint that disagrees with `lib/canary/canary.ts`), or
`lib/blog/posts.ts` publishes no posts at all — all four reported
distinctly, not merged with each other or with a drift state. The empty
case fails rather than passing: a manifest and a `.txt` set with nothing to
attest to verify nothing.

`bun run manifest verify` exits with a bitwise combination of these codes,
defined in `lib/manifest/manifest-report.ts`:

| Code | State                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------- |
| 0    | clean: every post, every post's article text file, and every archived revision matches            |
| 1    | at least one post differs                                                                         |
| 2    | at least one published post is missing from the manifest                                          |
| 4    | at least one manifest entry is no longer published                                                |
| 8    | the signature does not verify against the expected key                                            |
| 16   | the manifest exists but is not signed                                                             |
| 32   | the manifest is missing entirely                                                                  |
| 64   | the verifier itself failed (for example, the build output a published post needs is missing)      |
| 128  | the published post list is empty                                                                  |
| 256  | at least one published, manifested post has no committed `.txt` file                              |
| 512  | at least one committed `.txt` file is stale against the build, the manifest, or both              |
| 1024 | a committed `.txt` file exists for a post that is no longer published                             |
| 2048 | a published post's current digest has no archived revision at `public/posts/<slug>/<sha-256>.txt` |
| 4096 | an archived revision does not hash to the digest in its own file name                             |
| 2048 | a published post's current digest has no archived revision at `public/posts/<slug>/<sha-256>.txt` |
| 4096 | an archived revision does not hash to the digest in its own file name                             |

Codes 1, 2, 4, 256, 512, 2048, and 4096 can combine (for example, 3 means both a
differing post and one missing from the manifest); 8, 16, 32, and 128 each
replace the per-post checks entirely, since nothing about post content can
be trusted once the manifest itself does not verify, or there is no post
for it to verify.

This table is `ManifestRunResult.exitCode`, read directly by anything that
imports `lib/manifest/manifest-run.ts`; it is not what the `verify`
subprocess exits with. A process's exit status is one byte, so 256 and
above cannot reach the command line as distinct numbers. `manifestProcessExitCode`
maps the table above to that one byte, keeping only the fact that zero means
clean and anything else means the run found a defect; `cli/manifest.ts`
passes every table value through it before calling `process.exit`, and
never exits on the raw value directly. A script that reads only the
command's numeric exit status sees 256 and 512 both as nonzero and nothing
more; read the printed message, or call `runManifestGate` directly, to tell
them apart.

## This is enforced

`bun run manifest verify` runs after `bun run build` in `bun run build:cloudflare` (against the exported site in `out/`), `vercel.json`'s `buildCommand`, and the `Dockerfile` — after, not before
like `verify-asc`, because the manifest hashes the built `<article>` HTML,
which the build has to produce first. `lib/manifest/manifest-policy.ts`'s
`manifestEnforcementEnabled` is `true`, the single named place that decides
whether drift fails the run, and `bun run manifest verify` reads it as the
default for its `--enforce` flag: no deployment command passes `--enforce`
explicitly, so flipping the constant back to `false` would turn all of
them back into a report-only run. This sits alongside, and does not
replace, the canary's own hard invariant in `lib/canary/canary.ts` and
`scripts/verify-asc.ts`: the site refuses to build without a signed canary
statement exactly as before, and now also refuses to build without a
manifest whose signature verifies and whose hashes match.

Pass `--no-enforce` to report drift without failing a single invocation,
for diagnosis; none of the deployment commands does.

### What had to hold before enforcement could gate a deploy

Wiring `bun run manifest verify` into each deployment build
required confirming one precondition first, mirroring how `verify-asc` was
wired in deliberately rather than by default: rebuilding unchanged source
must reproduce byte-identical normalised article text on every build.

The manifest hashes the article element alone rather than the page because
the raw page HTML can differ between clean builds in content outside
`<article>` (for example, bundler chunk hashes). Two clean builds of the
same source must produce identical normalised text for every post. If a future change to how posts render ever makes two
clean builds of the same source disagree on a post's normalised text,
enforcing on that is not safe: it would fail a deploy for no content reason
and teach the owner to ignore the gate. Re-run the two-build comparison
after a change to `lib/manifest/article-text.ts` or to how a post's
`<article>` is composed, and confirm it still holds.

The owner's signing key lives on a YubiKey and needs a physical touch, which
an agent never triggers; only a human can produce or refresh a signature.
The enforcement model this implies is: the owner signs the manifest locally,
on their own machine, and commits the result; CI and the build only ever
verify what is already committed, never sign. That model holds only if the
owner's local build and CI's build agree on every post's normalised text —
the same precondition as above, since `bun run manifest sign` and
`bun run manifest verify` both read `.next/server/app/blog/*.html`, produced
by the same `next build` either machine runs from the same committed
source. The same precondition is what lets `bun run manifest verify` compare
the committed `public/posts/<slug>.txt` against CI's own fresh build
byte-for-byte rather than only by hash: it is the owner's local build, not
CI's, that produces the committed `.txt` file, and the two are only
guaranteed to agree because both come from the same `next build` run against
the same committed source.

## Tests

`lib/manifest/*.test.ts` covers the normalisation (whitespace collapsing,
annotation and `sr-only` stripping, NFC, the one-`<article>` requirement),
the four drift states, the three article-text states (`ok`, `missing`,
`stale`, the last covering both a byte mismatch against a fresh build and a
hash mismatch against the manifest), an orphaned `.txt` file, and the
empty-post-set failure. There is no real signature to test against only
the owner can produce one — so the signature tests generate an ephemeral
OpenPGP key at test time, sign a fixture manifest with it, and verify
against that, following the precedent in `lib/openpgp-armor.test.ts`.
Covered: a valid signature, a signature by a key that never signed the
manifest, a body altered after signing, and a manifest that never attempted
a signature at all.
`lib/manifest/manifest-run.test.ts` calls both the enforcing and the
report-only path directly against fixtures, and asserts
`manifestEnforcementEnabled` is `true`.
`tests/unit/post-manifest.build-output.test.ts` runs the whole pipeline
against this repository's real build output, requiring `bun run build` to
have run first, the same convention the no-JS content tests use.

## Citing a post

`components/blog/cite-block.tsx` prints a plain and a BibTeX citation for
each post, both carrying the post's sha-256 and the date the manifest
holding it was signed. A citation to this site therefore states what the
post said, not only where it lives: a reader resolves the digest against
`/posts/<slug>.txt` and `/posts.asc` by the steps under Verifying above.

The digest attests the text as the manifest had it on the date printed
beside it, and nothing more. Revising a post changes its digest, so a
citation carrying an older one stops resolving, and the reader comparing it
learns the post was revised after that date. That is the intended outcome,
and the reason the date is printed with the digest rather than the digest
alone.

Every revision stays published. `bun run manifest generate` writes each
post's text twice: to `public/posts/<slug>.txt`, which always holds the
current revision, and to `public/posts/<slug>/<sha-256>.txt`, named by the
digest of its own content. A citation therefore keeps resolving after the
post is revised: the reader fetches the archived file its digest names and
hashes it.

That archive needs no signature to be trustworthy for what it claims. The
file name is the digest, so a reader who fetches
`/posts/<slug>/<digest>.txt` and finds it hashes to `<digest>` has the exact
bytes the citation referred to, whoever served them. The signature on
`public/posts.asc` is a separate claim, about the current revision, and the
manifest attests only that one. Proving that this site once attested a
superseded digest needs the signed manifest from that time, which this
repository keeps in git history and does not publish.

`bun run manifest verify` fails when a published post's current digest has
no archived file (exit 2048), and when any archived file no longer hashes to
the digest its own name claims (exit 4096). The second is the check that
makes the archive worth citing: an archive nobody verifies is a promise, not
a record.

Archived revisions are served `immutable` with a one-year lifetime, as are
the content-addressed images under `/img/`. These are the only route headers
rules exempt from `must-revalidate`, because each URL names the digest of
what it returns and so can never correctly return anything else.
`lib/site/route-headers.test.ts` pins that exemption to the content-
addressed routes.

`lib/site/metadata.ts`'s `citationMetadata` emits the Highwire
(`citation_*`) and Dublin Core (`DC.*`) `<meta>` tags that reference
managers read. They are plain meta tags rather than JSON-LD because this
site serves no `application/ld+json`, which `e2e/identity.spec.ts` and
`app/not-found.test.tsx` both assert.

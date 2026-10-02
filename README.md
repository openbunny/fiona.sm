# fiona.sm

[![renew by 29 december 2026](https://img.shields.io/badge/renew%20by-29%20december%202026-000000)](https://fiona.sm/canary.asc)

personal site for fiona, with a blog and a pgp key canary at `/canary`.

the badge and the proof-of-date section below are rewritten by
`bun run canary renew`; edit them there, not by hand.

## shared libraries

the site consumes published `@openbunny/theme` tokens, self-hosted fonts, and
`@openbunny/react` components. `package.json` pins both packages; `bun.lock`
pins their resolved files. tailwind scans the component package through the
`@source` entry in `app/globals.css`.

site adapters keep lowercase copy, dates, and clipboard analytics local.
command blocks use the shared components with those adapters. the theme supplies
woff fonts for social images and woff2 fonts for browsers. artwork and print
rules stay in the site.

## what to verify

the live document is the clearsigned statement at `https://fiona.sm/canary.asc`,
not the rendered page.

```bash
curl -fsSO https://fiona.sm/fiona.asc
curl -fsSO https://fiona.sm/canary.asc
gpg --import fiona.asc
gpg --verify canary.asc
```

the fingerprint is `4820 FA93 8BA2 573D E08E  4FAD 45B4 B546 0D72 A034`. compare
it against an independent source. the good signature is the cryptography; the
warning about trust is expected and correct.

or locate the key by email:

```bash
gpg --locate-keys mail@fiona.sm
```

### Check the proof of date

the last line of the statement names a Monero block and its hash:

```text
Proof of date: Monero block 3773944
c09507ace9368fe976addaedcd30680b736f66d6e70fbe9c652d789d06c45a96
```

that block did not exist until it was mined, so the pairing puts a floor under
the signing time: the statement cannot have been written before that block. the
number is the height of the top block itself, **not** the chain height a daemon
reports in its `height` field -- chain height is one greater, and quoting it
names a block nobody had mined yet. ask any public Monero node whether that
height carries that hash:

```bash
curl --max-time 20 -s https://xmr-node.cakewallet.com:18081/json_rpc \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":"0","method":"get_block_header_by_height","params":{"height":3773944}}'
```

in the reply, `result.block_header.hash` must equal the hash in the statement,
and `result.block_header.timestamp` (Unix seconds, UTC) must fall at or before
the signing instant the statement stamps. a block explorer answers the same
question in a browser: <https://xmrchain.net/block/3773944>.

Substitute the height and hash from the statement you fetched.

## running it

```bash
bun install
bun dev
```

`bun dev` serves `https://localhost:3000` with a self-signed certificate.
production TLS is Vercel's.

`bun run verify-asc` checks the published key and statement against the
fingerprint pinned in `lib/canary/canary.ts`. it runs before the production
build, so a build that cannot verify the canary does not ship.

renew the statement with the YubiKey:

```bash
bun run canary renew
```

the merge bar is `just quality`. `just check` is its offline, pre-push subset:
`bun run check` — formatting, lint, types, docs, spelling, dead code and the
test suite, which builds first because the build-output tests assert the
production `.next/` output — plus a Renovate config check and semgrep.
`just quality` adds a lockfile dependency scan and a gitleaks history scan.
`just exhaustive` adds the Playwright suite on top of `just quality`, and is
not required to merge. `just actions-check` gates the workflow files.
`mise trust && mise install` provisions the pinned tools
those gates call and writes `mise.lock`.

`just semgrep` runs the comment and voice rules. `just check` runs it too.

enable the hooks in a fresh clone:

```bash
git config core.hooksPath .githooks
```

## reporting

for anything sensitive, key compromise, duress or a vulnerability, email
`mail@fiona.sm`. the public route is `https://fiona.sm/security-policy.txt`.

## contributing

this repository follows the [openbunny organisation
defaults](https://github.com/openbunny/.github): contribution, code of
conduct, security and support policies, plus the DCO check on pull requests.
`just check` is the offline gate; `just quality` is what CI runs, and adds the
dependency and history scans.

two invariants gate the build, and a change that reaches either needs the
owner's signing key rather than a code fix. `verify-asc` fails the build when
the published statement does not verify against `lib/canary/canary.ts`, and
`manifest verify` fails it when the built post text disagrees with the signed
manifest. both are signed artifacts: regenerating either needs a signature from
the key on the YubiKey, so a pull request that changes site content or a
published post cannot go green on its own. that is the design, not a broken
gate.

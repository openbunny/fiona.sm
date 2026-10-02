# Deployment

## Docker build

Build from the repository root with the commit hash and committer date from the same checkout:

```sh
docker build --build-arg COMMIT_SHA="$(git rev-parse HEAD)" \
  --build-arg COMMIT_DATE="$(git log -1 --format=%cI HEAD)" .
```

The build needs the date because the Docker context does not carry Git history.

The site deploys to Vercel from this repository's root. `main` is production.

## What is declared here

`vercel.json` holds everything Vercel reads from the tree:

| Key              | Why it is there                                                                                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `framework`      | `nextjs`, declared rather than auto-detected, so a detection change is inert                                                                                                                                   |
| `installCommand` | `bun install --frozen-lockfile --ignore-scripts`: a lockfile disagreeing with `package.json` fails the build instead of resolving around it, and no dependency's install script runs on Vercel's build machine |
| `buildCommand`   | Runs `bun run`; the Bun version is pinned by `packageManager`, which Vercel honours                                                                                                                            |

The build runs `verify-asc` before `next build`. That command checks the
published key and clearsigned statement against the fingerprint in
`lib/canary/canary.ts`. A build that cannot verify the canary must not ship,
so it runs before the build rather than as a separate gate.

## What cannot be declared, and is therefore recorded here

Vercel reads `vercel.json` only after it knows which repository and directory
to read it from. The repository link and the root directory are project
settings, set through the API or the dashboard.

| Setting        | Value                                         |
| -------------- | --------------------------------------------- |
| Project ID     | the project's own, from the Vercel dashboard  |
| Team ID        | the owning account's, from the same dashboard |
| Repository     | the repository this site is built from        |
| Root directory | the repository root                           |
| Production URL | the production domain                         |

The project ID and team ID are per-account identifiers and are deliberately
not recorded here. Read both from the Vercel dashboard, or from
`vercel project ls` and `vercel teams ls` when authenticated. Substitute them
into the commands below as `$PROJECT_ID` and `$TEAM_ID`.

The project has no OpenTofu `vercel_project` resource. The `vercel/vercel`
provider's `name` validator matches `^[a-z0-9-]{1,52}$` and rejects a dotted
project name on every plan — including a plan of an already-imported resource,
since the validator runs against the refreshed value whether or not it changed.
So relinking the repository or changing the root directory is a direct API
call.

A project that already has a repository linked rejects a second `link` call
with HTTP 400 `cant_link_project`. Remove the existing link first:

```sh
# DELETE takes no body. A body on DELETE, or the request going out over
# HTTP/2, both fail with a PROTOCOL_ERROR -- force HTTP/1.1.
curl -X DELETE --http1.1 -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/link?teamId=$TEAM_ID"
```

`POST .../unlink` on both `v9` and `v4` answers 404; `DELETE .../link` is the
only endpoint that removes a link. Then link the repository and set the root
directory:

```sh
# link the repository (the full owner/name slug is required; a bare name fails)
curl -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"github\",\"repo\":\"$GITHUB_REPO\"}" \
  "https://api.vercel.com/v9/projects/$PROJECT_ID/link?teamId=$TEAM_ID"

# build from the repository root
curl -X PATCH -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rootDirectory":null,"framework":"nextjs"}' \
  "https://api.vercel.com/v9/projects/$PROJECT_ID?teamId=$TEAM_ID"
```

`GITHUB_REPO` is the `owner/name` slug, in the form both the shell and the
JSON body accept.

The Vercel GitHub App must have access to this repository before the link
call succeeds. A private repository added after the App was installed with
"only select repositories" is not covered until it is granted.

The production domains are attached to the same project ID, so moving the
repository link changes no DNS record and drops no certificate.

## Deployment protection

Vercel Authentication is on for preview deployments. A per-deployment URL
therefore answers with a login page to anyone without a team session, which
is why an unauthenticated `curl` of one returns Vercel's login rather than
the site. Production aliases are not affected.

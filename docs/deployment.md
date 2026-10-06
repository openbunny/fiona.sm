# Deployment

[Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/) serves the Next.js static export from `out/`. The build verifies the canary before rendering and the signed post manifest against exported articles after rendering. An invalid or stale signature stops deployment.

## Local commands

```sh
bun install --frozen-lockfile --ignore-scripts
just cloudflare-build
bun run start
```

`bun run start` serves the export through local Wrangler. `just bun-e2e` builds and tests that server. `just cloudflare-deploy` builds and deploys after Wrangler authentication. The owner checklist is [cloudflare-todo.md](cloudflare-todo.md).

## Workers Builds

Connect this repository with `main` as production and the repository root as the build directory. Set the build command to `bun install --frozen-lockfile --ignore-scripts && bun run build:cloudflare` and the deploy command to `wrangler deploy`. Leave preview deployments disabled while `workers_dev` and `preview_urls` are false in `wrangler.jsonc`. Set `BUN_VERSION` to the version in `packageManager` and `SKIP_DEPENDENCY_INSTALL=1` to prevent an automatic install before the pinned command. See [build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) and [build image variables](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/). Keep the build output `out/` as the asset directory in `wrangler.jsonc`.

Workers Builds supplies `WORKERS_CI_COMMIT_SHA` to the page footer. Local builds read the checked-out commit. The build writes `_headers` from the route policy and copies `_redirects` from `public/`. The header generator enumerates published files for route-specific caching; its default rule keeps missing signed archives revalidating.

[Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/get-started/) uses automatic edge injection after the site is registered. The export contains no analytics script tag. The production CSP permits only Cloudflare's beacon script; beacon reports use the same-origin `/cdn-cgi/rum` endpoint. Local Wrangler does not inject it, so verify the script, its integrity attribute, and the reporting request on the public site after activation.

The canonical address is `https://fiona.sm`; `www.fiona.sm` redirects to it. The Worker custom domain is declared in `wrangler.jsonc`, and Cloudflare DNS holds the site and Proton mail records. The registrar's nameservers determine when Cloudflare becomes authoritative. Keep `workers_dev` and `preview_urls` disabled. The cutover steps and verification commands are in [cloudflare-todo.md](cloudflare-todo.md).

`vercel.json` remains available during cutover. A Vercel build uses its original Next.js deployment path when `VERCEL` is set. The Dockerfile uses `NEXT_OUTPUT=standalone` and retains its signed-artifact checks.

## Docker build

Build from the repository root with the commit hash and committer date from the same checkout:

```sh
docker build --build-arg COMMIT_SHA="$(git rev-parse HEAD)" \
  --build-arg COMMIT_DATE="$(git log -1 --format=%cI HEAD)" .
```

The Docker context excludes Git history. The build receives the date explicitly.

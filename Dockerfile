# syntax=docker/dockerfile:1.27

FROM oven/bun:1.4.2 AS deps
WORKDIR /app

COPY package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

FROM deps AS builder

COPY . .

ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA

RUN bun run verify-asc
RUN bun run build
RUN bun run manifest verify

FROM oven/bun:1.4.2-slim AS runner
WORKDIR /app

COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static
COPY --from=builder --chown=bun:bun /app/public ./public

USER bun

ENV NODE_ENV=production

EXPOSE 3000
CMD ["bun", "server.js"]

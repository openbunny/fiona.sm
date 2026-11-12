# syntax=docker/dockerfile:1.28

FROM oven/bun:1.4.4 AS deps
WORKDIR /app

COPY package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

FROM deps AS builder

ENV NEXT_OUTPUT=standalone
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

ARG COMMIT_SHA
ENV COMMIT_SHA=$COMMIT_SHA
ARG COMMIT_DATE
ENV COMMIT_DATE=$COMMIT_DATE

RUN bun run verify-asc
RUN bun run build
RUN bun run manifest verify

FROM oven/bun:1.4.4-slim AS runner
WORKDIR /app

COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static
COPY --from=builder --chown=bun:bun /app/public ./public

USER bun

ENV NODE_ENV=production

EXPOSE 3000
CMD ["bun", "server.js"]

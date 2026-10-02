import path from "node:path"
import { defineConfig } from "vitest/config"

const alias = {
  "@": path.resolve(import.meta.dirname),
}

const setupFiles = ["./test/node-realm-globals.ts", "./test/setup.ts"]
const buildOutputTests = "tests/unit/*.build-output.test.ts"

const commonExclude = [
  "**/node_modules/**",
  "**/.git/**",
  "**/*.config.{ts,mts,mjs,js}", // nosemgrep
  "vitest.setup.ts",
  ".next/**",
  "coverage/**",
  "next-env.d.ts",
  "**/*.d.ts", // nosemgrep
  "e2e/**",
  ".claude/worktrees/**",
]

export default defineConfig({
  resolve: { alias },
  test: {
    globals: false,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "html", "lcov"],
      include: [
        "app/**/*.{ts,tsx}", // nosemgrep
        "cli/**/*.ts", // nosemgrep
        "components/**/*.{ts,tsx}", // nosemgrep
        "lib/**/*.{ts,tsx}", // nosemgrep
        "scripts/**/*.ts", // nosemgrep
      ],
      exclude: [
        ...commonExclude,
        "scripts/verify-asc.ts",
        "scripts/build-favicons.ts",
        "scripts/canary-renewal-check.ts",
        "scripts/check-pinned-deps.ts",
        "app/layout.tsx",
        "app/fonts.ts",
      ],
      thresholds: {
        statements: 93,
        branches: 85,
        functions: 94,
        lines: 93,
      },
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          globals: false,
          include: ["**/*.{test,spec}.{ts,tsx}"], // nosemgrep
          exclude: [...commonExclude, buildOutputTests],
          restoreMocks: true,
          setupFiles,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "build-output",
          environment: "node",
          globals: false,
          include: [buildOutputTests],
          exclude: commonExclude,
          restoreMocks: true,
          setupFiles,
        },
      },
    ],
  },
})

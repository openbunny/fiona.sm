import { readFileSync } from "node:fs"
import { join } from "node:path"

import { defineConfig, globalIgnores } from "eslint/config"
import tseslint from "typescript-eslint"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import vitest from "@vitest/eslint-plugin"
import checkFile from "eslint-plugin-check-file"
import compat from "eslint-plugin-compat"
import playwright from "eslint-plugin-playwright"
import promise from "eslint-plugin-promise"
import regexp from "eslint-plugin-regexp"
import security from "eslint-plugin-security"
import unicorn from "eslint-plugin-unicorn"
import unusedImports from "eslint-plugin-unused-imports"
import globals from "globals"

const localPlugin = {
  meta: { name: "local" },
  rules: {
    "no-blanket-eslint-disable": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Disallow eslint-disable directives without specific rules and reasons",
        },
        schema: [],
        messages: {
          blanket:
            "Blanket '{{directive}}' disables every rule. Name one rule and provide a reason: '{{directive}} rule-name -- reason'",
          noReason:
            "'{{directive}} {{rule}}' needs a reason. Add one after '--': '{{directive}} {{rule}} -- reason'",
        },
      },
      create(context) {
        const directives = new Set([
          "eslint-disable",
          "eslint-disable-line",
          "eslint-disable-next-line",
        ])
        return {
          Program() {
            for (const comment of context.sourceCode.getAllComments()) {
              const parts = comment.value.trim().split(/\s+/u)
              const [directive, ...rest] = parts
              if (directive === undefined || !directives.has(directive)) {
                continue
              }
              const remainder = rest.join(" ")
              if (remainder === "") {
                context.report({
                  node: comment,
                  messageId: "blanket",
                  data: { directive },
                })
              } else if (!remainder.includes("--")) {
                context.report({
                  node: comment,
                  messageId: "blanket",
                  data: { directive },
                })
              } else {
                const [rule, ...reasonParts] = remainder.split(" -- ")
                const reason = reasonParts.join(" -- ").trim()
                if (reason === "") {
                  context.report({
                    node: comment,
                    messageId: "noReason",
                    data: { directive, rule },
                  })
                }
              }
            }
          },
        }
      },
    },
  },
}

function withoutDuplicateTsPlugin(configs) {
  return configs.map((entry) => {
    if (!entry?.plugins || !("@typescript-eslint" in entry.plugins)) {
      return entry
    }
    const { "@typescript-eslint": _duplicate, ...plugins } = entry.plugins
    const next = { ...entry }
    if (Object.keys(plugins).length > 0) {
      next.plugins = plugins
    } else {
      delete next.plugins
    }
    return next
  })
}

function readBrowserslistTargets(projectRoot) {
  const manifest = JSON.parse(
    readFileSync(join(projectRoot, "package.json"), "utf8")
  )
  const targets = manifest.browserslist

  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error(
      `${projectRoot}/package.json declares no non-empty \`browserslist\` array. eslint-plugin-compat would then check every file against an empty browser set and pass without having checked anything. Declare the browser support targets in that package.json.`
    )
  }

  for (const target of targets) {
    if (typeof target !== "string" || target.trim() === "") {
      throw new Error(
        `eslint.config.mjs: package.json \`browserslist\` contains an empty or non-string entry (${JSON.stringify(target)}). Every entry must be a browserslist query string.`
      )
    }
  }

  return targets
}

const browserslistTargets = readBrowserslistTargets(import.meta.dirname)

export default defineConfig([
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
    },
  },

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "node_modules/**",
    "next-env.d.ts",
    "**/*.tsbuildinfo",
    ".claude/worktrees/**",
  ]),

  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    plugins: { local: localPlugin },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-expect-error": true,
          "ts-check": false,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-exports": "error",
      "local/no-blanket-eslint-disable": "error",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { local: localPlugin },
    rules: {
      "local/no-blanket-eslint-disable": "error",
    },
  },

  promise.configs["flat/recommended"],
  regexp.configs["flat/recommended"],
  security.configs.recommended,
  compat.configs["flat/recommended"],

  {
    files: ["**/*.{ts,tsx,mts,cts,js,mjs,cjs}"],
    plugins: { "unused-imports": unusedImports },
    rules: {
      "no-console": ["error", { allow: ["error", "warn"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "no-var": "error",
      "prefer-const": "error",
      "no-empty": "error",
      "no-useless-catch": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],

      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          vars: "all",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
    },
  },

  ...withoutDuplicateTsPlugin(nextVitals),
  ...withoutDuplicateTsPlugin(nextTs),

  {
    settings: {
      browsers: browserslistTargets,
    },
  },

  {
    files: ["**/*.{ts,tsx,mts,cts,js,mjs,cjs}"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        {
          "app/**/*.{ts,tsx}": "KEBAB_CASE",
          "components/**/*.{ts,tsx}": "KEBAB_CASE",
          "lib/**/*.{ts,tsx}": "KEBAB_CASE",
          "hooks/**/*.{ts,tsx}": "KEBAB_CASE",
          "scripts/**/*.ts": "KEBAB_CASE",
          "tests/**/*.{ts,tsx}": "KEBAB_CASE",
          "e2e/**/*.ts": "KEBAB_CASE",
        },
        { ignoreMiddleExtensions: true },
      ],
      "check-file/folder-naming-convention": [
        "error",
        {
          "app/**/": "NEXT_JS_APP_ROUTER_CASE",
          "components/**/": "KEBAB_CASE",
          "lib/**/": "KEBAB_CASE",
          "hooks/**/": "KEBAB_CASE",
          "scripts/**/": "KEBAB_CASE",
          "tests/**/": "KEBAB_CASE",
          "e2e/**/": "KEBAB_CASE",
        },
      ],
    },
  },

  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "tests/**/*.{ts,tsx}",
      "e2e/**/*.{ts,tsx}",
    ],
    rules: {
      "compat/compat": "off",
      "@typescript-eslint/no-empty-function": "off",
    },
  },

  {
    files: ["scripts/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "no-console": "off",
      "compat/compat": "off",
      "security/detect-object-injection": "off",
      "security/detect-non-literal-fs-filename": "off",
    },
  },
  {
    files: ["*.{js,mjs,cjs,ts}", "**/*.config.{js,mjs,cjs,ts}"],
    rules: {
      "compat/compat": "off",
      "import/no-anonymous-default-export": "off",
    },
  },

  {
    files: ["tests/**/*.{ts,tsx}", "vitest.setup.ts"],
    rules: {
      "security/detect-object-injection": "off",
      "security/detect-non-literal-regexp": "off",
      "security/detect-non-literal-fs-filename": "off",
    },
  },
  {
    files: ["tests/unit/**/*.{ts,tsx}", "vitest.setup.ts"],
    plugins: { vitest },
    extends: [vitest.configs.recommended],
    languageOptions: {
      globals: { ...vitest.environments.env.globals, ...globals.node },
    },
    rules: {
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "error",
      "vitest/warn-todo": "error",
      "vitest/expect-expect": "error",
      "vitest/no-identical-title": "error",
      "vitest/valid-expect": ["error", { maxArgs: 2 }],
      "compat/compat": "off",
    },
  },
  {
    files: ["e2e/**/*.ts", "playwright.config.ts"],
    extends: [playwright.configs["flat/recommended"]],
    rules: {
      "playwright/no-focused-test": "error",
      "playwright/no-skipped-test": "error",
      "playwright/no-conditional-in-test": "error",
      "playwright/expect-expect": "error",
      "compat/compat": "off",
    },
  },

  {
    plugins: {
      unicorn,
    },
    rules: {
      "unicorn/prefer-node-protocol": "error",
      "unicorn/throw-new-error": "error",
      "unicorn/prefer-includes": "error",
      "unicorn/prefer-string-replace-all": "error",
      "unicorn/no-useless-fallback-in-spread": "error",
      "unicorn/filename-case": [
        "error",
        {
          case: "kebabCase",
          ignore: [
            "README.md",
            "SECURITY.md",
            "TODO",
            "PULL_REQUEST_TEMPLATE.md",
            "LICENSE",
            "CODEOWNERS",
            "CODE_OF_CONDUCT.md",
          ],
        },
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "import",
          format: ["camelCase", "PascalCase"],
        },
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
        },
        {
          selector: "variable",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        {
          selector: "parameter",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          selector: "objectLiteralProperty",
          format: null,
        },
        {
          selector: "typeProperty",
          format: ["camelCase", "PascalCase"],
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "no-console": ["error", { allow: ["error"] }],
      eqeqeq: ["error", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
    },
  },
  {
    files: ["cli/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    files: ["lib/renew/gpg-card.ts"],
    rules: {
      "@typescript-eslint/no-empty-function": "off",
    },
  },

  {
    files: ["app/global-error.tsx"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  {
    files: ["eslint.config.mjs"],
    rules: {
      "@typescript-eslint/naming-convention": "off",
    },
  },

  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/array-type": "off",
    },
  },
])

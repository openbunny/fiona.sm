export default {
  "*.{ts,tsx}": ["prettier --write", "eslint --fix --max-warnings=0"],
  "*.{js,mjs,cjs,json,jsonc,yml,yaml,css,html}": ["prettier --write"],
  "*.md": [
    "prettier --write",
    "markdownlint-cli2 --config .markdownlint-cli2.jsonc --fix",
  ],
}

export default {
  extends: "stylelint-config-standard",
  rules: {
    "at-rule-no-unknown": [
      true,
      { ignoreAtRules: ["theme", "source", "custom-variant"] },
    ],
    "at-rule-prelude-no-invalid": [true, { ignoreAtRules: ["apply"] }],
    "no-invalid-position-at-import-rule": null,
    "import-notation": "string",
  },
}

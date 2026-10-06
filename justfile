set shell := ["bash", "-uc"]

export PATH := `mise bin-paths 2>/dev/null | tr '\n' ':'` + env('PATH')

check_gates := "bun spelling renovate semgrep"
quality_gates := "bun spelling renovate semgrep osv secrets-history"
exhaustive_gates := "bun spelling renovate semgrep osv secrets-history bun-e2e"

_default:
    @just --list

# The pre-push loop: offline, deterministic, and everything in it can fail.
check: (_all check_gates)

# The merge gate: adds the history scan and the dependency scan.
quality: (_all quality_gates)

# quality + the end-to-end browser suite. Not a merge gate.
exhaustive: (_all exhaustive_gates)

# No runner here continues past a failing gate and reports every failure together.
_all +gates:
    #!/usr/bin/env bash
    set -uo pipefail
    failed=""
    for gate in {{ gates }}; do
        printf '\n\033[1m━━━ just %s\033[0m\n' "$gate"
        just "$gate" || failed="$failed $gate"
    done
    if [ -n "$failed" ]; then
        printf '\n\033[1;31mFAILED:\033[0m%s\n' "$failed" >&2
        exit 1
    fi
    printf '\n\033[1;32mall gates passed:\033[0m %s\n' "{{ gates }}"

# package.json: prettier, eslint, tsc, markdownlint, cspell, ec, taplo, knip, vitest, stylelint, html-validate, check-pinned-deps.
bun:
    bun run check

# typos.toml is this repo's own config; cspell is a separate wider check inside `bun`.
spelling:
    typos

# Validates renovate.json's schema only; no gate checks managerFilePatterns against tracked files.
renovate:
    renovate-config-validator --strict --no-global renovate.json

semgrep:
    #!/usr/bin/env bash
    set -uo pipefail
    mapfile -t configs < <(git ls-files '.semgrep*.yml')
    if ((${#configs[@]} == 0)); then
        printf 'semgrep matched no .semgrep*.yml config.\n' >&2
        exit 1
    fi
    failed=""
    for config in "${configs[@]}"; do
        semgrep scan --config "$config" --error --quiet --metrics=off . || failed="$failed $config"
    done
    if [ -n "$failed" ]; then
        printf 'semgrep failed for:%s\n' "$failed" >&2
        exit 1
    fi

osv:
    osv-scanner scan source --lockfile=bun.lock

# Cost scales with history, not the tree, hence `quality` not `check`.
secrets-history:
    gitleaks git . \
        --gitleaks-ignore-path /dev/null \
        --ignore-gitleaks-allow \
        --log-opts=--all \
        --redact \
        --no-banner \
        --exit-code 1

# playwright exits non-zero on zero spec files, so no target guard is needed.
bun-e2e:
    bun run test:e2e

cloudflare-build:
    bun run build:cloudflare

cloudflare-deploy:
    bun run deploy

actions_gates := "actions-target actions-lint actions-pin actions-audit actions-events actions-check-selftest"

actions-check: (_all actions_gates)

actions-target:
    test -n "$(git ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml')"

actions-lint:
    test -n "$(git ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml')"
    actionlint $(git ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml')

# Offline: a full 40-character SHA and a matching version comment, no API call.
actions-pin:
    test -n "$(git ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml')"
    pinact run --no-api --fix=false $(git ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml')

# Needs network: verifies every version comment against its real GitHub tag.
actions-pin-verify:
    test -n "$(git ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml')"
    pinact run --verify-comment --fix=false $(git ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml')

# Pedantic persona also catches a broad workflow permission the default misses.
actions-audit:
    test -n "$(git ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml')"
    zizmor --offline --persona=pedantic $(git ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml')

# -n validates structure only: it never pulls the image or runs a step.
actions-events:
    test -n "$(git ls-files '.github/workflows/*.yml' '.github/workflows/*.yaml')"
    act pull_request -n --eventpath .github/events/pull_request.json -W .github/workflows -P ubuntu-24.04=catthehacker/ubuntu:act-24.04 --quiet
    act push -n --eventpath .github/events/push.json -W .github/workflows -P ubuntu-24.04=catthehacker/ubuntu:act-24.04 --quiet
    act merge_group -n --eventpath .github/events/merge_group.json -W .github/workflows -P ubuntu-24.04=catthehacker/ubuntu:act-24.04 --quiet
    act workflow_dispatch -n --eventpath .github/events/workflow_dispatch.json -W .github/workflows -P ubuntu-24.04=catthehacker/ubuntu:act-24.04 --quiet

# No check here stops at its own failure: proves actionlint, pinact and zizmor each catch their violation.
actions-check-selftest:
    #!/usr/bin/env bash
    set -uo pipefail
    fixtures=.github/events/fixtures
    fail=0
    actionlint "$fixtures/good.yml" || { printf 'actionlint rejected the clean fixture\n' >&2; fail=1; }
    pinact run --no-api --fix=false "$fixtures/good.yml" || { printf 'pinact rejected the clean fixture\n' >&2; fail=1; }
    zizmor --offline --persona=pedantic "$fixtures/good.yml" || { printf 'zizmor rejected the clean fixture\n' >&2; fail=1; }
    # nosemgrep: justfile-comment-not-kept -- bad-false-comment.yml is not asserted here: catching a false version comment needs --verify-comment, hence network, hence actions-pin-verify.
    actionlint "$fixtures/bad-unsafe-expression.yml" >/dev/null 2>&1 && { printf 'actionlint passed an untrusted inline expression\n' >&2; fail=1; }
    pinact run --no-api --fix=false "$fixtures/bad-unpinned.yml" >/dev/null 2>&1 && { printf 'pinact passed an unpinned action\n' >&2; fail=1; }
    zizmor --offline --persona=pedantic "$fixtures/bad-excess-permission.yml" >/dev/null 2>&1 && { printf 'zizmor passed a broad permission\n' >&2; fail=1; }
    exit $fail

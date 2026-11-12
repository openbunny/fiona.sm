{
  description = "fiona.sm development environment";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "aarch64-darwin"
        "x86_64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      forEach = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forEach (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          # Every binary a justfile recipe or a package.json script invokes that
          # `bun install` does not put in node_modules/.bin. The contract is that
          # `just quality` and `just actions-check` run after `direnv allow` and
          # `bun install`, with nothing else installed by hand.
          # mise.toml pins the same set for CI. Where nixpkgs and mise.toml
          # disagree on a version, this shell and CI run different binaries.
          gateTools = [
            pkgs.act # actions-events, actions-check-selftest
            pkgs.actionlint # actions-lint
            pkgs.editorconfig-checker # bun run editorconfig
            pkgs.git # 12 justfile recipes and the scripts under scripts/
            pkgs.gitleaks # secrets-history
            pkgs.just # every gate is a just recipe
            pkgs.lychee # link checking
            pkgs.osv-scanner # osv
            pkgs.pinact # actions-pin, actions-pin-verify
            pkgs.renovate # renovate-config-validator
            pkgs.semgrep # semgrep
            pkgs.typos # spelling
            pkgs.uv # semgrep's pypi backend under mise
            pkgs.zizmor # actions-audit
          ];
          # The servers Gram launches here, under the ids it launches them with.
          # Gram starts a server already present on the system in preference to
          # downloading one, and its node.allow_binary_download and
          # node.allow_npm_install are both false, so a server missing here does
          # not install itself: it fails to start.
          # ids: zed-industries/zed crates/languages/src/{vtsls,eslint,tailwind,css,json,yaml}.rs
          editorServers = [
            pkgs.vtsls # TypeScript, TSX, JavaScript
            pkgs.vscode-langservers-extracted # css, eslint, json, html servers
            pkgs.tailwindcss-language-server
            pkgs.yaml-language-server
            pkgs.bash-language-server
            pkgs.nixd # this file
            # Gram's TOML server. The taplo gate runs @taplo/cli from
            # node_modules/.bin, which `bun run` resolves first.
            pkgs.taplo
          ];
          # gnupg is absent deliberately. `bun run canary renew` and
          # `bun run manifest sign` reach the YubiKey through
          # lib/renew/gpg-card.ts, and the card, scdaemon and pinentry
          # configuration belongs to the system installation; a second gnupg
          # ahead of it on PATH would answer those calls instead.
          runtimes = [
            pkgs.bun
            pkgs.nodejs
            # CI installs the gate tools through mise, not this shell; keeping it
            # here is what makes `mise which <tool>` comparable to `which <tool>`.
            pkgs.mise
            pkgs.nixfmt
          ];
        in
        {
          default = pkgs.mkShellNoCC {
            name = "fiona.sm";
            packages = gateTools ++ editorServers ++ runtimes;
            # mise.toml's [env] block does not reach this shell, and `next build`
            # posts anonymous usage data without it.
            NEXT_TELEMETRY_DISABLED = "1";
          };
        }
      );

      formatter = forEach (system: nixpkgs.legacyPackages.${system}.nixfmt);
    };
}

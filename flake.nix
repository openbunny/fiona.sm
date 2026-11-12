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
          # Every server Gram launches in this repository, by the id it launches
          # it under. Gram prefers a server already on the system over one it
          # downloads, and this shell is what puts it there; the editor's
          # node.allow_binary_download and node.allow_npm_install are false, so a
          # server missing here does not install itself, it fails to start.
          # ids: zed-industries/zed crates/languages/src/{vtsls,eslint,tailwind,css,json,yaml}.rs
          editorServers = [
            pkgs.vtsls # TypeScript, TSX, JavaScript
            pkgs.vscode-langservers-extracted # vscode-css-language-server, vscode-eslint-language-server, vscode-json-language-server
            pkgs.tailwindcss-language-server
            pkgs.yaml-language-server
            pkgs.taplo # TOML: mise.toml, osv-scanner.toml, lychee.toml
            pkgs.bash-language-server # .githooks, shell in justfile recipes
            pkgs.nixd # this file
          ];
          # mise owns every gate tool and pins it in mise.lock; see AGENTS.md
          # section 9. Declaring those versions here as well would make two
          # sources of truth for one pin, so this shell supplies only mise
          # itself and the runtimes mise.toml does not pin.
          runtimes = [
            pkgs.bun
            pkgs.nodejs
            pkgs.mise
          ];
        in
        {
          default = pkgs.mkShellNoCC {
            name = "fiona.sm";
            packages = editorServers ++ runtimes ++ [ pkgs.nixfmt-rfc-style ];
          };
        }
      );

      formatter = forEach (system: nixpkgs.legacyPackages.${system}.nixfmt-rfc-style);
    };
}

## Environment variables

```
KRU_STORE_REPO=ap-justin/kru-store
```

## Network access

Custom, *include defaults* on, plus:

```
get.pnpm.io
nodejs.org
ppa.launchpadcontent.net
mcp.context7.com
api.anthropic.com
analyticsdata.googleapis.com
oauth2.googleapis.com
*.turso.io
```

## Setup script

```bash
#!/bin/bash
# kru v0.144.0
set -uo pipefail
exec > >(tee -a /tmp/setup.log) 2>&1

try() {
  for _ in 1 2 3; do "$@" && return 0; sleep 2; done
  echo "SETUP FAIL: $*"
}

# kru store
try git clone -q https://github.com/ap-justin/kru-store ~/.kru
[ -f ~/.kru/setup.sh ] && try bash ~/.kru/setup.sh

# plugins
try claude plugin marketplace add anthropics/claude-plugins-official
try claude plugin marketplace add ap-justin/kru
try claude plugin marketplace add sveltejs/ai-tools
try claude plugin marketplace add tursodatabase/turso-mcp
try claude plugin install kru@kru --scope user
try claude plugin install svelte@svelte --scope user
try claude plugin install vercel@claude-plugins-official --scope user
try claude plugin install turso@turso --scope user
try claude plugin install typescript-lsp@claude-plugins-official --scope user
try claude plugin enable cc-plugin-you-should-know@builtin --scope user

# ga-chat: node 24 (local runs v24), pnpm 12.4.2 (package.json packageManager)
NODE_VER=v24.20.0
try bash -c "curl -fsSL https://nodejs.org/dist/$NODE_VER/node-$NODE_VER-linux-x64.tar.xz | tar -xJ -C /usr/local --strip-components=1"
try env SHELL=/bin/bash PNPM_VERSION=12.4.2 bash -c "curl -fsSL https://get.pnpm.io/install.sh | sh -"
try npm i -g typescript@6 typescript-language-server

node --version; pnpm --version; claude plugin list
exit 0
```

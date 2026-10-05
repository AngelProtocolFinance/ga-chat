<!-- kru v0.144.0 · derived 2026-10-06 · /kru:setup to re-derive -->
## Team

Load **`kru:lead`** before building, reviewing, or dispatching a seat — it carries how the
team works.

- **routes** → `kru:sveltekit-builder` — `@sveltejs/kit` 2.55, `src/routes/**/+server.ts`, `src/hooks.server.ts`, `src/lib/server` (except `db/`)
- **ui** → `kru:svelte-ui-builder` — svelte 5.55, `src/lib/components`; `src/routes/+page.svelte` (840 lines) and `login/+page.svelte` hold UI inline, not thin mounts
- **data** → `kru:turso-specialist` — `@libsql/client` 0.17 + drizzle `dialect: "turso"`, `src/lib/server/db`, `drizzle.config.ts`; local `file:sqlite.db` when `TURSO_DATABASE_URL` is unset
- **deploy** → `kru:vercel-platform-engineer` — `@sveltejs/adapter-auto`, README → Deploy; Replit via `.replit`
- **tooling** → `kru:toolchain-engineer` — `biome.json`
- **skills** → `kru:drizzle` — drizzle-orm 0.45.2
- **project seats** — `.claude/agents/security-reviewer.md`; prefer it over `kru:code-reviewer` for auth, SSE and GA4 tool-input review
- **tokens** — `src/app.css` `:root` custom properties; nothing gates their use
- **screens** — `pnpm dev`, `localhost:5173` (`server.strictPort`)
- ⚠ **test** — no suite: `@playwright/test` is installed with no config or specs ← `find` for `*.spec.*`/`playwright.config*`
- **verify** — `pnpm lint && pnpm exec svelte-check --threshold error`, also run by `.claude/skills/verify` before each commit; svelte-check alone covers `.svelte` (Biome `files.includes` is ts/js only) ← `biome.json`, `package.json`
- **mcp** — svelte · vercel (project plugins), turso (local plugin); context7 + chrome-devtools at user scope

A slice reaching a stack no seat above covers is a question for the user, naming the seat it would
need — never a nearby seat pressed into the gap.

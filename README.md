# GA4 Chat

Ask your Google Analytics questions in plain English. Self-hosted, open source, built for nonprofit teams without an analyst.

<!-- demo: replace with a gif/screenshot of a real question → answer -->
![GA4 Chat demo](static/demo.gif)

- **Plain-English answers** — "which campaigns drove donations last month?" → Claude queries your GA4 property and answers with tables and follow-up suggestions.
- **Built for the whole team** — one shared login, saved conversations, CSV export. No per-seat AI subscription; you pay only for the Anthropic API calls you make.
- **Yours to keep** — runs on your own Vercel or Replit account with your own keys. Read-only access to Analytics. MIT licensed.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ap-justin/ga4-chat&env=ANTHROPIC_API_KEY,GOOGLE_SERVICE_ACCOUNT_JSON,GA4_PROPERTY_ID,AUTH_PASSWORD_HASH,JWT_SECRET,TURSO_DATABASE_URL,TURSO_AUTH_TOKEN)

## Setup

### 1. Environment variables

```bash
cp .env.example .env
```

Fill in:

| Var | Where to get it |
|-----|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | GCP Console → IAM → Service Accounts → Keys → JSON (needs `Analytics Viewer` role) |
| `GA4_PROPERTY_ID` | GA4 Admin → Property Settings → Property ID (a number like `123456789`) |
| `AUTH_PASSWORD_HASH` | Generate with step 2 below |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `TURSO_DATABASE_URL` | *(optional)* Turso database URL — omit to use local SQLite file |
| `TURSO_AUTH_TOKEN` | *(optional)* Turso auth token |

### 2. Generate password hash

```bash
node scripts/hash-password.mjs 'YOUR_PASSWORD'
```

Paste the output (a `scrypt:...` string) as `AUTH_PASSWORD_HASH` in `.env`. The password must be at least 16 characters; run with `--generate` instead to get a random one (printed to stderr, hash to stdout), or omit the argument to be prompted, which keeps the password out of shell history.

### 3. GCP service account

1. Create a service account in [GCP Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Grant it the **Viewer** role on your GA4 property (GA4 Admin → Property Access Management)
3. Create a JSON key, paste the entire JSON blob as `GOOGLE_SERVICE_ACCOUNT_JSON`

### 4. Database

The app uses SQLite by default (local `sqlite.db` file). Create its tables once with `pnpm db:push` (with `TURSO_DATABASE_URL` unset).

For production/Vercel, use [Turso](https://turso.tech):

```bash
# install turso cli
curl -sSfL https://get.tur.so/install.sh | bash

# sign up / login
turso auth signup   # or: turso auth login

# create database
turso db create ga-chat

# get credentials
turso db show ga-chat --url        # → TURSO_DATABASE_URL
turso db tokens create ga-chat     # → TURSO_AUTH_TOKEN
```

Push schema to Turso:

```bash
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... pnpm db:push
```

### 5. Run

```bash
pnpm install
pnpm dev
```

Open [localhost:5173](http://localhost:5173), log in with your password.

## Deploy

### Vercel

1. Connect repo in Vercel dashboard
2. Set env vars: `ANTHROPIC_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GA4_PROPERTY_ID`, `AUTH_PASSWORD_HASH`, `JWT_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
3. Deploy

### Replit

1. Import repo from GitHub
2. Set all env vars in Secrets (same as above, but `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are optional — omit to use local SQLite)
3. Hit **Run** — dev server starts on port 3000

## Security notes

- Login is one shared password, stored as a salted scrypt hash. After 5 wrong tries an IP address is locked out for 15 minutes.
- The lockout counter lives in memory per server instance. Behind your own reverse proxy (e.g. `adapter-node`), configure the adapter's `ADDRESS_HEADER`/`XFF_DEPTH` so it sees real client IPs.
- Sessions last 7 days. To sign everyone out, change `JWT_SECRET`.
- **Upgrading from an older version:** an old 64-character sha256 `AUTH_PASSWORD_HASH` still works but logs a warning — regenerate it with step 2.

## License

[MIT](LICENSE)

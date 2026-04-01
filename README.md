# GA4 Chat

Chat interface for querying Better Giving GA4 data via Claude.

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
| `GA4_PROPERTY_ID` | GA4 Admin → Property Settings → Property ID (currently `354444619`) |
| `AUTH_PASSWORD_HASH` | Generate with step 2 below |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `TURSO_DATABASE_URL` | *(optional)* Turso database URL — omit to use local SQLite file |
| `TURSO_AUTH_TOKEN` | *(optional)* Turso auth token |

### 2. Generate password hash

```bash
pnpm exec node -e "const c=require('crypto');console.log(c.createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"
```

Paste the output as `AUTH_PASSWORD_HASH` in `.env`.

### 3. GCP service account

1. Create a service account in [GCP Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Grant it the **Viewer** role on your GA4 property (GA4 Admin → Property Access Management)
3. Create a JSON key, paste the entire JSON blob as `GOOGLE_SERVICE_ACCOUNT_JSON`

### 4. Database

The app uses SQLite by default (local `sqlite.db` file, no setup needed).

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

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

### 2. Generate password hash

```bash
node -e "import('bcryptjs').then(b => b.default.hash('YOUR_PASSWORD', 10).then(console.log))"
```

Paste the output as `AUTH_PASSWORD_HASH` in `.env`.

### 3. GCP service account

1. Create a service account in [GCP Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Grant it the **Viewer** role on your GA4 property (GA4 Admin → Property Access Management)
3. Create a JSON key, paste the entire JSON blob as `GOOGLE_SERVICE_ACCOUNT_JSON`

### 4. Run

```bash
pnpm install
pnpm dev
```

Open [localhost:5173](http://localhost:5173), log in with your password.

## Deploy (Vercel)

```bash
pnpm build        # verify build works
vercel deploy      # or connect repo in Vercel dashboard
```

Set all 4 env vars in Vercel project settings.

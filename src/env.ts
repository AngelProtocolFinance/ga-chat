import { defineEnvVars } from "@sveltejs/kit/env";

const optional = (value: string | undefined) => value;

export const variables = defineEnvVars({
  ANTHROPIC_API_KEY: { static: true },
  GA4_PROPERTY_ID: { static: true },
  GOOGLE_SERVICE_ACCOUNT_JSON: { static: true },
  AUTH_PASSWORD_HASH: { static: true },
  JWT_SECRET: { static: true },
  TURSO_DATABASE_URL: { schema: optional },
  TURSO_AUTH_TOKEN: { schema: optional },
});

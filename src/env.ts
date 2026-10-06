import { defineEnvVars } from "@sveltejs/kit/env";

const optional = (value: string | undefined) => value;

const APP_NAME_MAX = 60;
const app_name = (value: string | undefined) =>
  (value?.trim() || "GA4 Chat").slice(0, APP_NAME_MAX).trim();

export const variables = defineEnvVars({
  ANTHROPIC_API_KEY: { static: true },
  GA4_PROPERTY_ID: { static: true },
  GOOGLE_SERVICE_ACCOUNT_JSON: { static: true },
  AUTH_PASSWORD_HASH: { static: true },
  JWT_SECRET: { static: true },
  TURSO_DATABASE_URL: { schema: optional },
  TURSO_AUTH_TOKEN: { schema: optional },
  ORG_CONTEXT: {
    schema: (value) => value?.trim() || undefined,
    description: "Appended to the system prompt under 'About this organization:'",
  },
  APP_NAME: { schema: app_name, description: "Display name; defaults to GA4 Chat" },
});

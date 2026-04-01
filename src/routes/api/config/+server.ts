import { json } from "@sveltejs/kit";
import {
	ANTHROPIC_API_KEY,
	GA4_PROPERTY_ID,
	GOOGLE_SERVICE_ACCOUNT_JSON,
} from "$env/static/private";
import type { RequestHandler } from "./$types";

function mask_key(key: string | undefined): string | null {
	if (!key) return null;
	if (key.length <= 11) return "***";
	return key.slice(0, 7) + "..." + key.slice(-4);
}

function parse_service_account(raw: string | undefined): {
	email: string | null;
	project: string | null;
} {
	if (!raw) return { email: null, project: null };
	try {
		const parsed = JSON.parse(raw);
		return {
			email: parsed.client_email ?? null,
			project: parsed.project_id ?? null,
		};
	} catch {
		return { email: null, project: null };
	}
}

export const GET: RequestHandler = async () => {
	const sa = parse_service_account(GOOGLE_SERVICE_ACCOUNT_JSON);

	return json({
		ga4_property_id: GA4_PROPERTY_ID || null,
		anthropic_key: mask_key(ANTHROPIC_API_KEY),
		service_account_email: sa.email,
		service_account_project: sa.project,
	});
};

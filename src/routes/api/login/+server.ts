import { json } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { create_session_token, get_cookie_name, verify_password } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

// in-memory, so the limit holds per server instance only
const attempts_by_ip = new Map<string, { count: number; reset_at: number }>();

function prune_expired(now: number) {
  for (const [ip, entry] of attempts_by_ip) {
    if (entry.reset_at <= now) attempts_by_ip.delete(ip);
  }
}

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  const ip = getClientAddress();
  const now = Date.now();
  prune_expired(now);

  const entry = attempts_by_ip.get(ip) ?? { count: 0, reset_at: now + ATTEMPT_WINDOW_MS };
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    return json(
      { error: "Too many attempts, try again later" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((entry.reset_at - now) / 1000)) } },
    );
  }
  // counted before verifying so concurrent requests can't all slip past the check
  entry.count++;
  attempts_by_ip.set(ip, entry);

  const body: unknown = await request.json().catch(() => null);
  const password = (body as { password?: unknown } | null)?.password;

  if (typeof password !== "string" || !password || !(await verify_password(password))) {
    return json({ error: "Invalid password" }, { status: 401 });
  }

  attempts_by_ip.delete(ip);
  const token = await create_session_token();
  cookies.set(get_cookie_name(), token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: !dev,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return json({ success: true });
};

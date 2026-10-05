import { json } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { create_session_token, get_cookie_name, verify_password } from "$lib/server/auth";
import { create_attempt_limiter } from "$lib/server/limiter";
import type { RequestHandler } from "./$types";

const login_attempts = create_attempt_limiter({
  max_attempts: 5,
  window_ms: 15 * 60 * 1000,
  max_keys: 10_000,
  prune_interval_ms: 60 * 1000,
});

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  const ip = getClientAddress();
  const attempt = login_attempts.attempt(ip);
  if (!attempt.allowed) {
    return json(
      { error: "Too many attempts, try again later" },
      { status: 429, headers: { "Retry-After": String(attempt.retry_after_s) } },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const password = (body as { password?: unknown } | null)?.password;

  if (typeof password !== "string" || !password || !(await verify_password(password))) {
    return json({ error: "Invalid password" }, { status: 401 });
  }

  login_attempts.clear(ip);
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

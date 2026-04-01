import { json } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { create_session_token, get_cookie_name, verify_password } from "$lib/server/auth";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { password } = await request.json();

  console.log("[login] password received:", !!password);
  const valid = await verify_password(password);
  console.log("[login] verify_password result:", valid);

  if (!password || !valid) {
    return json({ error: "Invalid password" }, { status: 401 });
  }

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

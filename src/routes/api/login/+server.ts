import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  verify_password,
  create_session_token,
  get_cookie_name,
} from "$lib/server/auth";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const { password } = await request.json();

  if (!password || !(await verify_password(password))) {
    return json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await create_session_token();
  cookies.set(get_cookie_name(), token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return json({ success: true });
};

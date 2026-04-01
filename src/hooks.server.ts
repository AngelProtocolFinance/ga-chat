import type { Handle } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { validate_session, get_cookie_name } from "$lib/server/auth";

const PUBLIC_PATHS = ["/login", "/api/login"];

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return resolve(event);
  }

  const token = event.cookies.get(get_cookie_name());
  if (!(await validate_session(token))) {
    throw redirect(303, "/login");
  }

  event.locals.session_token = token;
  return resolve(event);
};

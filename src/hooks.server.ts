import type { Handle } from "@sveltejs/kit";
import { json, redirect } from "@sveltejs/kit";
import { get_cookie_name, validate_session } from "$lib/server/auth";

const PUBLIC_PATHS = ["/login", "/api/login"];

function is_public(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  if (is_public(pathname)) {
    return resolve(event);
  }

  const token = event.cookies.get(get_cookie_name());
  if (!(await validate_session(token))) {
    // a fetch would follow a redirect and get the login page back as a 200
    if (pathname.startsWith("/api/")) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    throw redirect(303, "/login");
  }

  event.locals.session_token = token;
  return resolve(event);
};

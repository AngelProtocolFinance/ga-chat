import { goto } from "$app/navigation";

/**
 * `fetch` for this app's `/api/*` routes. A 401 means the session is gone: it navigates to
 * /login and the returned promise never settles, so the caller stops where it awaited.
 * Any other status resolves normally and `res.ok` is the caller's to check.
 */
export async function api_fetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    await goto("/login");
    return new Promise<never>(() => {});
  }
  return res;
}

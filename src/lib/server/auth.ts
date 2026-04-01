import { createHash } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { env } from "$env/dynamic/private";

const SESSION_COOKIE = "ga_chat_session";

export function get_cookie_name() {
  return SESSION_COOKIE;
}

export async function verify_password(password: string): Promise<boolean> {
  if (!env.AUTH_PASSWORD_HASH) return false;
  const hash = createHash("sha256").update(password).digest("hex");
  console.log("[auth] computed hash:", hash);
  console.log("[auth] expected hash:", env.AUTH_PASSWORD_HASH);
  return hash === env.AUTH_PASSWORD_HASH;
}

export async function create_session_token(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(env.JWT_SECRET));
}

export async function validate_session(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(env.JWT_SECRET));
    return true;
  } catch {
    return false;
  }
}

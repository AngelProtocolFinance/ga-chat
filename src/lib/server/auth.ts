import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "ga_chat_session";
const password_hash = process.env.AUTH_PASSWORD_HASH ?? "";
const jwt_secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");

export function get_cookie_name() {
  return SESSION_COOKIE;
}

export async function verify_password(password: string): Promise<boolean> {
  if (!password_hash) return false;
  return bcrypt.compare(password, password_hash);
}

export async function create_session_token(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwt_secret);
}

export async function validate_session(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, jwt_secret);
    return true;
  } catch {
    return false;
  }
}

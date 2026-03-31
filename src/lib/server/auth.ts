import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const SESSION_COOKIE = "ga_chat_session";
const sessions = new Set<string>();

const password_hash = process.env.AUTH_PASSWORD_HASH ?? "";

export function get_cookie_name() {
  return SESSION_COOKIE;
}

export async function verify_password(password: string): Promise<boolean> {
  if (!password_hash) return false;
  return bcrypt.compare(password, password_hash);
}

export function create_session(): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.add(token);
  return token;
}

export function validate_session(token: string | undefined): boolean {
  if (!token) return false;
  return sessions.has(token);
}

export function destroy_session(token: string) {
  sessions.delete(token);
}

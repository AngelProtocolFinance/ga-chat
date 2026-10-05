import { createHash, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { AUTH_PASSWORD_HASH, JWT_SECRET } from "$app/env/private";
import { parse_scrypt_hash, type ScryptHash, verify_scrypt } from "./password.js";

const SESSION_COOKIE = "ga_chat_session";
const MIN_JWT_SECRET_LENGTH = 32;

type StoredHash =
  | ({ kind: "scrypt" } & ScryptHash)
  | { kind: "sha256"; digest: Buffer }
  | { kind: "invalid" };

function parse_stored_hash(value: string): StoredHash {
  const scrypt_hash = parse_scrypt_hash(value);
  if (scrypt_hash) return { kind: "scrypt", ...scrypt_hash };
  if (/^[0-9a-f]{64}$/i.test(value)) {
    console.warn(
      "[auth] AUTH_PASSWORD_HASH is a legacy unsalted sha256 hash; regenerate it with `node scripts/hash-password.mjs`",
    );
    return { kind: "sha256", digest: Buffer.from(value, "hex") };
  }
  if (value) {
    console.warn("[auth] AUTH_PASSWORD_HASH is not in a recognized format; every login will fail");
  }
  return { kind: "invalid" };
}

const stored_hash = parse_stored_hash(AUTH_PASSWORD_HASH);

export function get_cookie_name() {
  return SESSION_COOKIE;
}

export async function verify_password(password: string): Promise<boolean> {
  switch (stored_hash.kind) {
    case "scrypt":
      return verify_scrypt(password, stored_hash);
    case "sha256": {
      const digest = createHash("sha256").update(password).digest();
      return timingSafeEqual(digest, stored_hash.digest);
    }
    case "invalid":
      return false;
  }
}

// checked on first use, not at import, so `vite build` runs without the secret set
function get_jwt_key(): Uint8Array {
  if (JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters; generate one with: openssl rand -hex 32`,
    );
  }
  return new TextEncoder().encode(JWT_SECRET);
}

export async function create_session_token(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(get_jwt_key());
}

export async function validate_session(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  // outside the try: a misconfigured secret must surface, not read as a bad token
  const key = get_jwt_key();
  try {
    await jwtVerify(token, key);
    return true;
  } catch {
    return false;
  }
}

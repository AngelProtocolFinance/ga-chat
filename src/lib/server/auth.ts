import { createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { jwtVerify, SignJWT } from "jose";
import { AUTH_PASSWORD_HASH, JWT_SECRET } from "$env/static/private";

const SESSION_COOKIE = "ga_chat_session";
const SCRYPT_KEY_BYTES = 64;
const MIN_JWT_SECRET_LENGTH = 32;

const scrypt_async = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

type StoredHash =
  | { kind: "scrypt"; salt: Buffer; key: Buffer }
  | { kind: "sha256"; digest: Buffer }
  | { kind: "invalid" };

// scrypt:<salt-hex>:<key-hex>, as printed by scripts/hash-password.mjs
function parse_stored_hash(value: string): StoredHash {
  const scrypt_match = /^scrypt:([0-9a-f]{32}):([0-9a-f]{128})$/i.exec(value);
  if (scrypt_match) {
    return {
      kind: "scrypt",
      salt: Buffer.from(scrypt_match[1], "hex"),
      key: Buffer.from(scrypt_match[2], "hex"),
    };
  }
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
    case "scrypt": {
      const key = await scrypt_async(password, stored_hash.salt, SCRYPT_KEY_BYTES);
      return timingSafeEqual(key, stored_hash.key);
    }
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

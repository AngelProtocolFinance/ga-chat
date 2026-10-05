// Plain JS so scripts/hash-password.mjs can import it under bare node; scrypt N/r/p are node's defaults.
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCRYPT_HASH = new RegExp(
  `^scrypt:([0-9a-f]{${SALT_BYTES * 2}}):([0-9a-f]{${KEY_BYTES * 2}})$`,
  "i",
);

const scrypt_async =
  /** @type {(password: string, salt: Buffer, keylen: number) => Promise<Buffer>} */ (
    promisify(scrypt)
  );

/** @typedef {{ salt: Buffer; key: Buffer }} ScryptHash */

/**
 * @param {string} password
 * @returns {Promise<string>} `scrypt:<salt-hex>:<key-hex>`
 */
export async function hash_password(password) {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt_async(password, salt, KEY_BYTES);
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

/**
 * @param {string} value
 * @returns {ScryptHash | null}
 */
export function parse_scrypt_hash(value) {
  const match = SCRYPT_HASH.exec(value);
  if (!match) return null;
  return { salt: Buffer.from(match[1], "hex"), key: Buffer.from(match[2], "hex") };
}

/**
 * @param {string} password
 * @param {ScryptHash} stored
 * @returns {Promise<boolean>}
 */
export async function verify_scrypt(password, stored) {
  const key = await scrypt_async(password, stored.salt, KEY_BYTES);
  return timingSafeEqual(key, stored.key);
}

// Prints an AUTH_PASSWORD_HASH value: node scripts/hash-password.mjs 'YOUR_PASSWORD'
// Format and scrypt params are read back by verify_password in src/lib/server/auth.ts.
import { randomBytes, scrypt } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { promisify } from "node:util";

const scrypt_async = promisify(scrypt);

async function read_password() {
  if (process.argv.length > 2) return process.argv[2];
  // prompt on stderr so stdout carries only the hash
  process.stderr.write("Password: ");
  const rl = createInterface({ input: process.stdin });
  // iterating, not rl.question: question never settles when stdin ends unanswered
  for await (const line of rl) {
    rl.close();
    return line;
  }
  return "";
}

const password = await read_password();
if (!password) {
  console.error("Password must not be empty");
  process.exitCode = 1;
} else {
  const salt = randomBytes(16);
  const key = await scrypt_async(password, salt, 64);
  console.log(`scrypt:${salt.toString("hex")}:${key.toString("hex")}`);
}

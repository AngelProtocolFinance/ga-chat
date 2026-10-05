// Prints an AUTH_PASSWORD_HASH value on stdout:
//   node scripts/hash-password.mjs 'YOUR_PASSWORD'   hash the given password
//   node scripts/hash-password.mjs                   prompt for it
//   node scripts/hash-password.mjs --generate        random password on stderr, its hash on stdout
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { hash_password } from "../src/lib/server/password.js";

// the login rate limit is per IP, so password strength is what stops a distributed guesser
const MIN_PASSWORD_LENGTH = 16;

async function read_line() {
  const rl = createInterface({ input: process.stdin });
  // iterating, not rl.question: question never settles when stdin ends unanswered
  for await (const line of rl) {
    rl.close();
    return line;
  }
  return "";
}

function read_hidden_line() {
  const { stdin } = process;
  return new Promise((resolve) => {
    let input = "";
    const finish = () => {
      stdin.setRawMode(false);
      stdin.off("data", on_data);
      stdin.pause();
      process.stderr.write("\n");
      resolve(input);
    };
    /** @param {string} chunk */
    function on_data(chunk) {
      for (const char of chunk) {
        if (char === "\r" || char === "\n" || char === "\u0004") return finish();
        if (char === "\u0003") {
          // raw mode swallows ctrl-c's signal; restore the terminal and re-raise it
          stdin.setRawMode(false);
          process.stderr.write("\n");
          process.kill(process.pid, "SIGINT");
          return;
        }
        input = char === "\u007f" || char === "\b" ? [...input].slice(0, -1).join("") : input + char;
      }
    }
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.on("data", on_data);
    stdin.resume();
  });
}

async function prompt_password() {
  // prompt on stderr so stdout carries only the hash
  process.stderr.write("Password: ");
  return process.stdin.isTTY ? read_hidden_line() : read_line();
}

const arg = process.argv[2];
let password;
if (arg === "--generate") {
  password = randomBytes(18).toString("base64url");
  console.error(`Generated password: ${password}`);
} else {
  password = arg ?? (await prompt_password());
}

if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters (or use --generate)`);
  process.exitCode = 1;
} else {
  console.log(await hash_password(password));
}

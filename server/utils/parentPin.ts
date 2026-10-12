import { consola } from "consola";
import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;

let failedAttempts = 0;
let lockedUntil = 0;

function getParentPin(): string {
  // The PIN used to be public config; keep honouring the old env var name.
  // eslint-disable-next-line node/no-process-env
  const legacyPin = process.env.NUXT_PUBLIC_PARENT_PIN;
  const configured = String(useRuntimeConfig().parentPin || legacyPin || "").trim();
  return /^\d{4}$/.test(configured) ? configured : "1111";
}

function pinsMatch(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Checks the parent PIN, with a shared lockout after repeated wrong attempts. */
export function checkParentPin(pin: string): "valid" | "invalid" | "locked" {
  if (Date.now() < lockedUntil)
    return "locked";

  if (pinsMatch(pin, getParentPin())) {
    failedAttempts = 0;
    return "valid";
  }

  failedAttempts++;
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    failedAttempts = 0;
    lockedUntil = Date.now() + LOCKOUT_MS;
    consola.warn("Parent PIN: Too many incorrect attempts, locked for one minute");
  }
  return "invalid";
}

/** Throws 403 for a wrong PIN and 429 while locked out. */
export function requireParentPin(pin: unknown) {
  const result = checkParentPin(String(pin ?? ""));
  if (result === "locked")
    throw createError({ statusCode: 429, message: "Too many tries. Wait a minute." });
  if (result === "invalid")
    throw createError({ statusCode: 403, message: "Wrong PIN" });
}

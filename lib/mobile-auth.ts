import { createHash } from "crypto";

const MOBILE_PASSWORD = process.env.MOBILE_PASSWORD || "";
export const COOKIE_NAME = "biganzi_mobile";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function verifyPassword(password: string): boolean {
  if (!MOBILE_PASSWORD) return false;
  return password === MOBILE_PASSWORD;
}

export function createSession(): string {
  return createHash("sha256")
    .update(MOBILE_PASSWORD + ":" + Date.now())
    .digest("hex")
    .slice(0, 32);
}

export function isValidSession(session: string | undefined): boolean {
  if (!MOBILE_PASSWORD) return false;
  if (!session) return false;
  return /^[a-f0-9]{32}$/.test(session);
}

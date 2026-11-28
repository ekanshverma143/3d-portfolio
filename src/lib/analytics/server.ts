import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";

export const TZ = "Asia/Kolkata";
export const OWNER_COOKIE = "owner_session";
const SESSION_DAYS = 30;
export const DAY_TTL = 60 * 60 * 24 * 120;

let client: Redis | null | undefined;
export function getRedis() {
  if (client !== undefined) return client;
  const env = process.env;
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL ?? env.STORAGE_REST_API_URL ?? env.STORAGE_KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN ?? env.STORAGE_REST_API_TOKEN ?? env.STORAGE_KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

export const dayKey = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: TZ });

export function lastNDays(n: number) {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => dayKey(new Date(now - (n - 1 - i) * 86_400_000)));
}

const sha = (s: string) => createHash("sha256").update(s).digest();
export const shortHash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

export const passwordConfigured = () => Boolean(process.env.OWNER_PASSWORD);

export function checkPassword(input: string) {
  const pw = process.env.OWNER_PASSWORD;
  if (!pw) return false;
  return timingSafeEqual(sha(input), sha(pw));
}

function sessionKey() {
  const pw = process.env.OWNER_PASSWORD;
  return pw ? sha(`owner-session:${pw}`) : null;
}

export function makeSession() {
  const key = sessionKey();
  if (!key) throw new Error("OWNER_PASSWORD is not set");
  const exp = String(Date.now() + SESSION_DAYS * 86_400_000);
  const sig = createHmac("sha256", key).update(exp).digest("base64url");
  return { value: `${exp}.${sig}`, maxAge: SESSION_DAYS * 86_400 };
}

export function verifySession(value?: string) {
  const key = sessionKey();
  if (!key || !value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const good = Buffer.from(createHmac("sha256", key).update(exp).digest("base64url"));
  const got = Buffer.from(sig);
  return got.length === good.length && timingSafeEqual(got, good);
}

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "0.0.0.0";
}

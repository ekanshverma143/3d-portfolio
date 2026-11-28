import type { NextRequest } from "next/server";
import { DAY_TTL, OWNER_COOKIE, clientIp, dayKey, getRedis, shortHash, verifySession } from "@/lib/analytics/server";

export const dynamic = "force-dynamic";

const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|discord|embedly|curl|wget|python|axios|node-fetch|go-http/i;
const PATH = /^\/[A-Za-z0-9\-._~/%]{0,200}$/;
const SELF = /(^|\.)ekanshverma\.site$|^localhost$|\.vercel\.app$/;

function browserOf(ua: string) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\/|CriOS/.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

function deviceOf(ua: string, width: number) {
  if (/iPad|Tablet/.test(ua) || (width >= 768 && width < 1024 && /Mobi|Android/.test(ua))) return "Tablet";
  if (/Mobi|Android|iPhone/.test(ua) || (width > 0 && width < 768)) return "Mobile";
  return "Desktop";
}

function sourceOf(ref: string | undefined, utm: string | undefined) {
  if (utm) return utm.toLowerCase().slice(0, 40);
  if (!ref) return "Direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (SELF.test(host)) return null;
    if (/(^|\.)google\./.test(host)) return "Google";
    if (/bing\.com$/.test(host)) return "Bing";
    if (/linkedin\.com$|lnkd\.in$/.test(host)) return "LinkedIn";
    if (/(^|\.)t\.co$|twitter\.com$|x\.com$/.test(host)) return "X";
    if (/whatsapp/.test(host)) return "WhatsApp";
    if (/chatgpt\.com$|openai\.com$/.test(host)) return "ChatGPT";
    if (/perplexity\.ai$/.test(host)) return "Perplexity";
    if (/github\.com$/.test(host)) return "GitHub";
    return host.slice(0, 60);
  } catch {
    return "Direct";
  }
}

export async function POST(req: NextRequest) {
  const done = new Response(null, { status: 204 });
  const redis = getRedis();
  if (!redis) return done;
  if (verifySession(req.cookies.get(OWNER_COOKIE)?.value)) return done;

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOTS.test(ua)) return done;

  let body: { t?: string; p?: string; r?: string; u?: string; w?: number; e?: number };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return done;
  }
  const path = typeof body.p === "string" ? body.p.split("?")[0] : "";
  if (!PATH.test(path) || path.startsWith("/owner") || path.startsWith("/api")) return done;

  const day = dayKey();
  const keys = (prefix: string) => `${prefix}:${day}`;
  const p = redis.pipeline();

  if (body.t === "read") {
    p.zincrby("rd:all", 1, path);
    p.zincrby(keys("rd"), 1, path);
    p.expire(keys("rd"), DAY_TTL);
    await p.exec();
    return done;
  }

  const country = req.headers.get("x-vercel-ip-country") ?? "??";
  const city = decodeURIComponent(req.headers.get("x-vercel-ip-city") ?? "");
  const width = Number(body.w) || 0;
  const device = deviceOf(ua, width);
  const browser = browserOf(ua);
  const visitor = shortHash(`${day}|${clientIp(req.headers)}|${ua}|${process.env.OWNER_PASSWORD ?? "salt"}`);
  const source = body.e ? sourceOf(body.r, body.u) : null;

  p.incr("pv:total");
  p.incr(keys("pv"));
  p.pfadd(keys("uv"), visitor);
  p.zincrby(keys("pg"), 1, path);
  p.zincrby("pg:all", 1, path);
  p.zincrby(keys("co"), 1, country);
  p.hincrby(keys("dv"), device, 1);
  p.zincrby(keys("br"), 1, browser);
  if (source) p.zincrby(keys("rf"), 1, source);
  p.lpush("recent", { t: Date.now(), path, country, city, device, browser, source: source ?? "", v: visitor.slice(0, 6) });
  p.ltrim("recent", 0, 199);
  for (const prefix of ["pv", "uv", "pg", "co", "dv", "br", "rf"]) p.expire(keys(prefix), DAY_TTL);
  await p.exec();
  return done;
}

import { NextResponse, type NextRequest } from "next/server";
import { OWNER_COOKIE, checkPassword, clientIp, getRedis, makeSession, passwordConfigured, shortHash } from "@/lib/analytics/server";

export const dynamic = "force-dynamic";

const back = (req: NextRequest, query = "") => NextResponse.redirect(new URL(`/owner${query}`, req.url), 303);

export async function POST(req: NextRequest) {
  if (!passwordConfigured()) return back(req, "?e=setup");
  const redis = getRedis();
  const failKey = `login:fail:${shortHash(clientIp(req.headers))}`;
  if (redis && Number((await redis.get<number>(failKey)) ?? 0) >= 8) return back(req, "?e=locked");

  const form = await req.formData();
  if (!checkPassword(String(form.get("password") ?? ""))) {
    if (redis) {
      await redis.incr(failKey);
      await redis.expire(failKey, 15 * 60);
    }
    return back(req, "?e=wrong");
  }

  const session = makeSession();
  const res = back(req);
  res.cookies.set(OWNER_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAge,
  });
  if (redis) await redis.del(failKey);
  return res;
}

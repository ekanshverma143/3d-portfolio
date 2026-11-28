import { NextResponse, type NextRequest } from "next/server";
import { OWNER_COOKIE } from "@/lib/analytics/server";

export const dynamic = "force-dynamic";

export function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/owner", req.url), 303);
  res.cookies.set(OWNER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

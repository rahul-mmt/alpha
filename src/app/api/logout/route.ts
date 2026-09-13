import { NextResponse } from "next/server";
import { SESSION_COOKIE, USER_COOKIE } from "@/lib/server/auth";

export function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(USER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

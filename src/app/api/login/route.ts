import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, USER_COOKIE, cookieBase, credentials, signSession, timingSafeEqual } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { user?: string; password?: string };
  const { user, password } = credentials();
  if (!password) {
    return NextResponse.json({ error: "Login is not configured (APP_PASSWORD missing)." }, { status: 500 });
  }
  const okUser = timingSafeEqual((body.user ?? "").trim().toLowerCase(), user.toLowerCase());
  const okPass = timingSafeEqual(body.password ?? "", password);
  if (!okUser || !okPass) {
    // Small fixed delay to blunt brute force on a demo box.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: "Incorrect user ID or password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, user });
  res.cookies.set(SESSION_COOKIE, await signSession(user), { ...cookieBase, httpOnly: true });
  res.cookies.set(USER_COOKIE, user, { ...cookieBase, httpOnly: false });
  return res;
}

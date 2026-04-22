import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
/** Keep in sync with `SESSION_COOKIE` in `lib/auth.ts` (avoid importing `jose` into Edge). */
const SESSION_COOKIE_NAME = "rp_session";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const login = new URL("/login", req.url);
      login.searchParams.set("next", req.nextUrl.pathname);
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

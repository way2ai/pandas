import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "./lib/session";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const pathname = request.nextUrl.pathname;

  if ((pathname.startsWith("/app") || pathname.startsWith("/tenant") || pathname.startsWith("/admin")) && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/tenant/:path*", "/admin/:path*"],
};

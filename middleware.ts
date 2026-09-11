// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "narra_session";

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/projects")) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/api/auth/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/library/:path*", "/api/projects/:path*"],
};

// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createSessionToken,
  exchangeAuthorizationCode,
  getKyrosConfig,
  OAUTH_STATE_COOKIE,
  PKCE_VERIFIER_COOKIE,
  RETURN_TO_COOKIE,
  SESSION_COOKIE,
  verifyKyrosAccessToken,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const config = getKyrosConfig();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const issuer = request.nextUrl.searchParams.get("iss");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = request.cookies.get(PKCE_VERIFIER_COOKIE)?.value;
  const returnTo = request.cookies.get(RETURN_TO_COOKIE)?.value || "/library";

  try {
    if (!code || !state || !expectedState || state !== expectedState || !verifier) {
      throw new Error("Invalid OAuth state or missing PKCE verifier");
    }
    if (!issuer || issuer !== config.issuer) {
      throw new Error("Invalid Kyros authorization response issuer");
    }

    const tokenResponse = await exchangeAuthorizationCode(code, verifier);
    const claims = await verifyKyrosAccessToken(tokenResponse.access_token);

    const email = tokenResponse.user?.email || (typeof claims.email === "string" ? claims.email : null);
    if (!email) throw new Error("Kyros did not return an email address");

    const kyrosSub = tokenResponse.user?.id || claims.sub!;
    const name = tokenResponse.user?.displayName ||
      (typeof claims.display_name === "string" ? claims.display_name : null) ||
      tokenResponse.user?.username ||
      (typeof claims.username === "string" ? claims.username : null);
    const role = tokenResponse.user?.role || (typeof claims.role === "string" ? claims.role : null);

    // Narra keeps a local user record for ownership/relations. Kyros remains the identity provider.
    const user = await db.user.upsert({
      where: { email },
      update: { name },
      create: { email, name },
    });

    const sessionToken = createSessionToken({
      userId: user.id,
      kyrosSub,
      email,
      name,
      role,
    });

    const response = NextResponse.redirect(new URL(returnTo, config.appBaseUrl));
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(PKCE_VERIFIER_COOKIE);
    response.cookies.delete(RETURN_TO_COOKIE);
    return response;
  } catch (error) {
    console.error("Kyros callback error:", error);
    const response = NextResponse.redirect(new URL("/?auth_error=kyros", config.appBaseUrl));
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(PKCE_VERIFIER_COOKIE);
    response.cookies.delete(RETURN_TO_COOKIE);
    return response;
  }
}

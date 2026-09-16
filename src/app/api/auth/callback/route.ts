// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createSessionToken,
  discoverKyros,
  exchangeAuthorizationCode,
  getAppBaseUrl,
  getKyrosConfig,
  KYROS_SERVER_COOKIE,
  OAUTH_STATE_COOKIE,
  PKCE_VERIFIER_COOKIE,
  RETURN_TO_COOKIE,
  SESSION_COOKIE,
  verifyKyrosAccessToken,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const issuer = request.nextUrl.searchParams.get("iss");
  const oauthError = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = request.cookies.get(PKCE_VERIFIER_COOKIE)?.value;
  const selectedKyrosServer = request.cookies.get(KYROS_SERVER_COOKIE)?.value;
  const returnTo = request.cookies.get(RETURN_TO_COOKIE)?.value || "/";

  try {
    const config = getKyrosConfig();
    if (!selectedKyrosServer) throw new Error("Missing Kyros server for this authorization transaction");
    const discovery = await discoverKyros(selectedKyrosServer);
    if (oauthError) throw new Error(`Kyros authorization failed: ${oauthError}`);
    if (!code || !state || !expectedState || state !== expectedState || !verifier) {
      throw new Error("Invalid OAuth state or missing PKCE verifier");
    }
    if (!issuer || issuer !== (config.expectedIssuer || discovery.issuer)) {
      throw new Error("Invalid Kyros authorization response issuer");
    }

    const tokenResponse = await exchangeAuthorizationCode(code, verifier, discovery);
    const claims = await verifyKyrosAccessToken(tokenResponse.access_token, discovery);

    if (tokenResponse.user?.id && tokenResponse.user.id !== claims.sub) {
      throw new Error("Kyros profile subject does not match the signed access token");
    }

    const email = typeof claims.email === "string" ? claims.email : tokenResponse.user?.email;
    if (!email) throw new Error("Kyros did not return an email address");

    const kyrosSub = claims.sub!;
    const name = (typeof claims.display_name === "string" ? claims.display_name : null) ||
      tokenResponse.user?.displayName ||
      tokenResponse.user?.username ||
      (typeof claims.username === "string" ? claims.username : null);
    const role = typeof claims.role === "string" ? claims.role : tokenResponse.user?.role || null;

    // Narra keeps a local user record for ownership/relations. Kyros remains the identity provider.
    const user = await db.$transaction(async (transaction) => {
      const bySubject = await transaction.user.findUnique({ where: { kyrosSub } });
      if (bySubject) {
        return transaction.user.update({
          where: { id: bySubject.id },
          data: { email, name },
        });
      }

      return transaction.user.upsert({
        where: { email },
        update: { kyrosSub, name },
        create: { kyrosSub, email, name },
      });
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
    response.cookies.delete(KYROS_SERVER_COOKIE);
    return response;
  } catch (error) {
    console.error("Kyros callback error:", error);
    const response = NextResponse.redirect(new URL("/login?error=kyros", getAppBaseUrl()));
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(PKCE_VERIFIER_COOKIE);
    response.cookies.delete(RETURN_TO_COOKIE);
    response.cookies.delete(KYROS_SERVER_COOKIE);
    return response;
  }
}

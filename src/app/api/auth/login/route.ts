// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthState,
  createPkcePair,
  getKyrosConfig,
  OAUTH_STATE_COOKIE,
  PKCE_VERIFIER_COOKIE,
  RETURN_TO_COOKIE,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const config = getKyrosConfig();
    const state = createOAuthState();
    const { verifier, challenge } = createPkcePair();
    const requestedReturnTo = request.nextUrl.searchParams.get("returnTo") || "/library";
    const returnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/library";

    const parResponse = await fetch(`${config.baseUrl}/par`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scopes,
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        kyros_sso_version: "v4",
        kyros_edition: config.edition,
        kyros_application_scope: config.applicationScope,
      }),
      cache: "no-store",
    });

    const par = (await parResponse.json().catch(() => ({}))) as {
      request_uri?: string;
      error?: string;
    };

    if (!parResponse.ok || !par.request_uri) {
      console.error("Kyros PAR failed:", par.error || parResponse.status);
      return NextResponse.json({ error: "Impossible de démarrer la connexion Kyros" }, { status: 502 });
    }

    const authorizeUrl = new URL(`${config.baseUrl}/authorize`);
    authorizeUrl.searchParams.set("client_id", config.clientId);
    authorizeUrl.searchParams.set("request_uri", par.request_uri);

    const response = NextResponse.redirect(authorizeUrl);
    const secure = process.env.NODE_ENV === "production";
    const common = { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: 600 };
    response.cookies.set(OAUTH_STATE_COOKIE, state, common);
    response.cookies.set(PKCE_VERIFIER_COOKIE, verifier, common);
    response.cookies.set(RETURN_TO_COOKIE, returnTo, common);
    return response;
  } catch (error) {
    console.error("Kyros login error:", error);
    return NextResponse.json({ error: "Configuration Kyros invalide" }, { status: 500 });
  }
}

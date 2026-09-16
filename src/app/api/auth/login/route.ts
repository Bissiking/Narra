// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthState,
  createPkcePair,
  discoverKyros,
  getKyrosConfig,
  KYROS_SERVER_COOKIE,
  OAUTH_STATE_COOKIE,
  PKCE_VERIFIER_COOKIE,
  RETURN_TO_COOKIE,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const config = getKyrosConfig();
    const discovery = await discoverKyros();
    const state = createOAuthState();
    const { verifier, challenge } = createPkcePair();
    const requestedReturnTo = request.nextUrl.searchParams.get("returnTo") || "/";
    const returnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/";

    const parResponse = await fetch(discovery.pushed_authorization_request_endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.requestedScopes.join(" "),
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        kyros_sso_version: "v4",
        kyros_edition: config.edition,
        kyros_application_scope: config.applicationScope,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    const par = (await parResponse.json().catch(() => ({}))) as {
      request_uri?: string;
      error?: string;
      error_description?: string;
      issue?: string;
    };

    if (!parResponse.ok || !par.request_uri) {
      console.error("Kyros PAR failed:", {
        status: parResponse.status,
        error: par.error,
        description: par.error_description,
        issue: par.issue,
      });
      return NextResponse.json({ error: "Impossible de démarrer la connexion Kyros" }, { status: 502 });
    }

    const authorizeUrl = new URL(discovery.authorization_endpoint);
    authorizeUrl.searchParams.set("client_id", config.clientId);
    authorizeUrl.searchParams.set("request_uri", par.request_uri);

    const response = NextResponse.redirect(authorizeUrl);
    const secure = process.env.NODE_ENV === "production";
    const common = { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: 600 };
    response.cookies.set(OAUTH_STATE_COOKIE, state, common);
    response.cookies.set(PKCE_VERIFIER_COOKIE, verifier, common);
    response.cookies.set(RETURN_TO_COOKIE, returnTo, common);
    response.cookies.set(KYROS_SERVER_COOKIE, discovery.base_url, common);
    return response;
  } catch (error) {
    console.error("Kyros login error:", error);
    return NextResponse.json({ error: "Configuration Kyros invalide" }, { status: 500 });
  }
}

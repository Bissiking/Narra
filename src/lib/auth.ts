// src/lib/auth.ts
import {
  createHash,
  createHmac,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify as verifySignature,
} from "crypto";
import { NextRequest } from "next/server";

export const SESSION_COOKIE = "narra_session";
export const OAUTH_STATE_COOKIE = "narra_oauth_state";
export const PKCE_VERIFIER_COOKIE = "narra_pkce_verifier";
export const RETURN_TO_COOKIE = "narra_return_to";

export type NarraSession = {
  userId: string;
  kyrosSub: string;
  email: string;
  name: string | null;
  role: string | null;
  exp: number;
};

type KyrosJwtPayload = {
  iss?: string;
  aud?: string | string[];
  resource_aud?: string;
  sub?: string;
  client_id?: string;
  email?: string;
  username?: string;
  display_name?: string;
  role?: string;
  exp?: number;
  nbf?: number;
  [key: string]: unknown;
};

type KyrosJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

type KyrosTokenResponse = {
  token_type?: string;
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  user?: {
    id?: string;
    username?: string;
    email?: string;
    displayName?: string;
    role?: string;
  };
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getKyrosConfig() {
  const baseUrl = requiredEnv("KYROS_BASE_URL").replace(/\/$/, "");
  const appBaseUrl = requiredEnv("NARRA_BASE_URL").replace(/\/$/, "");

  return {
    baseUrl,
    appBaseUrl,
    clientId: requiredEnv("KYROS_CLIENT_ID"),
    clientSecret: process.env.KYROS_CLIENT_SECRET?.trim() || null,
    redirectUri: `${appBaseUrl}/api/auth/callback`,
    scopes: process.env.KYROS_SCOPES?.trim() || "profile email",
    issuer: process.env.KYROS_ISSUER?.trim() || "kyros",
    globalAudience: process.env.KYROS_GLOBAL_AUDIENCE?.trim() || "kyros-modules",
    resourceAudience: requiredEnv("KYROS_RESOURCE_AUDIENCE"),
    edition: process.env.KYROS_EDITION?.trim() || "standard",
    applicationScope: process.env.KYROS_APPLICATION_SCOPE?.trim() || "standard",
  };
}

export function createPkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

function sessionSecret() {
  const secret = process.env.NARRA_SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("NARRA_SESSION_SECRET must contain at least 32 characters");
  }
  return secret;
}

export function createSessionToken(session: Omit<NarraSession, "exp">, maxAgeSeconds = 60 * 60 * 8) {
  const payload: NarraSession = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): NarraSession | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = createHmac("sha256", sessionSecret()).update(body).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as NarraSession;
    if (!session.userId || !session.kyrosSub || !session.exp) return null;
    if (session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

function decodeJsonPart<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function audienceContains(aud: string | string[] | undefined, expected: string) {
  return typeof aud === "string" ? aud === expected : Array.isArray(aud) && aud.includes(expected);
}

export async function verifyKyrosAccessToken(token: string): Promise<KyrosJwtPayload> {
  const config = getKyrosConfig();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid Kyros access token format");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJsonPart<{ alg?: string; kid?: string }>(encodedHeader);
  const payload = decodeJsonPart<KyrosJwtPayload>(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) throw new Error("Kyros token must use RS256 with kid");

  const jwksResponse = await fetch(`${config.baseUrl}/sso/v4/jwks`, { cache: "no-store" });
  if (!jwksResponse.ok) throw new Error(`Unable to fetch Kyros JWKS (${jwksResponse.status})`);
  const jwks = (await jwksResponse.json()) as { keys?: KyrosJwk[] };
  const jwk = jwks.keys?.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Kyros signing key not found in JWKS");

  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const validSignature = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    Buffer.from(encodedSignature, "base64url")
  );
  if (!validSignature) throw new Error("Invalid Kyros token signature");

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) throw new Error("Kyros token expired");
  if (payload.nbf && payload.nbf > now + 5) throw new Error("Kyros token not active yet");
  if (payload.iss !== config.issuer) throw new Error("Invalid Kyros issuer");
  if (!audienceContains(payload.aud, config.globalAudience)) throw new Error("Invalid Kyros global audience");
  if (payload.resource_aud !== config.resourceAudience) throw new Error("Invalid Kyros resource audience");
  if (payload.client_id !== config.clientId) throw new Error("Kyros token client mismatch");
  if (!payload.sub) throw new Error("Kyros token has no subject");

  return payload;
}

export async function exchangeAuthorizationCode(code: string, verifier: string): Promise<KyrosTokenResponse> {
  const config = getKyrosConfig();
  const body: Record<string, string> = {
    grant_type: "authorization_code",
    client_id: config.clientId,
    code,
    code_verifier: verifier,
    redirect_uri: config.redirectUri,
    kyros_sso_version: "v4",
    kyros_edition: config.edition,
    kyros_application_scope: config.applicationScope,
  };
  if (config.clientSecret) body.client_secret = config.clientSecret;

  const response = await fetch(`${config.baseUrl}/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as KyrosTokenResponse & { error?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(`Kyros token exchange failed: ${data.error || response.status}`);
  }
  return data;
}

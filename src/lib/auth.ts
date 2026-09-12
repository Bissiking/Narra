// src/lib/auth.ts
import {
  createHash,
  createHmac,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify as verifySignature,
} from "crypto";
import type { JsonWebKey } from "crypto";
import { NextRequest } from "next/server";

export const SESSION_COOKIE = "narra_session";
export const OAUTH_STATE_COOKIE = "narra_oauth_state";
export const PKCE_VERIFIER_COOKIE = "narra_pkce_verifier";
export const RETURN_TO_COOKIE = "narra_return_to";
export const KYROS_SERVER_COOKIE = "narra_kyros_server";

export type NarraSession = {
  userId: string;
  kyrosSub: string;
  email: string;
  name: string | null;
  role: string | null;
  exp: number;
};

export type KyrosDiscovery = {
  base_url: string;
  issuer: string;
  audience: string;
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint?: string;
  pushed_authorization_request_endpoint: string;
  jwks_uri: string;
  sso_versions_supported: string[];
  sso_v4_enabled: boolean;
  code_challenge_methods_supported: string[];
  authorization_response_iss_parameter_supported: boolean;
  access_token_signing_alg_values_supported: Record<string, string[]>;
  scopes_supported: string[];
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
  scope?: string;
  sso_version?: string;
  jti?: string;
  auth_time?: number;
  amr?: string[];
  acr?: string;
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

function env(name: string): string | null {
  return process.env[name]?.trim() || null;
}

export function getAppBaseUrl() {
  return (env("NARRA_BASE_URL") || env("NEXTAUTH_URL") || "http://localhost:3000").replace(/\/$/, "");
}

export function getKyrosConfig() {
  const configuredVersion = env("KYROS_SSO_VERSION") || "v4";
  if (configuredVersion !== "v4") {
    throw new Error(`Narra requires KYROS_SSO_VERSION=v4 (received ${configuredVersion})`);
  }

  const baseUrl = (
    env("KYROS_BASE_URL") ||
    (process.env.NODE_ENV === "production" ? "https://kyros.mhemery.fr" : "http://localhost:3001")
  ).replace(/\/$/, "");
  const requestedScopes = (env("KYROS_REQUESTED_SCOPE") || env("KYROS_SCOPES") || "profile email")
    .split(/\s+/)
    .filter(Boolean);
  const requiredScopes = (env("KYROS_REQUIRED_SCOPES") || requestedScopes.join(" "))
    .split(/\s+/)
    .filter(Boolean);
  const timeoutSeconds = Number(env("KYROS_TIMEOUT_SECONDS") || "5");

  return {
    baseUrl,
    fallbackBaseUrl: (env("KYROS_FALLBACK_BASE_URL") || "https://kyros.mhemery.fr").replace(/\/$/, ""),
    appBaseUrl: getAppBaseUrl(),
    clientId: requiredEnv("KYROS_CLIENT_ID"),
    clientSecret: env("KYROS_CLIENT_SECRET"),
    redirectUri: `${getAppBaseUrl()}/api/auth/callback`,
    requestedScopes,
    requiredScopes,
    expectedIssuer: env("KYROS_ISSUER"),
    globalAudience: env("KYROS_AUDIENCE") || env("KYROS_GLOBAL_AUDIENCE") || "kyros-modules",
    resourceAudience: requiredEnv("KYROS_RESOURCE_AUDIENCE"),
    edition: env("KYROS_EDITION") || "standard",
    applicationScope: env("KYROS_APPLICATION_SCOPE") || "standard",
    timeoutMs: Number.isFinite(timeoutSeconds) && timeoutSeconds > 0 ? timeoutSeconds * 1000 : 5000,
    endpointOverrides: {
      authorization: env("KYROS_AUTHORIZE_URL"),
      token: env("KYROS_TOKEN_URL"),
      par: env("KYROS_PAR_URL"),
      jwks: env("KYROS_JWKS_URL"),
    },
  };
}

function assertHttpEndpoint(value: unknown, name: string): string {
  if (typeof value !== "string") throw new Error(`Kyros discovery is missing ${name}`);
  const url = new URL(value);
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error(`Kyros ${name} must use HTTPS (HTTP is only allowed on localhost)`);
  }
  return url.toString();
}

function validateDiscovery(value: unknown): KyrosDiscovery {
  if (!value || typeof value !== "object") throw new Error("Invalid Kyros discovery document");
  const document = value as Partial<KyrosDiscovery>;
  const config = getKyrosConfig();

  if (!document.issuer || (config.expectedIssuer && document.issuer !== config.expectedIssuer)) {
    throw new Error("Kyros discovery issuer does not match the configured issuer");
  }
  if (document.audience !== config.globalAudience) {
    throw new Error("Kyros discovery audience does not match KYROS_AUDIENCE");
  }

  if (!document.sso_v4_enabled || !document.sso_versions_supported?.includes("v4")) {
    throw new Error("Kyros SSO v4 is not enabled by this server");
  }
  if (!document.code_challenge_methods_supported?.includes("S256")) {
    throw new Error("Kyros SSO v4 does not advertise PKCE S256");
  }
  if (!document.authorization_response_iss_parameter_supported) {
    throw new Error("Kyros SSO v4 does not advertise the callback issuer parameter");
  }
  if (!document.access_token_signing_alg_values_supported?.v4?.includes("RS256")) {
    throw new Error("Kyros SSO v4 does not advertise RS256 access tokens");
  }

  const unsupportedScopes = config.requestedScopes.filter(
    (scope) => !document.scopes_supported?.includes(scope)
  );
  if (unsupportedScopes.length > 0) {
    throw new Error(`Scopes not supported by Kyros native SSO v4: ${unsupportedScopes.join(", ")}`);
  }
  const unrequestedRequiredScopes = config.requiredScopes.filter(
    (scope) => !config.requestedScopes.includes(scope)
  );
  if (unrequestedRequiredScopes.length > 0) {
    throw new Error(`Required scopes must also be requested: ${unrequestedRequiredScopes.join(", ")}`);
  }

  return {
    ...document,
    issuer: String(document.issuer || ""),
    audience: String(document.audience || ""),
    authorization_endpoint: assertHttpEndpoint(document.authorization_endpoint, "authorization_endpoint"),
    token_endpoint: assertHttpEndpoint(document.token_endpoint, "token_endpoint"),
    pushed_authorization_request_endpoint: assertHttpEndpoint(
      document.pushed_authorization_request_endpoint,
      "pushed_authorization_request_endpoint"
    ),
    jwks_uri: assertHttpEndpoint(document.jwks_uri, "jwks_uri"),
  } as KyrosDiscovery;
}

export async function discoverKyros(preferredBaseUrl?: string): Promise<KyrosDiscovery> {
  const config = getKyrosConfig();
  const allowedBaseUrls = [...new Set([config.baseUrl, config.fallbackBaseUrl])];
  if (preferredBaseUrl && !allowedBaseUrls.includes(preferredBaseUrl)) {
    throw new Error("Invalid Kyros server selected for this authorization transaction");
  }
  const candidates = preferredBaseUrl ? [preferredBaseUrl] : allowedBaseUrls;
  const failures: string[] = [];

  for (const baseUrl of candidates) {
    try {
      const response = await fetch(`${baseUrl}/.well-known/kyros-configuration`, {
        cache: "no-store",
        signal: AbortSignal.timeout(config.timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const discovery = validateDiscovery(await response.json());
      const useOverrides = baseUrl === config.baseUrl;
      return {
        ...discovery,
        base_url: baseUrl,
        authorization_endpoint: useOverrides && config.endpointOverrides.authorization
          ? assertHttpEndpoint(config.endpointOverrides.authorization, "authorization_endpoint")
          : discovery.authorization_endpoint,
        token_endpoint: useOverrides && config.endpointOverrides.token
          ? assertHttpEndpoint(config.endpointOverrides.token, "token_endpoint")
          : discovery.token_endpoint,
        pushed_authorization_request_endpoint: useOverrides && config.endpointOverrides.par
          ? assertHttpEndpoint(config.endpointOverrides.par, "pushed_authorization_request_endpoint")
          : discovery.pushed_authorization_request_endpoint,
        jwks_uri: useOverrides && config.endpointOverrides.jwks
          ? assertHttpEndpoint(config.endpointOverrides.jwks, "jwks_uri")
          : discovery.jwks_uri,
      };
    } catch (error) {
      failures.push(`${baseUrl}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  throw new Error(`Unable to discover a compatible Kyros SSO v4 server (${failures.join("; ")})`);
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

export async function verifyKyrosAccessToken(
  token: string,
  selectedDiscovery?: KyrosDiscovery
): Promise<KyrosJwtPayload> {
  const config = getKyrosConfig();
  const discovery = selectedDiscovery || await discoverKyros();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid Kyros access token format");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJsonPart<{ alg?: string; kid?: string }>(encodedHeader);
  const payload = decodeJsonPart<KyrosJwtPayload>(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) throw new Error("Kyros token must use RS256 with kid");

  const jwksResponse = await fetch(discovery.jwks_uri, {
    cache: "no-store",
    signal: AbortSignal.timeout(config.timeoutMs),
  });
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
  const expectedIssuer = config.expectedIssuer || discovery.issuer;
  if (payload.iss !== expectedIssuer) throw new Error("Invalid Kyros issuer");
  if (!audienceContains(payload.aud, config.globalAudience)) throw new Error("Invalid Kyros global audience");
  if (payload.resource_aud !== config.resourceAudience) throw new Error("Invalid Kyros resource audience");
  if (payload.client_id !== config.clientId) throw new Error("Kyros token client mismatch");
  if (!payload.sub) throw new Error("Kyros token has no subject");
  if (payload.sso_version !== "v4") throw new Error("Kyros token is not an SSO v4 token");
  if (!payload.jti || typeof payload.auth_time !== "number") {
    throw new Error("Kyros token is missing required SSO v4 claims");
  }

  const grantedScopes = new Set((payload.scope || "").split(/\s+/).filter(Boolean));
  const missingScopes = config.requiredScopes.filter((scope) => !grantedScopes.has(scope));
  if (missingScopes.length > 0) {
    throw new Error(`Kyros token is missing required scopes: ${missingScopes.join(", ")}`);
  }

  return payload;
}

export async function exchangeAuthorizationCode(
  code: string,
  verifier: string,
  selectedDiscovery?: KyrosDiscovery
): Promise<KyrosTokenResponse> {
  const config = getKyrosConfig();
  const discovery = selectedDiscovery || await discoverKyros();
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

  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  const data = (await response.json().catch(() => ({}))) as KyrosTokenResponse & { error?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(`Kyros token exchange failed: ${data.error || response.status}`);
  }
  return data;
}

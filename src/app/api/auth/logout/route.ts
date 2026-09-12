// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", getAppBaseUrl()));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

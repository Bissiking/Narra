// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getKyrosConfig, SESSION_COOKIE } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  const config = getKyrosConfig();
  const response = NextResponse.redirect(new URL("/", config.appBaseUrl));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

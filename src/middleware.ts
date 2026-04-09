import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const privatePrefixes = [
  "/dashboard",
  "/profile",
  "/messages",
  "/notifications",
  "/tickets",
  "/map",
  "/groups",
  "/friends",
  "/local",
  "/scanner",
  "/admin",
  "/venue",
];

export function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = req.nextUrl;

  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), geolocation=(self), microphone=()");

  if (privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  }

  return response;
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};

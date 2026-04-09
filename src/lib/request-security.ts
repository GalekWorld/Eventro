import { NextResponse } from "next/server";

function getRequestOrigin(headers: Headers) {
  const originHeader = headers.get("origin");
  if (!originHeader) {
    return null;
  }

  try {
    return new URL(originHeader);
  } catch {
    return null;
  }
}

function getExpectedOrigin(headers: Headers) {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) {
    return null;
  }

  const protocol = headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  try {
    return new URL(`${protocol}://${host}`);
  } catch {
    return null;
  }
}

export function isAllowedSameOriginRequest(request: Request) {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "same-site" && secFetchSite !== "none") {
    return false;
  }

  const requestOrigin = getRequestOrigin(request.headers);
  if (!requestOrigin) {
    return true;
  }

  const expectedOrigin = getExpectedOrigin(request.headers);
  if (!expectedOrigin) {
    return false;
  }

  return requestOrigin.origin === expectedOrigin.origin;
}

export function hasJsonContentType(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/json");
}

export function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function validateJsonApiRequest(request: Request) {
  if (!isAllowedSameOriginRequest(request)) {
    return jsonError("ORIGIN_NOT_ALLOWED", 403);
  }

  if (!hasJsonContentType(request)) {
    return jsonError("INVALID_CONTENT_TYPE", 415);
  }

  return null;
}

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
  const expectedOrigin = getExpectedOrigin(request.headers);
  if (!expectedOrigin) {
    return false;
  }

  if (!requestOrigin) {
    const referer = request.headers.get("referer");
    if (!referer) {
      return true;
    }

    try {
      return new URL(referer).origin === expectedOrigin.origin;
    } catch {
      return false;
    }
  }

  return requestOrigin.origin === expectedOrigin.origin;
}

export function hasJsonContentType(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.includes("application/json");
}

export function getJsonApiRequestError(request: Request) {
  if (!isAllowedSameOriginRequest(request)) {
    return {
      message: "ORIGIN_NOT_ALLOWED",
      status: 403,
    };
  }

  if (!hasJsonContentType(request)) {
    return {
      message: "INVALID_CONTENT_TYPE",
      status: 415,
    };
  }

  return null;
}

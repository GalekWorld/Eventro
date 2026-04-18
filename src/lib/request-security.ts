import { NextResponse } from "next/server";
import { getJsonApiRequestError, hasJsonContentType, isAllowedSameOriginRequest } from "@/lib/request-origin";

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
  const error = getJsonApiRequestError(request);
  if (error) {
    return jsonError(error.message, error.status);
  }

  return null;
}

export { hasJsonContentType, isAllowedSameOriginRequest };

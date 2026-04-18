import assert from "node:assert/strict";
import { getJsonApiRequestError, isAllowedSameOriginRequest } from "../src/lib/request-origin.ts";

function createRequest(headers: Record<string, string>) {
  return new Request("https://eventro.app/api/test", {
    method: "POST",
    headers: new Headers(headers),
    body: JSON.stringify({ ok: true }),
  });
}

export async function runRequestSecurityTests() {
  const sameOriginRequest = createRequest({
    origin: "https://eventro.app",
    host: "eventro.app",
    "x-forwarded-proto": "https",
    "content-type": "application/json",
    "sec-fetch-site": "same-origin",
  });

  assert.equal(isAllowedSameOriginRequest(sameOriginRequest), true);

  const crossOriginRequest = createRequest({
    origin: "https://attacker.test",
    host: "eventro.app",
    "x-forwarded-proto": "https",
    "content-type": "application/json",
    "sec-fetch-site": "cross-site",
  });

  assert.equal(isAllowedSameOriginRequest(crossOriginRequest), false);

  const allowedRequest = createRequest({
    referer: "https://eventro.app/profile",
    host: "eventro.app",
    "x-forwarded-proto": "https",
    "content-type": "application/json",
  });

  const rejectedRequest = createRequest({
    referer: "https://evil.test/phishing",
    host: "eventro.app",
    "x-forwarded-proto": "https",
    "content-type": "application/json",
  });

  assert.equal(isAllowedSameOriginRequest(allowedRequest), true);
  assert.equal(isAllowedSameOriginRequest(rejectedRequest), false);

  const invalidContentTypeRequest = new Request("https://eventro.app/api/test", {
    method: "POST",
    headers: new Headers({
      origin: "https://eventro.app",
      host: "eventro.app",
      "x-forwarded-proto": "https",
      "content-type": "text/plain",
    }),
    body: "hello",
  });

  assert.deepEqual(getJsonApiRequestError(invalidContentTypeRequest), {
    message: "INVALID_CONTENT_TYPE",
    status: 415,
  });
}

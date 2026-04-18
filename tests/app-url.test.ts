import assert from "node:assert/strict";
import { getAppBaseUrl } from "../src/lib/app-url.ts";

function withEnv(overrides: Record<string, string | undefined>, run: () => void) {
  const previous = new Map<string, string | undefined>();

  for (const key of Object.keys(overrides)) {
    previous.set(key, process.env[key]);
    const value = overrides[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

export function runAppUrlTests() {
  withEnv({ NODE_ENV: "development", APP_URL: undefined }, () => {
    assert.equal(getAppBaseUrl(), "http://localhost:3000");
  });

  withEnv({ NODE_ENV: "production", APP_URL: undefined }, () => {
    assert.throws(() => getAppBaseUrl(), /APP_URL es obligatoria en produccion\./);
  });

  withEnv({ NODE_ENV: "production", APP_URL: "http://eventro.test" }, () => {
    assert.throws(() => getAppBaseUrl(), /APP_URL debe usar https en produccion\./);
  });

  withEnv({ NODE_ENV: "production", APP_URL: "https://eventro.app/path?foo=bar" }, () => {
    assert.equal(getAppBaseUrl(), "https://eventro.app");
  });
}

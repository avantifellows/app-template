import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// @ts-expect-error plain JS build script
import { keysFrom } from "../scripts/write-env.mjs";

test("write-env takes its keys from .env.example, never the test login", () => {
  const keys = keysFrom(fs.readFileSync(new URL("../.env.example", import.meta.url), "utf8")) as string[];
  for (const k of ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "AUTH_URL", "AUTH_TRUST_HOST", "DATA_DATABASE_URL"]) assert.ok(keys.includes(k), k);
  assert.ok(!keys.includes("ENABLE_TEST_LOGIN"));
});

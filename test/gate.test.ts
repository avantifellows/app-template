import { test } from "node:test";
import assert from "node:assert/strict";
import { decide } from "../src/lib/gate.ts";
// @ts-expect-error plain JS helper shared with the go-live check
import { appRoutes } from "../scripts/routes.mjs";

test("signed out: only sign-in and Next's static files are open", () => {
  for (const p of ["/login", "/api/auth/signin", "/api/auth/callback/google", "/_next/static/chunks/a.js", "/robots.txt", "/favicon.ico"]) {
    assert.equal(decide(p, false), "next", p);
  }
  for (const p of ["/", "/dashboard", "/Login", "/login/x", "/_next/image", "/robots.txt.bak", "/api"]) {
    assert.notEqual(decide(p, false), "next", p);
  }
});

test("signed out: pages go to /login, API routes answer 401, in any case", () => {
  assert.equal(decide("/reports", false), "login");
  assert.equal(decide("/api/me", false), "unauthorized");
  assert.equal(decide("/API/me", false), "unauthorized");
});

test("encoded dots, slashes and backslashes are refused for everyone", () => {
  for (const p of ["/api/auth/%2e%2e/me", "/api/auth/..%2Fme", "/x%5cy", "/a\\b"]) {
    assert.equal(decide(p, false), "bad", p);
    assert.equal(decide(p, true), "bad", p);
  }
});

test("signed in: everything else goes through", () => {
  assert.equal(decide("/", true), "next");
  assert.equal(decide("/api/me", true), "next");
});

test("every page and API route in src/app needs a session (catches a route added to the open list)", () => {
  const routes = appRoutes(new URL("../src/app", import.meta.url).pathname) as { path: string }[];
  assert.ok(routes.length >= 3);
  for (const r of routes) {
    if (r.path === "/login" || r.path.startsWith("/api/auth")) continue;
    assert.notEqual(decide(r.path, false), "next", r.path);
  }
});

/**
 * Deny by default: the only paths open without signing in are listed here. Everything else, including any page or
 * API route added later, needs a session. Used by src/proxy.ts; pages and API routes check the session again
 * (src/lib/session.ts), because the proxy alone is not enough.
 *
 * Amplify serves public/ and /_next/static/ from its CDN without running the proxy at all, so nothing private may
 * ever go in public/ (the go-live check enforces it).
 */
const OPEN_EXACT = new Set(["/login", "/favicon.ico", "/robots.txt"]);
const OPEN_PREFIX = ["/api/auth/", "/_next/static/"];

export type Decision = "next" | "login" | "unauthorized" | "bad";

export function decide(pathname: string, signedIn: boolean): Decision {
  // Encoded dots, slashes and backslashes are never needed here; refusing them stops paths that look open but
  // resolve elsewhere.
  if (/%2e|%2f|%5c|\\/i.test(pathname)) return "bad";
  if (OPEN_EXACT.has(pathname) || OPEN_PREFIX.some((p) => pathname.startsWith(p))) return "next";
  if (signedIn) return "next";
  const p = pathname.toLowerCase();
  return p === "/api" || p.startsWith("/api/") ? "unauthorized" : "login";
}

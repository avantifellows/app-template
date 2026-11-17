import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { decide } from "@/lib/gate";

// No matcher: the proxy sees every request and src/lib/gate.ts decides. Signed out, pages go to /login and API
// routes answer 401.
export default auth((req) => {
  switch (decide(req.nextUrl.pathname, Boolean(req.auth?.user))) {
    case "next":
      return NextResponse.next();
    case "bad":
      return new NextResponse("Bad request", { status: 400 });
    case "unauthorized":
      return NextResponse.json({ error: "signed out" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    case "login":
      return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
});

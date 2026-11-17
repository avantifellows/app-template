import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { audit } from "@/lib/audit";
import { allowedProfile, DOMAIN, personId } from "@/lib/rules";
import pkg from "../package.json";

/**
 * Google sign-in for avantifellows.org accounts only (rules in src/lib/rules.ts). The session is a signed cookie;
 * nothing is stored on the server. session.user.id is the person as `email:someone@avantifellows.org`.
 *
 * The test login is for local work only: it needs ENABLE_TEST_LOGIN=true AND a non-production build, so a deployed
 * site can never offer it even if the variable is set there.
 */
export const testLoginEnabled = process.env.ENABLE_TEST_LOGIN === "true" && process.env.NODE_ENV !== "production";

const appName = pkg.name.replace(/[^a-z0-9-]/gi, "");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // hd only preselects AF accounts on Google's screen; the real check is in signIn below.
    Google({ authorization: { params: { prompt: "select_account", hd: DOMAIN } } }),
    ...(testLoginEnabled
      ? [
          Credentials({
            id: "test",
            name: "Test user",
            credentials: {},
            authorize: () => ({ id: "test-user", email: "test.user@localhost", name: "Test user" }),
          }),
        ]
      : []),
  ],
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider === "test") return testLoginEnabled;
      return account?.provider === "google" && allowedProfile(profile);
    },
    jwt({ token, profile, user }) {
      const email = profile?.email ?? user?.email;
      if (email) token.email = email.toLowerCase();
      const name = profile?.name ?? user?.name;
      if (name) token.name = name;
      return token;
    },
    session({ session, token }) {
      if (token.email) {
        session.user.id = personId("email", token.email);
        session.user.email = token.email;
      }
      if (token.name) session.user.name = token.name;
      return session;
    },
  },
  events: {
    signIn({ user }) {
      if (user.email) audit(personId("email", user.email), "sign_in");
    },
  },
  // Own cookie name: on localhost every port shares cookies, and other AF apps use the default name.
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? `__Secure-${appName}.session-token` : `${appName}.session-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" },
    },
  },
  pages: { signIn: "/login", error: "/login" },
});

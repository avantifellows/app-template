# AF app template

Starting point for small Avanti Fellows internal apps: Next.js on AWS Amplify, Google sign-in for
avantifellows.org accounts only, every page and API behind sign-in, and a go-live check before the app gets its
real address. The rules the app must follow are in [CLAUDE.md](CLAUDE.md); read them first.

The path: mock it up as a Claude artifact → build from this template → go-live check → `<app>.avantifellows.org`.

## Who does what

**Approvers: Pritam, Deepansh or Surya.** Builders do not need AWS, Google Cloud or Cloudflare access.

| Step | Who |
|---|---|
| Create the repo from this template in the avantifellows GitHub org | Approver (adds the builder) |
| Build the app locally | Builder |
| Read-only credentials for live data (Postgres role, BigQuery service account) | A dev |
| Anything that saves data, a new schema, school-scoped access | A dev, before it is built |
| OAuth client in Google Cloud project `af-internal-apps` | Approver |
| Amplify app in the AF AWS account, env variables, `amplify.yml` | Approver |
| Custom URL `<app>.avantifellows.org` (Amplify + Cloudflare) | Approver |
| Go-live check and review | Approver, with the builder |

## Build locally

```sh
npm install
cp .env.example .env.local      # AUTH_SECRET: openssl rand -hex 32; ENABLE_TEST_LOGIN=true
npm run dev                     # http://localhost:3000, "Continue as test user"
npm test && npm run typecheck
```

Google sign-in locally needs the app's OAuth client (an approver adds `http://localhost:3000` to it); until then
use the test login. Rename `"name"` in `package.json` to the app's name (it names the session cookie).

## Going live (approver)

1. **OAuth client.** Google Cloud console → project `af-internal-apps` → Google Auth Platform → Clients → Create
   client → Web application, named after the app. Authorised redirect URIs:
   `https://<app>.avantifellows.org/api/auth/callback/google` and
   `http://localhost:3000/api/auth/callback/google`. One client per app; delete it when the app is retired.
2. **Amplify app.** AF AWS account, ap-south-1 → Amplify → new app from the avantifellows GitHub repo, branch
   `main`. It uses the repo's `amplify.yml` (the standard one; do not edit). Environment variables: every key in
   `.env.example` that the app needs (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL`,
   `AUTH_TRUST_HOST=true`, data credentials). The build fails if the sign-in ones are missing.
3. **Custom URL.** Amplify → Hosting → Custom domains → Add domain → `avantifellows.org`, subdomain `<app>`
   only (never the root or `www`), with Amplify's managed certificate. Amplify shows two CNAME records: one to
   verify the certificate and one for `<app>` pointing at its CloudFront address. Add both in Cloudflare
   (avantifellows.org → DNS) with **proxy status "DNS only"** (grey cloud): proxied, the certificate check
   and Amplify's own CDN get in each other's way. Wait until Amplify shows the domain as Available.
4. **Point sign-in at it.** Set `AUTH_URL=https://<app>.avantifellows.org` in Amplify and redeploy. If it stays
   the amplifyapp.com address (or is missing), Google sign-in sends people to the wrong place.
5. **Go-live check**, from a clean checkout of this template (not the app's own copy):

   ```sh
   node scripts/go-live.mjs --repo ../<app> --url https://<app>.avantifellows.org
   ```

   It writes `go-live-report.md` in the app's repo: secret scan of the whole history, repo hygiene, the standard
   files unchanged, writes/storage/personal data to look at, `npm audit`, and a signed-out sweep of every route.
   Fix every FAIL, then go through the approver list at the end of the report.
6. **Record it.** App list on af-docs (owner, data touched, review/retire date); DPDPA register if it touches
   personal data.

Until step 6 the app is shared only by its amplifyapp.com address, with the builder.

## What is in here

| Path | What |
|---|---|
| `src/auth.ts`, `src/lib/rules.ts` | Google sign-in; only verified avantifellows.org Workspace accounts (`hd` and email both checked) |
| `src/proxy.ts`, `src/lib/gate.ts` | Deny by default: signed out, pages go to `/login` and `/api/*` answers 401; only sign-in is open |
| `src/lib/session.ts` | `requireUser()` for pages and server actions, `apiUser()` for API routes; call them everywhere |
| `src/lib/audit.ts` | `audit(user.id, action, detail)`: who did what, as a line in Amplify's logs |
| `src/lib/db.ts` | `read(sql, params)`: live Postgres data, read-only |
| `next.config.ts` | No caching, no indexing, no framing, on every page |
| `scripts/write-env.mjs` | Amplify build step: env variables from the console to the server |
| `scripts/go-live.mjs` | The go-live check |

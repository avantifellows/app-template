# AF app template

A starting point for small Avanti Fellows internal apps, built with Claude, no coding needed. Sign-in with
avantifellows.org Google accounts, every page private, and the rules are already set up.

## Should this be an app?

**Start with a Claude artifact. Move to an app only when you have to.**

An artifact is enough when:
- it is a mockup, a calculator, a checklist, an explainer, or a dashboard of summary numbers;
- it shows no student personal data: no names, phone numbers, roll numbers or per-student marks;
- it is fine as a page shared by link.

Build an app from this template when:
- it shows student records or other personal data;
- it needs live data from our databases, kept up to date, not numbers pasted in once;
- only AF staff should see it, signed in with their AF Google account, with a record of who used it.

Talk to a dev before building if:
- different people should see different schools;
- it needs to save anything: notes, edits, uploads, statuses;
- people outside AF need to use it.

## How it works

1. Mock it up as a Claude artifact, so everyone agrees on what it does.
2. Ask Pritam, Deepansh or Surya for a repo made from this template (and, for live data, a dev for read-only
   access).
3. Open the repo in Claude Code. Claude asks the questions below first, writes the answers into `APP.md`, then
   builds. Sign-in, privacy and the rules are already in place, and Claude will not take them out.
4. When it works, an approver runs the go-live check and gives it its address: `<app>.avantifellows.org`.

You do not need to code, or have AWS, Google Cloud, Vercel or Cloudflare accounts. Never put data files in the
repo, student details in logs or anything shared, or host the app on your own accounts. The full rules are in
[CLAUDE.md](CLAUDE.md).

Under the hood: Next.js on AWS Amplify, Google sign-in for avantifellows.org accounts only, every page and API
behind sign-in, and a go-live check before the app gets its real address.

## Before you start

Most of these apps are built with Claude. The first conversation in a new repo always starts with the questions in
[APP.md](APP.md), and the answers are kept there (CLAUDE.md tells Claude to do this):

1. What is it for, and who uses it?
2. Does it show student personal data? If not, a Claude artifact may be enough.
3. Who sees what: all AF staff, or only some schools (needs a dev)?
4. Does it save anything (needs a dev)?
5. What data does it read, and from where (credentials from a dev)?
6. Who owns it, and when is it reviewed or retired?

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

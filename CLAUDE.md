# CLAUDE.md: rules for this app

This is an Avanti Fellows internal app built from `avantifellows/app-template`. The people building it may not be
developers. Follow these rules exactly; when a request would break one, say which rule and that it needs a dev or
an approver (Pritam, Deepansh or Surya). Do not find a way around it.

## First: the app brief

Before writing or changing any code, open `APP.md`. If it says `Status: not filled in`, or a line is blank, stop and
ask the builder these questions, one or two at a time, in plain words:

1. What is the app for, and who will use it?
2. Will it show student personal data: names, phone numbers, roll numbers, marks per student?
   If no, say that a Claude artifact may be enough and there may be no need for this repo.
3. Who should see what? Every signed-in AF staff member sees everything (fine), or each person only some
   schools (stop: that needs a dev, from LMS seats).
4. Does it need to save anything: notes, edits, uploads, status? If yes, stop: a dev decides where and how first.
5. What data does it read, and from where? Credentials come from a dev; never from the builder's own accounts.
6. Who owns it, and when should it be reviewed or retired?

Write the answers into `APP.md` and change the status line to `Status: filled in <date>`. If an answer is "needs a
dev", say so plainly, write it down, and build only the parts that do not depend on it. When the app changes in a
way that changes an answer, update `APP.md` in the same change.

## Rules

**Sign-in and access**
- Every page lives under `src/app/(app)/` and every API route starts with `apiUser()` → 401. Server actions call
  `requireUser()`. The proxy (`src/proxy.ts`) already blocks signed-out requests; check again anyway.
- Never edit `src/auth.ts`, `src/proxy.ts`, `src/lib/gate.ts`, `src/lib/rules.ts`, `src/lib/session.ts`,
  `src/app/api/auth/`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `amplify.yml`,
  `scripts/write-env.mjs` or the `scripts` in `package.json`. The go-live check fails if they differ from the
  template's. No page or API may be opened to signed-out visitors.
- Access is "every signed-in AF staff member sees everything". If the app should show each person only some
  schools, stop: that comes from LMS seats and needs a dev. Never a hand-made list of emails or schools.
- Only avantifellows.org accounts sign in. People outside AF (partners, students, parents) → a dev.

**Data**
- Read live data with the credentials a dev gives (read-only Postgres via `read()` in `src/lib/db.ts`, a narrow
  BigQuery service account). Never copy data into the repo, a JSON file, `public/` or the code.
- The app saves nothing. No new database, schema, Google Sheet, Firebase, Supabase, Neon, Vercel KV, S3 bucket or
  browser storage for records. If it needs to save anything, stop and involve a dev before building it.
  (`localStorage` is fine for a UI preference such as a chosen filter.)
- `public/` holds only `robots.txt` and `favicon.ico`. Amplify serves it to anyone, signed in or not.

**Personal data**
- No student names, phone numbers, roll numbers, dates of birth or addresses in logs, git, error messages or
  anything published. Show them on screen only if the app needs them.
- Collect only what the app needs. If it touches personal data it needs a DPDPA register entry before go-live.

**Audit**
- Sign-ins are recorded already. Call `audit(user.id, "action", { ids and counts })` for anything sensitive: an
  export, a download of student data. Never put names or personal data in the detail.

**Secrets and hosting**
- Secrets only in `.env.local` (git-ignored) locally and in Amplify's environment variables (an approver sets
  them). Every variable the app reads is listed, without its value, in `.env.example`.
- Repo in the avantifellows GitHub org, Amplify in the AF AWS account, address `<app>.avantifellows.org`. No
  personal GitHub, Vercel, Netlify or databases.

## Commands

`npm run dev` (with `ENABLE_TEST_LOGIN=true` in `.env.local`), `npm test`, `npm run typecheck`, `npm run build`.
Before asking an approver for go-live: `npm run go-live` (repo checks; the approver runs the full one).

This Next.js version may differ from what you know: read `node_modules/next/dist/docs/` before using an API you
are unsure of.

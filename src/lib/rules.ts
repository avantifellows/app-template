/**
 * Who may sign in: a Google account of the avantifellows.org Workspace, nobody else. Google says which Workspace
 * an account belongs to in `hd`; personal Gmail accounts have none. The email must be verified and end in the
 * same domain too. Do not loosen this: an app that needs people outside AF needs a dev.
 */
export const DOMAIN = "avantifellows.org";

export type GoogleProfile = { email?: string | null; email_verified?: boolean | null; hd?: string | null };

export function allowedProfile(p: GoogleProfile | null | undefined): boolean {
  if (!p || p.email_verified !== true || typeof p.email !== "string") return false;
  if (p.hd !== DOMAIN) return false;
  return p.email.trim().toLowerCase().endsWith(`@${DOMAIN}`);
}

/**
 * A person is `kind:value` (today always `email:someone@avantifellows.org`), never a bare email, so another way of
 * signing in can be added later without changing what was saved against people (the NCST platform's rule).
 */
export const personId = (kind: "email", value: string) => `${kind}:${value.trim().toLowerCase()}`;

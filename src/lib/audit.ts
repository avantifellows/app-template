/**
 * The record of who did what: one JSON line per action in the server log (Amplify → CloudWatch). Call it for
 * sign-ins (done in src/auth.ts) and for anything sensitive: an export, a download of student data, a change.
 *
 * Detail holds ids and counts only (a school code, a number of rows), never names, phone numbers, roll numbers or
 * other personal data.
 */
export type AuditDetail = Record<string, string | number | boolean | null>;

export function audit(person: string, action: string, detail: AuditDetail = {}): void {
  console.log(JSON.stringify({ audit: action, person, at: new Date().toISOString(), detail }));
}

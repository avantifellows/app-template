import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type User = { id: string; email: string; name: string };

async function current(): Promise<User | null> {
  const s = await auth();
  if (!s?.user?.id || !s.user.email) return null;
  return { id: s.user.id, email: s.user.email, name: s.user.name ?? s.user.email };
}

/** For pages, layouts and server actions: the signed-in person, or off to /login. */
export async function requireUser(): Promise<User> {
  const user = await current();
  if (!user) redirect("/login");
  return user;
}

/** For API routes: the signed-in person, or null (answer 401). */
export async function apiUser(): Promise<User | null> {
  return current();
}

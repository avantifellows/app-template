import { requireUser } from "@/lib/session";

export default async function Home() {
  const user = await requireUser();
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Hello, {user.name}</h1>
      <p className="mt-2 opacity-80">Start building here. Read CLAUDE.md first: it has the rules this app must follow.</p>
    </div>
  );
}

import { signOut } from "@/auth";
import { requireUser } from "@/lib/session";

// Every page of the app lives under (app)/ and gets the signed-in person from here.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-3 border-b border-black/10 text-sm">
        <span className="font-bold">AF app</span>
        <span className="flex items-center gap-3 opacity-80">
          {user.email}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="underline">Sign out</button>
          </form>
        </span>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}

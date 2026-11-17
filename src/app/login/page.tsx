import { redirect } from "next/navigation";
import { auth, signIn, testLoginEnabled } from "@/auth";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if ((await auth())?.user) redirect("/");
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-black/10 rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-bold">AF app</h1>
        <p className="text-sm opacity-70 mt-1">Sign in with your avantifellows.org account.</p>
        {error && (
          <p className="mt-4 text-sm text-[var(--accent)] bg-red-50 rounded-md px-3 py-2">
            {error === "AccessDenied" ? "Only avantifellows.org accounts can sign in." : "Sign-in failed. Try again."}
          </p>
        )}
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="w-full rounded-md bg-[var(--accent)] text-white font-medium py-2.5">Sign in with Google</button>
        </form>
        {testLoginEnabled && (
          <form
            className="mt-3"
            action={async () => {
              "use server";
              await signIn("test", { redirectTo: "/" });
            }}
          >
            <button className="w-full rounded-md border border-black/10 py-2.5 text-sm">Continue as test user (local only)</button>
          </form>
        )}
      </div>
    </main>
  );
}

import { apiUser } from "@/lib/session";

// Example API route. Every route starts like this, even though the proxy already refused signed-out requests.
export async function GET() {
  const user = await apiUser();
  if (!user) return Response.json({ error: "signed out" }, { status: 401 });
  return Response.json({ id: user.id, name: user.name });
}

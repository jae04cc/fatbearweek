import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Every admin/* route must call this first — the UI hides admin controls for
// non-admins as a nicety, but this is the actual trust boundary.
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}

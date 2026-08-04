import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Session } from "next-auth";

// Shared auth guards for API routes. Both return { session, error }: on failure
// `error` is a ready-to-return NextResponse and `session` is null; on success
// it's the reverse. Callers do `const { session, error } = await …; if (error)
// return error;` and then use `session` with no further null-checking.

// Any logged-in user. Replaces the hand-written
// `const session = await auth(); if (!session?.user?.id) return 401` that was
// copy-pasted across every non-admin route — one audited definition of the
// auth boundary instead of ~15.
export async function requireAuth(): Promise<
  { session: Session; error: null } | { session: null; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

// Admins only — the UI hides admin controls for non-admins as a nicety, but
// this is the actual trust boundary every admin/* route must call first.
export async function requireAdmin(): Promise<
  { session: Session; error: null } | { session: null; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user.isAdmin) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}

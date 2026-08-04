import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Public on purpose — health checks (Docker HEALTHCHECK, the reverse proxy)
// don't carry a session cookie. Returns nothing sensitive: just whether the
// process is up AND can reach its database, which is the real failure mode
// (an unwritable/missing /data volume). A bare 200 that never touches the DB
// would report "healthy" while every actual request 500s.
export async function GET() {
  try {
    await db.run(sql`select 1`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

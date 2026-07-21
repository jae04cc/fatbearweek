// This file runs once when the Next.js server starts.
// We use it to ensure the SQLite schema is initialized (and the bootstrap
// admin account exists) before any requests hit.
export async function register() {
  // Only run in the Node.js runtime (not edge), where the DB lives
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations, bootstrapAdmin } = await import("@/lib/db");
    await runMigrations();
    await bootstrapAdmin();
  }
}

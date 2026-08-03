// This file runs once when the Next.js server starts.
// We use it to ensure the SQLite schema is initialized (and the bootstrap
// admin account exists) before any requests hit.
export async function register() {
  // Only run in the Node.js runtime (not edge), where the DB lives. Every
  // import of DB-backed code has to stay inside this guard — anything reached
  // from module scope gets bundled for the edge runtime too, where `fs` and
  // `crypto` don't resolve.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations, bootstrapAdmin } = await import("@/lib/db");
    await runMigrations();
    await bootstrapAdmin();

    // One-time data migration. Home posts used to be stored oldest-first,
    // because "Add block" appended to the end. They're now stored newest-first,
    // which is also the order players see. The blocks carry no timestamps, but
    // the stored array is chronological, so reversing it once puts existing
    // posts in the right order. The flag makes it idempotent — a second run
    // would put everything back the way it was.
    const { getSetting, setSetting } = await import("@/lib/settings");
    if ((await getSetting("home_content_reversed")) !== "true") {
      const raw = await getSetting("home_content");
      if (raw) {
        try {
          const blocks = JSON.parse(raw);
          if (Array.isArray(blocks)) await setSetting("home_content", JSON.stringify(blocks.reverse()));
        } catch {
          // Malformed content — leave it alone rather than risk destroying it
        }
      }
      await setSetting("home_content_reversed", "true");
    }
  }
}

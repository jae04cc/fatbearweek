import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { generateId } from "@/lib/utils";
import { hashPassword, generateRandomPassword } from "@/lib/password";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "fatbearweek.db");

// Ensure the data directory exists (important for Docker volume mounts)
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// @libsql/client uses the file: protocol for local SQLite.
// Unlike better-sqlite3, it is async and has a pure-WASM fallback —
// no native compilation (node-gyp) required.
const client = createClient({ url: `file:${DB_PATH}` });

export const db = drizzle(client, { schema });

// Called once at server startup via src/instrumentation.ts
export async function runMigrations() {
  // SQLite/libsql don't enforce declared FK constraints unless this is set —
  // required for ON DELETE CASCADE (e.g. deleting a user cascades their picks)
  // to actually fire.
  await client.execute("PRAGMA foreign_keys = ON");

  // executeMultiple runs a batch of DDL statements in one shot
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS bears (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      identification TEXT,
      bio TEXT,
      photo_before_url TEXT,
      photo_after_url TEXT,
      is_bye INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matchups (
      id TEXT PRIMARY KEY,
      round INTEGER NOT NULL,
      position INTEGER NOT NULL,
      bear_a_id TEXT REFERENCES bears(id),
      bear_b_id TEXT REFERENCES bears(id),
      feeder_matchup_a_id TEXT REFERENCES matchups(id),
      feeder_matchup_b_id TEXT REFERENCES matchups(id),
      winner_bear_id TEXT REFERENCES bears(id),
      decided_at INTEGER
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_matchups_round_position ON matchups(round, position);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      oidc_sub TEXT UNIQUE,
      display_name TEXT,
      is_admin INTEGER NOT NULL DEFAULT 0,
      is_bootstrap INTEGER NOT NULL DEFAULT 0,
      has_paid INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      last_login_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_picks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      matchup_id TEXT NOT NULL REFERENCES matchups(id) ON DELETE CASCADE,
      picked_bear_id TEXT NOT NULL REFERENCES bears(id),
      updated_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_picks_user_matchup ON user_picks(user_id, matchup_id);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Additive column migration for databases created before is_bootstrap existed
  const userCols = await client.execute("PRAGMA table_info(users)");
  if (!userCols.rows.some((r) => r[1] === "is_bootstrap")) {
    await client.execute("ALTER TABLE users ADD COLUMN is_bootstrap INTEGER NOT NULL DEFAULT 0");
  }
  // Backfill: the literal "admin" bootstrap account predates this flag on
  // any database created before this migration — flag it retroactively.
  await client.execute("UPDATE users SET is_bootstrap = 1 WHERE username = 'admin' AND is_bootstrap = 0");

  // Additive column migration for databases created before identification existed
  const bearCols = await client.execute("PRAGMA table_info(bears)");
  if (!bearCols.rows.some((r) => r[1] === "identification")) {
    await client.execute("ALTER TABLE bears ADD COLUMN identification TEXT");
  }
}

// Called once at server startup, after runMigrations(). If no users exist yet,
// creates a bootstrap "admin" account with a random password logged to stdout
// so the operator can log in once and create real pool-member accounts.
export async function bootstrapAdmin() {
  const existing = await client.execute("SELECT COUNT(*) as count FROM users");
  const count = Number(existing.rows[0]?.count ?? 0);
  if (count > 0) return;

  const password = generateRandomPassword();
  const passwordHash = await hashPassword(password);
  const id = generateId();
  const now = Date.now();

  await db.insert(schema.users).values({
    id,
    username: "admin",
    passwordHash,
    displayName: "Admin",
    isAdmin: true,
    isBootstrap: true,
    hasPaid: false,
    createdAt: new Date(now),
  });

  // eslint-disable-next-line no-console
  console.log(
    "\n=========================================================\n" +
      "  Fat Bear Week — bootstrap admin account created\n" +
      "  Username: admin\n" +
      `  Password: ${password}\n` +
      "  Log in once, then create real pool-member accounts from /admin.\n" +
      "=========================================================\n"
  );
}

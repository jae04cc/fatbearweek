import { sqliteTable, text, integer, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Bears — the 12 contestants. Single source of truth for name/bio/photos,
// read by every other page (roster, bracket, matchups, stats).
// ---------------------------------------------------------------------------
export const bears = sqliteTable("bears", {
  id: text("id").primaryKey(),
  number: text("number").notNull().unique(),
  name: text("name").notNull(),
  bio: text("bio"),
  photoBeforeUrl: text("photo_before_url"),
  photoAfterUrl: text("photo_after_url"),
  // True for the 4 bears that skip round 1 and go straight to round 2
  isBye: integer("is_bye", { mode: "boolean" }).notNull().default(false),
  // Display order on /bears, and drives bracket seeding pairing order
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// ---------------------------------------------------------------------------
// Matchups — the canonical bracket topology (11 rows: 4 + 4 + 2 + 1).
// This tracks the REAL tournament's progress, not any one user's picks.
// ---------------------------------------------------------------------------
export const matchups = sqliteTable("matchups", {
  id: text("id").primaryKey(),
  round: integer("round").notNull(), // 1-4
  position: integer("position").notNull(), // 1-based within round
  bearAId: text("bear_a_id").references((): AnySQLiteColumn => bears.id),
  bearBId: text("bear_b_id").references((): AnySQLiteColumn => bears.id),
  // The round-(N-1) matchup whose REAL winner fills bearAId/bearBId once decided
  feederMatchupAId: text("feeder_matchup_a_id").references((): AnySQLiteColumn => matchups.id),
  feederMatchupBId: text("feeder_matchup_b_id").references((): AnySQLiteColumn => matchups.id),
  winnerBearId: text("winner_bear_id").references((): AnySQLiteColumn => bears.id),
  decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
});

// ---------------------------------------------------------------------------
// User picks — one row per user per matchup slot. Deliberately minimal:
// only the raw pick is stored, never a snapshot of derived downstream
// contestants. See src/lib/bracket/topology.ts::resolveContestants for how
// a user's full bracket (including cascaded picks) gets derived on read.
// ---------------------------------------------------------------------------
export const userPicks = sqliteTable("user_picks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  matchupId: text("matchup_id")
    .notNull()
    .references(() => matchups.id, { onDelete: "cascade" }),
  pickedBearId: text("picked_bear_id")
    .notNull()
    .references(() => bears.id),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// ---------------------------------------------------------------------------
// Users — every pool member gets a real DB-backed account, created directly
// by an admin (no public self-registration, no invite codes).
// ---------------------------------------------------------------------------
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  // Nullable so an OIDC-only account (future Authentik wiring) doesn't need one
  passwordHash: text("password_hash"),
  // Reserved for future OIDC/Authentik wiring — unused in v1
  oidcSub: text("oidc_sub").unique(),
  displayName: text("display_name"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  // Admin-tracked payment checkbox — payment itself happens outside the app
  hasPaid: integer("has_paid", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
});

// ---------------------------------------------------------------------------
// App-wide settings — key/value store.
// Keys used in v1: auth_secret, bracket_locked, current_round, home_content.
// Reserved for later (unused in v1): oidc_enabled, oidc_issuer, oidc_client_id,
// oidc_client_secret, app_url.
// ---------------------------------------------------------------------------
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const bearsRelations = relations(bears, ({ many }) => ({
  picks: many(userPicks),
}));

export const matchupsRelations = relations(matchups, ({ one, many }) => ({
  bearA: one(bears, { fields: [matchups.bearAId], references: [bears.id], relationName: "bearA" }),
  bearB: one(bears, { fields: [matchups.bearBId], references: [bears.id], relationName: "bearB" }),
  winner: one(bears, { fields: [matchups.winnerBearId], references: [bears.id], relationName: "winner" }),
  feederMatchupA: one(matchups, {
    fields: [matchups.feederMatchupAId],
    references: [matchups.id],
    relationName: "feederA",
  }),
  feederMatchupB: one(matchups, {
    fields: [matchups.feederMatchupBId],
    references: [matchups.id],
    relationName: "feederB",
  }),
  picks: many(userPicks),
}));

export const usersRelations = relations(users, ({ many }) => ({
  picks: many(userPicks),
}));

export const userPicksRelations = relations(userPicks, ({ one }) => ({
  user: one(users, { fields: [userPicks.userId], references: [users.id] }),
  matchup: one(matchups, { fields: [userPicks.matchupId], references: [matchups.id] }),
  bear: one(bears, { fields: [userPicks.pickedBearId], references: [bears.id] }),
}));

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type Bear = typeof bears.$inferSelect;
export type NewBear = typeof bears.$inferInsert;
export type Matchup = typeof matchups.$inferSelect;
export type NewMatchup = typeof matchups.$inferInsert;
export type UserPick = typeof userPicks.$inferSelect;
export type NewUserPick = typeof userPicks.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;

import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

export async function isBracketLocked(): Promise<boolean> {
  return (await getSetting("bracket_locked")) === "true";
}

export async function getCurrentRound(): Promise<number> {
  const value = await getSetting("current_round");
  const parsed = value ? parseInt(value, 10) : 1;
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 4 ? parsed : 1;
}

// Shared invite code gating self-service sign-up — stored in plaintext (not
// hashed) since, unlike a password, the admin needs to be able to read it
// back to share it with people, and it isn't tied to any one identity.
export async function getSignupCode(): Promise<string | null> {
  return getSetting("signup_code");
}

export interface HomeContentBlock {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
}

export async function getHomeContent(): Promise<HomeContentBlock[]> {
  const value = await getSetting("home_content");
  if (!value) return [];
  try {
    return JSON.parse(value) as HomeContentBlock[];
  } catch {
    return [];
  }
}

import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { appSettings, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";

// ---------------------------------------------------------------------------
// Type augmentation — adds `id`, `isAdmin`, `displayName` to the session user
// ---------------------------------------------------------------------------
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      displayName: string | null;
    } & DefaultSession["user"];
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getOrCreateSecret(): Promise<string> {
  const existing = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "auth_secret"),
  });
  if (existing) return existing.value;

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const secret = Buffer.from(bytes).toString("base64url");
  await db.insert(appSettings).values({ key: "auth_secret", value: secret }).onConflictDoNothing();
  return secret;
}

// ---------------------------------------------------------------------------
// NextAuth config — every pool member has a real DB-backed username/password
// account, created directly by an admin (no public self-registration).
// `oidcSub` on the users table is reserved so an OIDC/Authentik provider can
// be added here later without any schema changes.
// ---------------------------------------------------------------------------
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const secret = await getOrCreateSecret();

  return {
    secret,
    trustHost: true,
    providers: [
      Credentials({
        id: "credentials",
        name: "Username and Password",
        credentials: {
          username: { label: "Username", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const username = credentials?.username as string | undefined;
          const password = credentials?.password as string | undefined;
          if (!username || !password) return null;

          const user = await db.query.users.findFirst({
            // Usernames are stored lowercase — logins are case-insensitive
            where: eq(users.username, username.trim().toLowerCase()),
          });
          if (!user || !user.passwordHash) return null;

          const valid = await verifyPassword(password, user.passwordHash);
          if (!valid) return null;

          await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

          return {
            id: user.id,
            name: user.displayName ?? user.username,
            isAdmin: user.isAdmin,
            displayName: user.displayName,
          };
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user, trigger, session }) {
        // `user` is only present on initial sign-in
        if (user) {
          token.userId = user.id;
          token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
          token.displayName = (user as { displayName?: string | null }).displayName ?? null;
        }
        // Client called `update({ displayName })` after a self-service edit —
        // merge it in immediately instead of waiting for the next sign-in.
        if (trigger === "update" && session?.displayName !== undefined) {
          token.displayName = session.displayName;
        }
        return token;
      },
      async session({ session, token }) {
        session.user.id = (token.userId as string | undefined) ?? "";
        session.user.isAdmin = (token.isAdmin as boolean | undefined) ?? false;
        session.user.displayName = (token.displayName as string | null | undefined) ?? null;
        return session;
      },
    },
    pages: {
      signIn: "/login",
    },
  };
});

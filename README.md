# Fat Bear Week

A private bracket-pool app for Fat Bear Week — pick your bracket, track the real results round by round, and see who's leading the pool.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Drizzle ORM + libSQL (SQLite) · NextAuth v5 (username/password)

## Running locally

```bash
npm install
npm run dev
```

The SQLite database is created automatically at `./data/fatbearweek.db` on first run, along with a bootstrap `admin` account — its password is printed to the console on first startup. Log in with it, then create real pool-member accounts from `/admin` → Users.

## Setting up a tournament

1. **Admin → Bears**: add the full roster (name, number, short bio, before/after photos). Two shapes are supported: **12 bears with exactly 4 marked "Has a bye,"** or **16 bears with no byes**.
2. **Admin → Setup**: manually assign each Round 1 matchup (pick the two bears facing off) — plus, for a 12-bear bracket, each Round 2 bye slot (which bye bear faces the winner of which Round 1 matchup) — to match the real published NPS bracket exactly, then click "Seed bracket." This generates the real matchups (11 for 12 bears, 15 for 16) from Round 1 → Championship — nothing is auto-paired or randomized.
3. Everyone fills out their personal bracket at `/bracket`.
4. When picks should close, toggle the lock on in **Admin → Lock**.
5. As real results come in, mark winners inline on `/matchups` (visible to admins) and use "Advance to next round" once every matchup in the round is decided.
6. Check `/stats` for the leaderboard and pick-percentage breakdown.

## Docker deployment

```bash
docker compose up --build -d
```

Maps host port `3010` → container port `3000` by default (adjust in `docker-compose.yml` if that's taken). The `./data` directory persists both the SQLite database and uploaded bear photos across rebuilds. Point your reverse proxy (Pangolin) at the exposed port — no proxy config lives in this repo.

## Scoring

Round 1 = 1pt · Round 2 = 2pt · Final Four = 4pt · Championship = 8pt, per correct pick.

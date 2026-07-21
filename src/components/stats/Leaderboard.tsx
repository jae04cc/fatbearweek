import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { LeaderboardEntry } from "@/lib/bracket/scoring";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-center text-neutral-500 py-10">No picks yet.</p>;
  }

  const maxPoints = Math.max(1, ...entries.map((e) => e.points));

  return (
    <Card>
      <CardBody className="gap-1 divide-y divide-white/10 p-0">
        {entries.map((entry, idx) => (
          <div key={entry.userId} className="flex items-center gap-3 px-4 py-3">
            <span className="w-6 text-center text-sm text-neutral-500">{MEDALS[idx] ?? `#${idx + 1}`}</span>
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold text-neutral-100 text-sm">{entry.displayName}</p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(entry.points / maxPoints) * 100}%` }}
                />
              </div>
            </div>
            <Badge variant="accent">{entry.points} pts</Badge>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

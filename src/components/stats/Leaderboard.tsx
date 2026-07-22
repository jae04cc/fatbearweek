import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/lib/bracket/scoring";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard({
  entries,
  locked,
  onSelectUser,
}: {
  entries: LeaderboardEntry[];
  locked: boolean;
  onSelectUser: (userId: string) => void;
}) {
  if (entries.length === 0) {
    return <p className="text-center text-neutral-500 py-10">No picks yet.</p>;
  }

  const maxPossibleOverall = Math.max(1, ...entries.map((e) => e.maxPossible));

  return (
    <Card>
      <CardBody className="gap-1 p-0">
        {entries.map((entry, idx) => {
          const pointsPct = (entry.points / maxPossibleOverall) * 100;
          const remainingPct = (entry.maxRemaining / maxPossibleOverall) * 100;
          return (
            <button
              key={entry.userId}
              type="button"
              disabled={!locked}
              onClick={() => onSelectUser(entry.userId)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors [-webkit-tap-highlight-color:transparent]",
                // No active:/tap-highlight state here on purpose — on mobile,
                // :active fires on touchstart and can stay visibly applied
                // while a finger drags past a row mid-scroll, flashing rows
                // that were never actually tapped. The hover state is also
                // gated to real hover-capable pointers (a mouse) — plain
                // `hover:` still matches on touchend in iOS Safari and stays
                // visually "stuck" on a row until something else is tapped,
                // which looks identical to the :active bug it's paired with.
                locked && "[@media(hover:hover)]:hover:bg-white/5 cursor-pointer",
                !locked && "cursor-default"
              )}
            >
              <span className="w-6 text-center text-sm text-neutral-500">{MEDALS[idx] ?? `#${idx + 1}`}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-neutral-100 text-sm">{entry.displayName}</p>
                <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-black/30">
                  <div className="h-full bg-accent" style={{ width: `${pointsPct}%` }} />
                  {entry.maxRemaining > 0 && (
                    <div className="h-full bg-accent/25" style={{ width: `${remainingPct}%` }} />
                  )}
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <Badge variant="accent">{entry.points} pts</Badge>
                {entry.maxRemaining > 0 && (
                  <span className="text-[10px] text-neutral-500">{entry.maxRemaining} PPR</span>
                )}
              </div>
            </button>
          );
        })}
      </CardBody>
    </Card>
  );
}

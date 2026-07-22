"use client";
import type { Bear, Matchup } from "@/lib/db/schema";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Trophy, Undo2 } from "lucide-react";

interface Props {
  matchup: Matchup;
  bearA?: Bear;
  bearB?: Bear;
  pickCounts: Record<string, number>;
  isAdmin: boolean;
  onMarkWinner: (bearId: string) => void;
  onUnmarkWinner: () => void;
  onSelectBear: (bear: Bear) => void;
  marking: boolean;
}

export function MatchupCard({
  matchup,
  bearA,
  bearB,
  pickCounts,
  isAdmin,
  onMarkWinner,
  onUnmarkWinner,
  onSelectBear,
  marking,
}: Props) {
  if (!bearA || !bearB) {
    return (
      <Card>
        <CardBody className="text-sm text-neutral-500 text-center py-6">Waiting on an earlier round's result…</CardBody>
      </Card>
    );
  }

  const total = (pickCounts[bearA.id] ?? 0) + (pickCounts[bearB.id] ?? 0);
  const pctFor = (bearId: string) => (total > 0 ? Math.round(((pickCounts[bearId] ?? 0) / total) * 100) : 0);

  return (
    <Card>
      <CardBody className="gap-3">
        <div className="flex flex-col gap-2">
          {[bearA, bearB].map((bear) => {
            const isWinner = matchup.winnerBearId === bear.id;
            const pct = pctFor(bear.id);
            return (
              <div
                key={bear.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5",
                  isWinner ? "border-success bg-success/10" : "border-white/10 bg-surface-elevated"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectBear(bear)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {bear.photoAfterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bear.photoAfterUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/30 text-base">
                        🐻
                      </span>
                    )}
                    {isWinner && <Trophy size={14} className="text-success shrink-0" />}
                    <span className="truncate font-semibold text-neutral-100">{bear.name}</span>
                    <Badge variant="accent">#{bear.number}</Badge>
                  </div>
                  <span className="text-xs text-neutral-500 shrink-0">{pct}% picked</span>
                </button>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/30">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                {isAdmin && !matchup.winnerBearId && (
                  <Button size="sm" variant="secondary" className="mt-2 w-full" loading={marking} onClick={() => onMarkWinner(bear.id)}>
                    Mark as winner
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {isAdmin && matchup.winnerBearId && (
          <Button size="sm" variant="ghost" loading={marking} onClick={onUnmarkWinner} className="self-start">
            <Undo2 size={14} />
            Undo winner
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

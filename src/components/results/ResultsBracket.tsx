"use client";
import { useEffect, useRef } from "react";
import type { Bear, Matchup } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

// A read-only view of the REAL tournament's progress, shaped like the
// bracket page but deliberately kept separate from BracketGrid — that
// component resolves each user's own hypothetical picks and must never be
// touched here. This one just renders each matchup's actual bearAId/bearBId
// (which the admin-decide cascade keeps up to date), highlights the real
// winner once known, and shows what fraction of the pool picked each bear —
// no picking, no bust logic, just a read-only mirror of reality.
const ROUND_LABELS: Record<number, string> = {
  1: "Round 1",
  2: "Round 2",
  3: "Final Four",
  4: "Championship",
};

function baseRow(position: number) {
  return `${position + 1} / ${position + 2}`;
}
function mergedRow(position: number) {
  return `${2 * position} / ${2 * position + 2}`;
}
const FINAL_ROW = "2 / 6";

function MergeConnector({ feederOffsetPx = 0 }: { feederOffsetPx?: number }) {
  const topStub = `calc(25% - ${feederOffsetPx}px)`;
  const bottomStub = `calc(75% - ${feederOffsetPx}px)`;
  return (
    <div className="relative h-full w-full">
      <div className="absolute left-0 h-0.5 w-1/2 -translate-y-1/2 bg-white/20" style={{ top: topStub }} />
      <div className="absolute left-0 h-0.5 w-1/2 -translate-y-1/2 bg-white/20" style={{ top: bottomStub }} />
      <div className="absolute left-1/2 w-0.5 -translate-x-1/2 bg-white/20" style={{ top: topStub, height: "50%" }} />
      <div className="absolute right-0 h-0.5 w-1/2 -translate-y-1/2 bg-white/20" style={{ top: "50%" }} />
    </div>
  );
}

const GRID_TEMPLATE_COLUMNS = "280px 28px 280px 28px 280px 28px 280px";
const GRID_TEMPLATE_ROWS = "auto repeat(4, minmax(128px, auto))";

function ResultBearRow({
  bear,
  isWinner,
  pct,
  showPct,
  onSelect,
}: {
  bear?: Bear;
  isWinner: boolean;
  pct: number;
  showPct: boolean;
  onSelect: (bear: Bear) => void;
}) {
  if (!bear) {
    return (
      <div className="flex items-center rounded-lg border border-dashed border-white/10 px-2 py-1.5 text-xs text-neutral-500">
        TBD
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSelect(bear)}
      className={cn(
        "w-full rounded-lg border px-2 py-1.5 text-left transition-colors",
        isWinner ? "border-success bg-success/15" : "border-transparent bg-surface-elevated"
      )}
    >
      <div className="flex items-center gap-2">
        {bear.photoAfterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bear.photoAfterUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/30 text-sm">🐻</span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-100">{bear.name}</span>
        <span className="ml-auto shrink-0 rounded-full bg-black/30 px-2 py-0.5 text-xs font-mono text-neutral-300">
          {bear.number}
        </span>
        {showPct && <span className="shrink-0 text-xs text-neutral-500">{pct}%</span>}
      </div>
      {showPct && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-black/30">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      )}
    </button>
  );
}

function ResultMatchBox({
  bearA,
  bearB,
  winnerBearId,
  pickCounts,
  onSelectBear,
}: {
  bearA?: Bear;
  bearB?: Bear;
  winnerBearId?: string | null;
  pickCounts: Record<string, number>;
  onSelectBear: (bear: Bear) => void;
}) {
  // A matchup isn't really "live" until both real contestants are known —
  // until then (e.g. a Round 2 box waiting on a Round 1 result), the raw
  // pick count for the one known side (like a bye bear) isn't a real
  // percentage of anything: everyone who predicted the OTHER side hasn't
  // been counted at all, so it'd misleadingly show 100%.
  const bothKnown = Boolean(bearA && bearB);
  const total = (bearA ? pickCounts[bearA.id] ?? 0 : 0) + (bearB ? pickCounts[bearB.id] ?? 0 : 0);
  const pctFor = (bearId: string) => (total > 0 ? Math.round(((pickCounts[bearId] ?? 0) / total) * 100) : 0);

  return (
    <div className="flex w-full flex-col gap-1.5 rounded-xl border border-white/10 bg-surface-card p-1.5 shadow-sm">
      <ResultBearRow
        bear={bearA}
        isWinner={Boolean(winnerBearId && bearA?.id === winnerBearId)}
        pct={bearA ? pctFor(bearA.id) : 0}
        showPct={bothKnown}
        onSelect={onSelectBear}
      />
      <ResultBearRow
        bear={bearB}
        isWinner={Boolean(winnerBearId && bearB?.id === winnerBearId)}
        pct={bearB ? pctFor(bearB.id) : 0}
        showPct={bothKnown}
        onSelect={onSelectBear}
      />
    </div>
  );
}

export function ResultsBracket({
  matchups,
  bearsById,
  pickStats,
  onSelectBear,
}: {
  matchups: Matchup[];
  bearsById: Map<string, Bear>;
  pickStats: Record<string, Record<string, number>>;
  onSelectBear: (bear: Bear) => void;
}) {
  const scrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const byRound = (round: number) => matchups.filter((m) => m.round === round).sort((a, b) => a.position - b.position);
  const bearFor = (id: string | null) => (id ? bearsById.get(id) : undefined);

  return (
    <main ref={scrollRef} className="no-scrollbar w-full overflow-x-auto pb-4">
      <div className="flex">
        <div
          className="grid gap-x-3 gap-y-8 pl-5"
          style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS, gridTemplateRows: GRID_TEMPLATE_ROWS }}
        >
          <div style={{ gridColumn: 1, gridRow: 1 }} className="pb-2 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">
            {ROUND_LABELS[1]}
          </div>
          <div style={{ gridColumn: 3, gridRow: 1 }} className="pb-2 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">
            {ROUND_LABELS[2]}
          </div>
          <div style={{ gridColumn: 5, gridRow: 1 }} className="pb-2 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">
            {ROUND_LABELS[3]}
          </div>
          <div style={{ gridColumn: 7, gridRow: 1 }} className="pb-2 text-center text-xs font-bold uppercase tracking-widest text-neutral-500">
            {ROUND_LABELS[4]}
          </div>

          {byRound(1).map((m) => (
            <div key={m.id} style={{ gridColumn: 1, gridRow: baseRow(m.position) }} className="flex items-center">
              <ResultMatchBox
                bearA={bearFor(m.bearAId)}
                bearB={bearFor(m.bearBId)}
                winnerBearId={m.winnerBearId}
                pickCounts={pickStats[m.id] ?? {}}
                onSelectBear={onSelectBear}
              />
            </div>
          ))}

          {byRound(2).map((m) => (
            <div key={`line-${m.id}`} style={{ gridColumn: 2, gridRow: baseRow(m.position) }} className="relative">
              <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-white/20" />
            </div>
          ))}

          {byRound(2).map((m) => (
            <div key={m.id} style={{ gridColumn: 3, gridRow: baseRow(m.position) }} className="flex items-center">
              <div className="w-full -translate-y-[25px]">
                <ResultMatchBox
                  bearA={bearFor(m.bearAId)}
                  bearB={bearFor(m.bearBId)}
                  winnerBearId={m.winnerBearId}
                  pickCounts={pickStats[m.id] ?? {}}
                  onSelectBear={onSelectBear}
                />
              </div>
            </div>
          ))}

          {[1, 2].map((position) => (
            <div key={position} style={{ gridColumn: 4, gridRow: mergedRow(position) }}>
              <MergeConnector feederOffsetPx={25} />
            </div>
          ))}

          {byRound(3).map((m) => (
            <div key={m.id} style={{ gridColumn: 5, gridRow: mergedRow(m.position) }} className="flex items-center">
              <ResultMatchBox
                bearA={bearFor(m.bearAId)}
                bearB={bearFor(m.bearBId)}
                winnerBearId={m.winnerBearId}
                pickCounts={pickStats[m.id] ?? {}}
                onSelectBear={onSelectBear}
              />
            </div>
          ))}

          <div style={{ gridColumn: 6, gridRow: FINAL_ROW }}>
            <MergeConnector />
          </div>

          {byRound(4).map((m) => (
            <div key={m.id} style={{ gridColumn: 7, gridRow: FINAL_ROW }} className="flex items-center">
              <ResultMatchBox
                bearA={bearFor(m.bearAId)}
                bearB={bearFor(m.bearBId)}
                winnerBearId={m.winnerBearId}
                pickCounts={pickStats[m.id] ?? {}}
                onSelectBear={onSelectBear}
              />
            </div>
          ))}
        </div>
        {/* An explicit trailing spacer, not padding on the scroll
            container — padding at the far edge of horizontally scrolled
            content is unreliable across browsers, but a real element
            always counts toward the scrollable width. */}
        <div className="w-5 shrink-0" aria-hidden="true" />
      </div>
    </main>
  );
}

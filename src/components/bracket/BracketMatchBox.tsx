"use client";
import type { Bear } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export type ResultStatus = "pending" | "correct" | "incorrect" | "busted";

// Describes a box's outcome from two angles: `pickStatus` is the fate of
// the specific bear this user picked to WIN this box (cascades into a
// child box's aBusted/bBusted, since the child's contestant on that side
// is literally this box's picked winner) — while `aBusted`/`bBusted`
// describe whether each of the two SHOWN contestants already died on its
// own earlier storyline, independent of which one got picked here. A box
// can show one live contestant next to one dead one; only the dead one
// should render greyed out.
export interface MatchResult {
  pickStatus: ResultStatus;
  aBusted: boolean;
  bBusted: boolean;
}

export function BracketMatchBox({
  bearA,
  bearB,
  picked,
  disabled,
  onPick,
  matchResult,
}: {
  bearA?: Bear;
  bearB?: Bear;
  picked?: string;
  disabled: boolean;
  onPick: (bearId: string) => void;
  matchResult?: MatchResult;
}) {
  const pickStatus = matchResult?.pickStatus ?? "pending";
  const aBusted = matchResult?.aBusted ?? false;
  const bBusted = matchResult?.bBusted ?? false;
  // A picked side is also "busted" when the pick itself couldn't possibly
  // be right anymore (e.g. it doesn't match either real contestant once
  // both are known) even if that specific side has no feeder to trace the
  // bust back through — pickStatus catches that case, aBusted/bBusted only
  // catch the ancestor-storyline case.
  const aIsPicked = Boolean(bearA && picked === bearA.id);
  const bIsPicked = Boolean(bearB && picked === bearB.id);
  const aFinalBusted = aBusted || (aIsPicked && pickStatus === "busted");
  const bFinalBusted = bBusted || (bIsPicked && pickStatus === "busted");

  return (
    <div className="flex w-full flex-col gap-1.5 rounded-xl border border-white/10 bg-surface-card p-1.5 shadow-sm">
      <BearSlot
        bear={bearA}
        isPicked={aIsPicked}
        busted={aFinalBusted}
        pickStatus={pickStatus}
        disabled={disabled || aFinalBusted}
        onPick={onPick}
      />
      <BearSlot
        bear={bearB}
        isPicked={bIsPicked}
        busted={bFinalBusted}
        pickStatus={pickStatus}
        disabled={disabled || bFinalBusted}
        onPick={onPick}
      />
    </div>
  );
}

function BearSlot({
  bear,
  isPicked,
  busted,
  pickStatus,
  disabled,
  onPick,
}: {
  bear?: Bear;
  isPicked: boolean;
  busted: boolean;
  pickStatus: ResultStatus;
  disabled: boolean;
  onPick: (bearId: string) => void;
}) {
  if (!bear) {
    return (
      <div className="flex items-center rounded-lg border border-dashed border-white/10 px-2 py-1.5 text-xs text-neutral-500">
        TBD
      </div>
    );
  }

  const style = busted
    ? "border-transparent bg-surface-elevated opacity-40"
    : isPicked
      ? pickStatus === "correct"
        ? "border-success bg-success/15"
        : pickStatus === "incorrect"
          ? "border-danger bg-danger/15"
          : "border-accent bg-accent/10"
      : "border-transparent bg-surface-elevated";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(bear.id)}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed",
        style
      )}
    >
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
    </button>
  );
}

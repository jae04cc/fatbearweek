"use client";
import type { Bear } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function BracketMatchBox({
  bearA,
  bearB,
  byeBearId,
  picked,
  disabled,
  onPick,
}: {
  bearA?: Bear;
  bearB?: Bear;
  byeBearId?: string;
  picked?: string;
  disabled: boolean;
  onPick: (bearId: string) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5 rounded-xl border border-white/10 bg-surface-card p-1.5 shadow-sm">
      <BearSlot bear={bearA} isBye={bearA?.id === byeBearId} picked={picked} disabled={disabled} onPick={onPick} />
      <BearSlot bear={bearB} isBye={bearB?.id === byeBearId} picked={picked} disabled={disabled} onPick={onPick} />
    </div>
  );
}

function BearSlot({
  bear,
  isBye,
  picked,
  disabled,
  onPick,
}: {
  bear?: Bear;
  isBye: boolean;
  picked?: string;
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

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(bear.id)}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed",
        picked === bear.id ? "border-success bg-success/10" : "border-transparent bg-surface-elevated"
      )}
    >
      {bear.photoAfterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bear.photoAfterUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/30 text-sm">🐻</span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-100">{bear.name}</span>
      {isBye && (
        <span className="shrink-0 rounded-full bg-warning/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warning">
          Bye
        </span>
      )}
      <span className="ml-auto shrink-0 rounded-full bg-black/30 px-2 py-0.5 text-xs font-mono text-neutral-300">
        {bear.number}
      </span>
    </button>
  );
}

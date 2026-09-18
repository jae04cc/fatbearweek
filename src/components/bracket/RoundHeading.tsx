"use client";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { ROUND_LABELS, roundPointsLabel } from "@/lib/bracket/layout";

// The column header over a round, in all three bracket layouts (the desktop
// grid on /bracket and /results, and the packed phone one). Carries what a
// correct pick in that round is worth, dimmer than the round's name so it
// reads as a footnote rather than competing with it.
export function RoundHeading({
  round,
  style,
  className,
}: {
  round: number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      style={style}
      className={cn("pb-2 text-center text-xs font-bold uppercase tracking-widest text-neutral-500", className)}
    >
      {ROUND_LABELS[round]} <span className="font-medium text-neutral-600">({roundPointsLabel(round)})</span>
    </div>
  );
}

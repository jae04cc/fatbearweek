import { Badge } from "@/components/ui/Badge";
import type { Bear } from "@/lib/db/schema";

export function PickPercentageBar({ bear, pct }: { bear: Bear; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-200">{bear.name}</span>
          <Badge variant="accent">#{bear.number}</Badge>
        </div>
        <span className="text-xs text-neutral-500">{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/30">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

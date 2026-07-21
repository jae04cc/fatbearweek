import type { Bear } from "@/lib/db/schema";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function BearCard({ bear }: { bear: Bear }) {
  return (
    <Card>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-t-2xl bg-black/20">
        <PhotoSlot label="Before" url={bear.photoBeforeUrl} />
        <PhotoSlot label="After" url={bear.photoAfterUrl} />
      </div>
      <CardBody className="gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-neutral-50">{bear.name}</span>
          <Badge variant="accent">#{bear.number}</Badge>
          {bear.isBye && <Badge variant="warning">Bye</Badge>}
        </div>
        {bear.bio && <p className="text-sm text-neutral-400">{bear.bio}</p>}
      </CardBody>
    </Card>
  );
}

function PhotoSlot({ label, url }: { label: string; url: string | null }) {
  return (
    <div className="relative aspect-square bg-surface-elevated">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-neutral-600 text-sm">No photo</div>
      )}
      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-200">
        {label}
      </span>
    </div>
  );
}

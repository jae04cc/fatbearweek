"use client";
import { useEffect, useRef, useState } from "react";
import type { Bear } from "@/lib/db/schema";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { cn } from "@/lib/utils";

export function BearCard({ bear }: { bear: Bear }) {
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null);

  return (
    <Card>
      <div className="flex flex-col gap-px overflow-hidden rounded-t-2xl bg-black/20">
        <PhotoSlot
          label="Before"
          url={bear.photoBeforeUrl}
          onZoom={() => bear.photoBeforeUrl && setZoomed({ src: bear.photoBeforeUrl, alt: `${bear.name} — before` })}
        />
        <PhotoSlot
          label="After"
          url={bear.photoAfterUrl}
          onZoom={() => bear.photoAfterUrl && setZoomed({ src: bear.photoAfterUrl, alt: `${bear.name} — after` })}
        />
      </div>
      <CardBody className="gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-neutral-50">{bear.name}</span>
          <Badge variant="accent">#{bear.number}</Badge>
          {bear.isBye && <Badge variant="warning">Bye</Badge>}
        </div>
        {bear.identification && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Identification</p>
            <p className="text-sm text-neutral-400">{bear.identification}</p>
          </div>
        )}
        {bear.bio && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Biography</p>
            <ExpandableText text={bear.bio} />
          </div>
        )}
      </CardBody>

      {zoomed && <ImageLightbox src={zoomed.src} alt={zoomed.alt} onClose={() => setZoomed(null)} />}
    </Card>
  );
}

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) setNeedsToggle(el.scrollHeight > el.clientHeight + 1);
  }, [text]);

  return (
    <div>
      <p ref={ref} className={cn("text-sm text-neutral-400", !expanded && "line-clamp-3")}>
        {text}
      </p>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-semibold text-accent-light"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      )}
    </div>
  );
}

function PhotoSlot({ label, url, onZoom }: { label: string; url: string | null; onZoom: () => void }) {
  return (
    <button
      type="button"
      onClick={onZoom}
      disabled={!url}
      className="relative aspect-video w-full bg-surface-elevated disabled:cursor-default"
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-neutral-600 text-sm">No photo</div>
      )}
      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-200">
        {label}
      </span>
    </button>
  );
}

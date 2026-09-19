"use client";
import { useEffect, useRef, useState } from "react";
import type { Bear } from "@/lib/db/schema";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ImageLightbox } from "@/components/ui/ImageLightbox";

// `fullDetails` shows every section in full (the profile popup); otherwise
// the sections share one Expand/Collapse (the roster list).
export function BearCard({ bear, fullDetails = false }: { bear: Bear; fullDetails?: boolean }) {
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null);

  const sections = [
    { label: "Identification", text: bear.identification },
    { label: "Molly's Notes", text: bear.mollysNotes },
    { label: "Biography", text: bear.bio },
  ].filter((section): section is { label: string; text: string } => Boolean(section.text));

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
      <CardBody className="gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-neutral-50">{bear.name}</span>
          <Badge variant="accent">#{bear.number}</Badge>
          {bear.isBye && <Badge variant="warning">Bye</Badge>}
        </div>
        {sections.length > 0 && <BearDetails sections={sections} collapsible={!fullDetails} />}
      </CardBody>

      {zoomed && <ImageLightbox src={zoomed.src} alt={zoomed.alt} onClose={() => setZoomed(null)} />}
    </Card>
  );
}

// How much of the details shows before Expand: roughly the identification
// plus the start of whatever comes next.
const COLLAPSED_HEIGHT_PX = 144;
// Fades the last lines out instead of slicing through the middle of one. A
// mask rather than a colour gradient, so it works over the card's translucent
// background.
const COLLAPSED_FADE = "linear-gradient(to bottom, black calc(100% - 2.5rem), transparent)";

// Identification, Molly's Notes and Biography as a single block with one
// Expand/Collapse, rather than each section clamping and expanding on its own.
function BearDetails({
  sections,
  collapsible,
}: {
  sections: { label: string; text: string }[];
  collapsible: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const content = sections.map((s) => s.text).join("\n");

  // scrollHeight is the full content height whether or not it's clamped, so
  // this stays correct while expanded, and the Collapse button doesn't vanish.
  // Re-measured on resize, since a narrower screen wraps into more lines.
  useEffect(() => {
    const el = ref.current;
    if (!el || !collapsible) return;
    const measure = () => setOverflows(el.scrollHeight > COLLAPSED_HEIGHT_PX + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [content, collapsible]);

  const clamped = collapsible && !expanded;

  return (
    <div>
      <div
        ref={ref}
        className="flex flex-col gap-4 overflow-hidden"
        style={
          clamped
            ? {
                maxHeight: COLLAPSED_HEIGHT_PX,
                ...(overflows ? { maskImage: COLLAPSED_FADE, WebkitMaskImage: COLLAPSED_FADE } : {}),
              }
            : undefined
        }
      >
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-1 text-sm font-bold uppercase tracking-wide text-accent-light">{section.label}</p>
            <p className="whitespace-pre-line text-sm text-neutral-400">{section.text}</p>
          </div>
        ))}
      </div>
      {collapsible && overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-semibold text-accent-light"
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

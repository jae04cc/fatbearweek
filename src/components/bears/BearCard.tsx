"use client";
import { useEffect, useRef, useState } from "react";
import type { Bear } from "@/lib/db/schema";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ImageLightbox } from "@/components/ui/ImageLightbox";

// `fullDetails` shows the biography in full too (the profile popup); otherwise
// it collapses to its first line behind an Expand (the roster list).
// Identification and Molly's Notes always show in full — they're short, and
// they're what you scan the roster for.
export function BearCard({ bear, fullDetails = false }: { bear: Bear; fullDetails?: boolean }) {
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null);

  const alwaysShown = [
    { label: "Identification", text: bear.identification },
    { label: "Molly's Notes", text: bear.mollysNotes },
  ].filter((section): section is { label: string; text: string } => Boolean(section.text));

  return (
    <Card>
      <div className="flex flex-col gap-px overflow-hidden rounded-t-2xl bg-black/20">
        <PhotoSlot
          label="Before"
          url={bear.photoBeforeUrl}
          onZoom={() => bear.photoBeforeUrl && setZoomed({ src: bear.photoBeforeUrl, alt: `${bear.name}, before` })}
        />
        <PhotoSlot
          label="After"
          url={bear.photoAfterUrl}
          onZoom={() => bear.photoAfterUrl && setZoomed({ src: bear.photoAfterUrl, alt: `${bear.name}, after` })}
        />
      </div>
      <CardBody className="gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-neutral-50">{bear.name}</span>
          <Badge variant="accent">#{bear.number}</Badge>
          {bear.isBye && <Badge variant="warning">Bye</Badge>}
        </div>
        {alwaysShown.map((section) => (
          <div key={section.label}>
            <p className="mb-1 text-sm font-bold uppercase tracking-wide text-accent-light">{section.label}</p>
            <p className="whitespace-pre-line text-sm text-neutral-400">{section.text}</p>
          </div>
        ))}
        {bear.bio && <Biography text={bear.bio} collapsible={!fullDetails} />}
      </CardBody>

      {zoomed && <ImageLightbox src={zoomed.src} alt={zoomed.alt} onClose={() => setZoomed(null)} />}
    </Card>
  );
}

// Collapsed, the biography keeps its first line solid and fades through the
// second — text-sm lines are 20px, so one line shows and the fade lands on the
// next rather than slicing through the middle of a line.
const BIO_LINE_PX = 20;
const BIO_COLLAPSED_PX = BIO_LINE_PX * 2;
// A mask rather than a colour gradient, so the fade works over the card's
// translucent background.
const BIO_FADE = `linear-gradient(to bottom, black ${BIO_LINE_PX}px, transparent)`;

// The only section that collapses: bios run long, while identification and
// Molly's notes are a line or two each and always show.
function Biography({ text, collapsible }: { text: string; collapsible: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  // scrollHeight is the full text height whether or not it's clamped, so this
  // stays correct while expanded and the Collapse button doesn't vanish.
  // Re-measured on resize, since a narrower screen wraps into more lines.
  useEffect(() => {
    const el = ref.current;
    if (!el || !collapsible) return;
    const measure = () => setOverflows(el.scrollHeight > BIO_COLLAPSED_PX + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, collapsible]);

  const clamped = collapsible && !expanded;

  return (
    <div>
      <p className="mb-1 text-sm font-bold uppercase tracking-wide text-accent-light">Biography</p>
      <p
        ref={ref}
        className="overflow-hidden whitespace-pre-line text-sm text-neutral-400"
        style={
          clamped
            ? {
                maxHeight: BIO_COLLAPSED_PX,
                ...(overflows ? { maskImage: BIO_FADE, WebkitMaskImage: BIO_FADE } : {}),
              }
            : undefined
        }
      >
        {text}
      </p>
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

"use client";
import { useEffect } from "react";
import type { Bear } from "@/lib/db/schema";
import { BearCard } from "@/components/bears/BearCard";
import { useScrollLock } from "@/lib/useScrollLock";
import { X } from "lucide-react";

export function BearProfilePopup({ bear, onClose }: { bear: Bear; onClose: () => void }) {
  useScrollLock();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Oversized on purpose: if iOS pans the visual viewport (keyboard, or a
          rubber-band scroll), a scrim sized exactly to the viewport slides off
          one edge and shows a hard line of page background. This can't.

          The close handler belongs here on the scrim rather than on the
          wrapper above: the scrim covers the whole wrapper, so it — not the
          wrapper — is what a tap outside the card actually lands on. */}
      <div className="absolute inset-x-0 -inset-y-full bg-black/85" onClick={onClose} />
      {/* The close button lives in this outer, non-scrolling wrapper — not
          inside the scrollable card below — so it stays pinned to the
          popup's corner no matter how far the bio/photos are scrolled. */}
      <div className="relative w-full max-w-sm">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-neutral-200"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="no-scrollbar max-h-[90vh] overflow-y-auto rounded-2xl">
          <BearCard bear={bear} fullDetails />
        </div>
      </div>
    </div>
  );
}

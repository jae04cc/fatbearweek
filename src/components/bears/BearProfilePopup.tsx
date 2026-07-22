"use client";
import { useEffect, useRef } from "react";
import type { Bear } from "@/lib/db/schema";
import { BearCard } from "@/components/bears/BearCard";
import { X } from "lucide-react";

export function BearProfilePopup({ bear, onClose }: { bear: Bear; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
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
          <BearCard bear={bear} fullBio />
        </div>
      </div>
    </div>
  );
}

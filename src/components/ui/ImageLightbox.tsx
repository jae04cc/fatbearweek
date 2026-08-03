"use client";
import { useEffect, useRef } from "react";
import { useScrollLock } from "@/lib/useScrollLock";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useScrollLock();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-x-0 -inset-y-full bg-black/90" />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white"
        aria-label="Close"
      >
        <X size={22} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ""}
        className="relative max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
      />
    </div>
  );
}

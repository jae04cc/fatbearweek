"use client";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { useScrollLock } from "@/lib/useScrollLock";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-x-0 -inset-y-full bg-black/85" />
      <div
        className={cn(
          "relative z-10 w-full sm:max-w-lg bg-surface-card",
          "rounded-t-3xl sm:rounded-2xl shadow-2xl",
          "max-h-[92vh] overflow-y-auto",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
            <h2 className="text-lg font-bold text-neutral-100">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 transition-colors">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

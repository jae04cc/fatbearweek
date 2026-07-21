"use client";
import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-success" : "bg-white/15"
      )}
      aria-label={label}
    >
      <span
        className={cn(
          "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-150",
          checked ? "translate-x-7" : "translate-x-1"
        )}
      />
    </button>
  );
}

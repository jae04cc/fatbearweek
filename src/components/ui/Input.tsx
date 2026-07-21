"use client";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-neutral-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-xl bg-surface-elevated border border-white/10 px-4 py-3",
            "text-neutral-100 placeholder-neutral-500",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
            "transition-all duration-150",
            "min-h-[48px] text-base",
            error && "border-danger focus:ring-danger",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger mt-0.5">{error}</p>}
        {hint && !error && <p className="text-xs text-neutral-500 mt-0.5">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

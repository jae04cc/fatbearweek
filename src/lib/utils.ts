import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Short, URL-safe IDs (no nanoid dep — use crypto)
export function generateId(): string {
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
}

type DateLike = Date | number | string | null | undefined;

function toDate(date: DateLike): Date | null {
  if (!date) return null;
  const d = new Date(date as string | number | Date);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(date: DateLike): string {
  const d = toDate(date);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(date: DateLike): string {
  const d = toDate(date);
  if (!d) return "—";
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${formatDate(d)} - ${time}`;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function pluralize(count: number, word: string, plural?: string): string {
  return count === 1 ? `1 ${word}` : `${count} ${plural ?? word + "s"}`;
}

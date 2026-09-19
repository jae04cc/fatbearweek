import { cn } from "@/lib/utils";

// Pins page-level actions (Save, Clear…) to the bottom-right corner so they're
// always reachable on a long editing page without scrolling to the end.
// On mobile they sit the same 0.75rem in from the right edge as above the nav
// bar fixed to the bottom of the screen, measured from the bar's real height
// (--bottom-nav-height, published by NavBar) since that height differs between
// a browser tab and the home-screen app. On desktop the nav bar moves to the
// top, so the buttons sit 1.5rem in from both edges instead.
// Give the scrolling content underneath a `pb-24` or so, otherwise the last of
// it ends up behind these.
export function FloatingActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "fixed bottom-[calc(var(--bottom-nav-height,56px)_+_0.75rem)] right-3 sm:bottom-6 sm:right-6 z-30 flex gap-2",
        "[&>*]:shadow-xl [&>*]:shadow-black/40",
        className
      )}
      {...props}
    />
  );
}

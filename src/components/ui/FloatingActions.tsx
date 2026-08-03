import { cn } from "@/lib/utils";

// Pins page-level actions (Save, Clear…) to the bottom-right corner so they're
// always reachable on a long editing page without scrolling to the end.
// `bottom-20` clears the mobile nav bar, which is fixed to the bottom of the
// screen; on desktop the nav bar moves to the top so the buttons can sit lower.
// Give the scrolling content underneath a `pb-24` or so, otherwise the last of
// it ends up behind these.
export function FloatingActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "fixed bottom-20 right-5 sm:bottom-6 sm:right-6 z-30 flex gap-2",
        "[&>*]:shadow-xl [&>*]:shadow-black/40",
        className
      )}
      {...props}
    />
  );
}

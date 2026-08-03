"use client";
import { useSyncExternalStore } from "react";

// Tracks whether any popup is currently open, app-wide.
//
// The nav bar is `position: fixed` at the bottom of the screen, so on iOS the
// keyboard shoves it upward — and at 85% opacity the scrim doesn't fully hide
// it, leaving a nav bar visibly sliding around behind an open popup. Rather
// than fight it with z-index or a fully opaque scrim, the nav bar just doesn't
// render while a popup is up.
//
// A counter rather than a boolean, since popups can stack (a bear profile
// opened from inside the bracket popup) — the nav should only come back once
// the last one closes.
let openCount = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function pushPopup() {
  openCount += 1;
  emit();
}

export function popPopup() {
  openCount = Math.max(0, openCount - 1);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAnyPopupOpen() {
  // Always false during SSR — popups only ever open from a client interaction.
  return useSyncExternalStore(
    subscribe,
    () => openCount > 0,
    () => false
  );
}

"use client";
import { useEffect } from "react";
import { popPopup, pushPopup } from "@/lib/popupState";

// Freezes the page behind a popup.
//
// `overflow: hidden` on its own is not enough on iOS Safari: it still scrolls
// the document to reveal a focused input, which slides the page out from under
// a `position: fixed` overlay and exposes a seam of page background along one
// edge. Pinning the body with `position: fixed` removes the scrollable overflow
// altogether, so there's nothing left for Safari to scroll. The scroll offset
// has to be carried on `top` and handed back on cleanup, otherwise pinning the
// body would jump the page to the top.
// `enabled` is for callers that stay mounted while closed (Modal) — most
// popups are only mounted while open and can leave it at the default.
export function useScrollLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    pushPopup();

    return () => {
      popPopup();
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;

      // globals.css sets `scroll-behavior: smooth` on everything, which turns
      // this restore into a visible animated scroll back to where you were —
      // it reads as the page racing around after the popup closes. Force it
      // instant for the one frame it takes to put the offset back.
      const html = document.documentElement;
      const previousScrollBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, scrollY);
      html.style.scrollBehavior = previousScrollBehavior;
    };
  }, [enabled]);
}

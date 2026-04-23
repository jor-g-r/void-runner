// Platform detection used to decide when to show touch UI and attempt
// fullscreen/orientation locking. Evaluated once at module load — the
// capability is stable for a given session.
//
// `pointer: coarse` is the modern signal for a touch-primary device and
// is also what Chrome's device emulation toggles, so it beats
// `ontouchstart` alone (which desktop Chrome leaves unset even under
// iPhone emulation).

const forcedTouch =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("touch") === "1";

const hasTouch =
  forcedTouch ||
  (typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)").matches ||
      "ontouchstart" in window ||
      (navigator.maxTouchPoints ?? 0) > 0));

export const isTouchDevice = () => hasTouch;

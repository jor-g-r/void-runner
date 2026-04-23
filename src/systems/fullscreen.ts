// Fullscreen + orientation helpers.
//
// iOS Safari does not implement the Fullscreen API on non-video elements.
// We attempt the standard API (works on Android Chrome and iPadOS 16.4+),
// and silently no-op elsewhere — the CSS layout already fills the viewport
// so the game remains playable without true fullscreen.

type FSDoc = Document & {
  webkitFullscreenElement?: Element | null;
};
type FSElem = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

export const requestFullscreen = async () => {
  if (typeof document === "undefined") return;
  const doc = document as FSDoc;
  if (doc.fullscreenElement || doc.webkitFullscreenElement) return;

  const el = document.documentElement as FSElem;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: "hide" });
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
    }
  } catch {
    // Some browsers reject without a user gesture, or unsupported entirely.
  }
};

export const lockPortrait = async () => {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (o: OrientationLockType) => Promise<void>;
  };
  if (orientation?.lock) {
    try {
      await orientation.lock("portrait");
    } catch {
      // Lock requires fullscreen on most browsers; ignore when denied.
    }
  }
};

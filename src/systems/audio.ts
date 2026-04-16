import { sfxr } from "jsfxr";

// ========== SFX ==========
// Serialized b58 strings from sfxr.me. Fabricated by the user.
// Add new sounds here; all audio is routed through playSfx(id).

export type SfxId = "shoot" | "hit" | "explode" | "hurt" | "pickup" | "charge" | "roll" | "boss";

interface SfxDef {
  b58: string;
  volume: number;
}

const SFX_DEFS: Record<SfxId, SfxDef> = {
  // Fires ~8/sec on auto-fire — keep low to avoid saturation
  shoot: {
    b58: "57uBnWTpHBX7jus4Rnwy8DWdHtg11MaztpDUpzY1vAqGUDX8eWAfkBwywq6cMZmSxX94z1WcAC1yRHak4ASiG7NAQfb3eCWQoVfEGSXg9ZuQWCCvKNPUxa3Aw",
    volume: 0.05,
  },
  // Non-lethal projectile tick on enemy
  hit: {
    b58: "7BMHBGMzTqGQWi4JdPjk8oqmgSU1g81YTkZDhXC2s2wtaGMhDqAV7wU4izLVG8GeP1xUfWCXPcdqsaSTwwBMUouJkHiWjkBPgEZFAMrk46RVNorZiQ8hVgmfV",
    volume: 0.3,
  },
  // Enemy destroyed
  explode: {
    b58: "7BMHBGDFbn99yAEM3oVz2aMG7ej6tPL4vAyvKU6B9iZFMYqg2XZ9P92RA8EbJ8vrZMULCz6i45kteSSRJyjwURXebEE4qpPSJaaLb1mTT47J1GGwwfXzVacTh",
    volume: 0.45,
  },
  // Player takes damage
  hurt: {
    b58: "7BMHBGEGptPGLrsargEc2eFKY5E6xvbcXFFXALcbZ45ZqL9mVSTkniUZBh3C5ii56As2C8z4Sa2r8F2jidLRmDGiFdpZVEQ33Q19rTqj4zs8fKN93QH6UD4VD",
    volume: 0.7,
  },
  // Energy orb collected
  pickup: {
    b58: "34T6PkvxqEmhQi82bpUL4wjgzrbvUprDYSSgzDSkDn9SCuEWhhKfkNkwfGQchjxeKpnjRUSit94WDYzZdRVc6xPsewepF9TMc2eETQbf1x7uX7TkELpbK1UCP",
    volume: 0.45,
  },
  // Charged shot release
  charge: {
    b58: "34T6Pkp18rh9CLHDfstnhUrBxqxywDv8DtjbB5j7iJRWEmt6YboNvrTFEZerKwksVZZ8SZUYLaXFWHFBYriZC3AVGiwZjDXaXvvfckiJyRGxZKL8CPMcckLCF",
    volume: 0.55,
  },
  // Barrel roll whoosh
  roll: {
    b58: "7qUtUurQxbnbvYcyYwUptQiSBp1NpvEZesdXokKLYtMFWJ1Fene9f1tqfSgGN1j4iN5Vx1BygQ2x3VJVVxaNhPNzqVqnPKpLwa6WDTokpxHE68tf7JPqgg6N3",
    volume: 0.4,
  },
  // Boss enters
  boss: {
    b58: "7BMHBGFWJnXzLLrmRdv94i2e51QvHTpnkdkTekC6hY9kuv97XZ8rTLqKxiefXuMSLaU95YdFotHmSz7dtVqPPM776x6fi3wMDBQUK5BwCTvPBHDwFQmrd9nY7",
    volume: 0.8,
  },
};

type CachedSfx = { play: () => unknown; setVolume: (v: number) => unknown };
const sfxCache = new Map<SfxId, CachedSfx>();

function buildSfx(id: SfxId): CachedSfx | null {
  if (typeof window === "undefined") return null;
  const def = SFX_DEFS[id];
  const audio = sfxr.toAudio(def.b58) as CachedSfx;
  if (typeof audio.setVolume === "function") audio.setVolume(def.volume);
  return audio;
}

export function playSfx(id: SfxId): void {
  if (userMuted) return;
  let cached = sfxCache.get(id);
  if (!cached) {
    const built = buildSfx(id);
    if (!built) return;
    cached = built;
    sfxCache.set(id, cached);
  }
  try {
    cached.play();
  } catch {
    // Swallow — audio errors must not break the game loop
  }
}

/**
 * Pre-generate all SFX from inside a user-gesture handler so the
 * WebAudio context is created unlocked. Call from TitleScreen click.
 */
export function warmUpSfx(): void {
  for (const id of Object.keys(SFX_DEFS) as SfxId[]) {
    if (!sfxCache.has(id)) {
      const built = buildSfx(id);
      if (built) sfxCache.set(id, built);
    }
  }
}

// ========== MUSIC ==========

export type MusicId = "intro" | "stage-00";

const MUSIC_PATHS: Record<MusicId, string> = {
  intro: "/audio/stage-intro.mp3",
  "stage-00": "/audio/stage-00.mp3",
};

const MUSIC_BASE_VOLUME: Record<MusicId, number> = {
  intro: 0.55,
  "stage-00": 0.45,
};

let currentTrack: HTMLAudioElement | null = null;
let currentId: MusicId | null = null;
let fadeRaf: number | null = null;

// Chrome blocks audible autoplay before a user gesture, but muted autoplay
// is always allowed. We start every track muted and unmute on the first
// interaction — avoiding the race between a late .play() and fadeOutMusic().
let audioUnlocked = false;

// User-controlled mute toggle (persisted). Affects both music and SFX.
const MUTE_STORAGE_KEY = "vr.audio.muted";
let userMuted = loadUserMuted();
const muteListeners = new Set<() => void>();

function loadUserMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveUserMuted(v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, v ? "1" : "0");
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — ignore
  }
}

function applyMuteToCurrent(): void {
  if (!currentTrack) return;
  // While still locked, keep muted regardless of user preference so the
  // declarative autoplay stays valid until the first gesture.
  currentTrack.muted = userMuted || !audioUnlocked;
}

export function isMuted(): boolean {
  return userMuted;
}

export function setMuted(v: boolean): void {
  if (userMuted === v) return;
  userMuted = v;
  saveUserMuted(v);
  applyMuteToCurrent();
  muteListeners.forEach((fn) => fn());
}

export function toggleMuted(): void {
  setMuted(!userMuted);
}

export function subscribeMuted(fn: () => void): () => void {
  muteListeners.add(fn);
  return () => {
    muteListeners.delete(fn);
  };
}

function unlockAudio(): void {
  if (audioUnlocked) return;
  audioUnlocked = true;
  applyMuteToCurrent();
}

if (typeof window !== "undefined") {
  // Only "user activation" events unlock audio in Chrome:
  // pointerdown, keydown, touchstart — NOT pointermove.
  const unlock = () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
    unlockAudio();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock);
}

function cancelFade(): void {
  if (fadeRaf !== null) {
    cancelAnimationFrame(fadeRaf);
    fadeRaf = null;
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function tween(
  from: number,
  to: number,
  duration: number,
  onUpdate: (v: number) => void,
  onDone?: () => void,
): void {
  cancelFade();
  if (duration <= 0) {
    onUpdate(clamp01(to));
    onDone?.();
    return;
  }
  const start = performance.now();
  const step = (now: number) => {
    // Clamp t to [0,1]: RAF timestamps can occasionally precede `start`
    // due to sub-millisecond clock skew, producing a negative progress.
    const t = Math.max(0, Math.min(1, (now - start) / (duration * 1000)));
    onUpdate(clamp01(from + (to - from) * t));
    if (t < 1) {
      fadeRaf = requestAnimationFrame(step);
    } else {
      fadeRaf = null;
      onDone?.();
    }
  };
  fadeRaf = requestAnimationFrame(step);
}

/**
 * Take ownership of an <audio> element already rendered in the DOM
 * (e.g. the TitleScreen's declarative intro track) so that fadeOutMusic
 * and stopMusic can operate on it like any other track.
 */
export function adoptIntroTrack(audio: HTMLAudioElement): void {
  cancelFade();
  if (currentTrack && currentTrack !== audio) {
    currentTrack.pause();
    currentTrack.src = "";
  }
  currentTrack = audio;
  currentId = "intro";
  // The element is already playing from the declarative autoplay; do not
  // call play() again here — that would interrupt the currentTime.
  applyMuteToCurrent();
}

export function playMusic(id: MusicId, opts: { loop?: boolean; fadeIn?: number } = {}): void {
  const { loop = true, fadeIn = 1.0 } = opts;
  if (currentId === id && currentTrack) return;

  if (currentTrack) {
    currentTrack.pause();
    currentTrack.src = "";
    currentTrack = null;
  }
  cancelFade();

  const audio = new Audio(MUSIC_PATHS[id]);
  audio.loop = loop;
  audio.volume = 0;
  // Muted autoplay is always allowed by browsers; we unmute on first gesture.
  audio.muted = userMuted || !audioUnlocked;
  currentTrack = audio;
  currentId = id;

  void audio.play().catch(() => {
    // Even muted autoplay can fail in edge cases — retry on next gesture.
    const retry = () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
      if (currentTrack === audio) void audio.play().catch(() => {});
    };
    window.addEventListener("pointerdown", retry, { once: true });
    window.addEventListener("keydown", retry, { once: true });
  });

  const target = MUSIC_BASE_VOLUME[id];
  tween(0, target, fadeIn, (v) => {
    if (currentTrack === audio) audio.volume = v;
  });
}

export function fadeOutMusic(duration = 0.8): Promise<void> {
  return new Promise((resolve) => {
    if (!currentTrack) {
      resolve();
      return;
    }
    const audio = currentTrack;
    const from = audio.volume;
    tween(
      from,
      0,
      duration,
      (v) => {
        audio.volume = v;
      },
      () => {
        audio.pause();
        if (currentTrack === audio) {
          currentTrack = null;
          currentId = null;
        }
        resolve();
      },
    );
  });
}

export function stopMusic(): void {
  cancelFade();
  if (currentTrack) {
    currentTrack.pause();
    currentTrack = null;
    currentId = null;
  }
}

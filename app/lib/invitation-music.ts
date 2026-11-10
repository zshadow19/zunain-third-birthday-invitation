export const invitationMusic = {
  src: "/audio/playful-joyful-audio.mp3",
  volume: .23,
  fadeInMs: 650,
  fadeOutMs: 180,
} as const;

export type MusicStatus = "unavailable" | "paused" | "loading" | "playing";

export interface InvitationMusicController {
  startFromEnvelope(): void;
  toggle(): void;
  dispose(): void;
}

// Audio is owned by the experience, independently of scene timelines and Replay.
export function createInvitationMusic(
  audio: HTMLAudioElement,
  notify: (status: MusicStatus) => void,
): InvitationMusicController {
  let disposed = false;
  let desired = false;
  let openingAttempted = false;
  let preference: "automatic" | "play" | "pause" = "automatic";
  let resumeOnVisible = false;
  let request = 0;
  let frame = 0;
  let status: MusicStatus = "paused";

  function publish(next: MusicStatus) {
    if (disposed) return;
    status = next;
    notify(next);
  }

  function cancelFade() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function volume(value: number) {
    // Some mobile browsers leave volume to the device. That must not block playback.
    try { audio.volume = value; } catch { /* Retain native device volume control. */ }
  }

  function fade(to: number, milliseconds: number, complete?: () => void) {
    cancelFade();
    const generation = request;
    const from = audio.volume;
    let start: number | null = null;
    const tick = (time: number) => {
      frame = 0;
      if (disposed || generation !== request) return;
      start ??= time;
      const progress = Math.min(1, (time - start) / milliseconds);
      volume(from + (to - from) * progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else complete?.();
    };
    frame = requestAnimationFrame(tick);
  }

  function fail() {
    request += 1;
    desired = false;
    resumeOnVisible = false;
    cancelFade();
    audio.pause();
    volume(0);
    publish("paused");
  }

  function onPlaying() {
    if (disposed || !desired || document.hidden) {
      audio.pause();
      return;
    }
    if (status === "playing") return;
    publish("playing");
    fade(invitationMusic.volume, invitationMusic.fadeInMs);
  }

  function play() {
    if (disposed || document.hidden) return;
    request += 1;
    const generation = request;
    desired = true;
    cancelFade();
    publish("loading");
    try {
      // Keep this call synchronous: the envelope/button's trusted activation is still active.
      const result = audio.play();
      Promise.resolve(result).then(() => {
        if (disposed) return;
        if (!desired || document.hidden) { audio.pause(); return; }
        if (generation === request && !audio.paused) onPlaying();
      }, () => {
        // An obsolete rejection must not stop a newer successful play request.
        if (!disposed && generation === request) fail();
      });
    } catch { if (generation === request) fail(); }
  }

  function pause(gently: boolean) {
    request += 1;
    desired = false;
    cancelFade();
    publish("paused");
    if (gently && !audio.paused) {
      fade(0, invitationMusic.fadeOutMs, () => audio.pause());
    } else {
      audio.pause();
      volume(0);
    }
  }

  function onPause() {
    if (!desired || disposed || !audio.paused) return;
    // Native interruption (e.g. another media session) requires an explicit restart.
    request += 1;
    desired = false;
    cancelFade();
    volume(0);
    publish("paused");
  }

  function onVisibility() {
    if (document.hidden) {
      resumeOnVisible ||= desired && status === "playing" && !audio.paused;
      pause(false);
    } else {
      const resume = resumeOnVisible && preference !== "pause";
      resumeOnVisible = false;
      if (resume) play();
    }
  }

  audio.preload = "none";
  audio.loop = true;
  audio.src = invitationMusic.src;
  volume(0);
  audio.addEventListener("playing", onPlaying);
  audio.addEventListener("pause", onPause);
  audio.addEventListener("error", fail);
  document.addEventListener("visibilitychange", onVisibility);
  publish("paused");

  return {
    startFromEnvelope() {
      if (disposed || openingAttempted) return;
      openingAttempted = true;
      if (preference === "automatic") play();
    },
    toggle() {
      if (disposed) return;
      resumeOnVisible = false;
      if (desired) { preference = "pause"; pause(true); }
      else { preference = "play"; play(); }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      request += 1;
      desired = false;
      resumeOnVisible = false;
      cancelFade();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", fail);
      document.removeEventListener("visibilitychange", onVisibility);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    },
  };
}

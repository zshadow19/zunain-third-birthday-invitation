import type { MusicStatus } from "../lib/invitation-music";

export function MusicToggle({ status, onToggle }: { status: MusicStatus; onToggle: () => void }) {
  const playing = status === "playing";
  const label = playing ? "Mute music" : status === "loading" ? "Cancel music playback" : "Play music";
  return (
    <button type="button" className="music-toggle" hidden={status === "unavailable"} aria-label={label} title={label} aria-pressed={playing} aria-busy={status === "loading"} onClick={onToggle}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m11 5-6 4H2v6h3l6 4V5Z" />
        {playing ? <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></> : <path d="m16 9 6 6m0-6-6 6" />}
      </svg>
    </button>
  );
}

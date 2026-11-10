export function Footprint({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
      <path d="M19 27c-3 5-7 11-4 14 3 4 8 0 10-1 3-1 9 1 11-3 2-4-3-9-7-13-4-3-7-1-10 3Z" />
      <ellipse cx="12" cy="21" rx="5" ry="7" transform="rotate(-29 12 21)" />
      <ellipse cx="23" cy="13" rx="5" ry="8" transform="rotate(-9 23 13)" />
      <ellipse cx="35" cy="16" rx="5" ry="7" transform="rotate(22 35 16)" />
    </svg>
  );
}
function Foliage({ side }: { side: "left" | "right" }) {
  return (
    <svg className={`envelope-foliage foliage-${side}`} viewBox="0 0 180 300" fill="none" aria-hidden="true">
      <defs><linearGradient id={`leaf-${side}`} x1="10" y1="220" x2="150" y2="30" gradientUnits="userSpaceOnUse"><stop stopColor="#46683f" /><stop offset=".5" stopColor="#7d9b62" /><stop offset="1" stopColor="#b9c996" /></linearGradient></defs>
      <g fill={`url(#leaf-${side})`} stroke="#648454" strokeWidth=".7">
        <path d="M78 278C33 198 20 113 56 15c28 46 24 71 6 86 31-12 38 20 25 48 32-9 33 29 13 52 28 1 21 43-22 77Z" />
        <path d="M75 274C68 192 109 94 169 59c-1 41-10 68-36 74 27 8 17 37-15 52 29 8 11 42-22 51 11 15 1 28-21 38Z" />
        <path d="M75 278C27 270 2 232 5 190c30 11 46 31 44 51 16-9 28 4 26 37Z" />
      </g>
      <g stroke="#dce4bf" opacity=".6" strokeWidth="1.2"><path d="M77 278C54 188 49 106 57 35M78 274c16-82 46-148 85-201M76 278c-30-25-44-47-63-74" /><path d="m57 99-16-23m19 60-23-24m31 72-27-25m58 55 31-14m-18-29 31-17m-12-22 27-15" /></g>
    </svg>
  );
}
export function JungleEnvelope({ onOpen, available }: { onOpen: () => void; available: boolean }) {
  return (
    <div className="envelope-stage">
      <div className="envelope-intro" data-envelope-part>
        <h2>A little celebration awaits.</h2>
      </div>
      <div className="envelope-shell" data-envelope-shell>
        <div className="envelope-foliage-wrap" data-envelope-part><Foliage side="left" /><Foliage side="right" /></div>
        <div className="envelope-back paper-texture" data-envelope-part />
        <div className="envelope-flap" data-envelope-flap data-envelope-part><div className="flap-inner paper-texture" /></div>
        <div className="envelope-pocket paper-texture" data-envelope-part />
        <div className="envelope-pocket-edge" data-envelope-part />
        <div className="envelope-seal" data-envelope-seal data-envelope-part><Footprint /></div>
        <div className="envelope-address" data-envelope-part><span>for you</span><small>A VERY SPECIAL INVITATION</small></div>
        <button type="button" className="envelope-trigger" data-open aria-label="Open Zunain’s birthday invitation" aria-disabled={!available} onClick={onOpen}>
          <span className="envelope-cue" data-envelope-part aria-hidden="true">Tap to open <span>↑</span></span>
        </button>
      </div>
    </div>
  );
}

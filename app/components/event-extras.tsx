"use client";
import { useEffect, useState } from "react";
import { getCountdown, invitation } from "../lib/invitation";

export function EventExtras({ active, timerEpoch, onReplay }: { active: boolean; timerEpoch: number; onReplay: () => void }) {
  const [countdown, setCountdown] = useState<ReturnType<typeof getCountdown> | null>(null);
  useEffect(() => {
    if (!active) return;
    const update = () => setCountdown(getCountdown(Date.now()));
    update();
    const interval = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("pageshow", update);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", update); window.removeEventListener("pageshow", update); };
  }, [active, timerEpoch]);
  return (
    <section className="event-extras" aria-labelledby="countdown-title">
      <h2 id="countdown-title">Counting down to the celebration</h2>
      {countdown?.complete ? <p className="party-time">It’s party time!</p> : (
        <div className="countdown" role="timer" aria-live="off" aria-label={countdown ? `${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes, ${countdown.seconds} seconds until the party` : "The party starts on 21 November 2026 at 6:30 PM, Dhaka time"}>
          {(["days", "hours", "minutes", "seconds"] as const).map((unit) => <div key={unit}><span>{countdown ? String(countdown[unit]).padStart(2, "0") : "—"}</span><small>{unit}</small></div>)}
        </div>
      )}
      <p className="event-time"><time dateTime={invitation.startsAt}>{invitation.dateLabel}<br />{invitation.timeLabel}</time></p>
      <a href={invitation.mapsUrl} className="directions-button" target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m12 2 10 10-10 10L2 12 12 2Z" /><path d="M8 15v-4h8m-3-3 3 3-3 3" /></svg>
        Get directions <span aria-hidden="true">↗</span>
      </a>
      <p className="venue-note">{invitation.venue}</p>
      <button className="text-button replay-button" onClick={onReplay} data-replay>↻ <span>Replay the invitation</span></button>
      <p className="closing-note">We can’t wait to celebrate with you.</p>
    </section>
  );
}

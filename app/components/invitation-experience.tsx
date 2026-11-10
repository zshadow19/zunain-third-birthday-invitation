"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { JungleEnvelope } from "./jungle-envelope";
import { EventExtras } from "./event-extras";
import type { InvitationController } from "../lib/invitation-controller";
import type { InvitationState } from "../lib/invitation";

export function InvitationExperience({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const controller = useRef<InvitationController | null>(null);
  const [view, setView] = useState<{ enhanced: boolean; state: InvitationState; epoch: number }>({ enhanced: false, state: "full", epoch: 0 });
  useEffect(() => {
    let cancelled = false;
    const image = root.current?.querySelector("img");
    if (!image) return;
    Promise.all([image.decode(), import("../lib/invitation-controller")]).then(([, module]) => {
      if (cancelled || !root.current) return;
      controller.current = module.createInvitationController(root.current, (state, epoch) => setView({ enhanced: true, state, epoch }));
    }).catch(() => {
      if (cancelled) return;
      controller.current?.dispose(); controller.current = null;
      setView({ enhanced: false, state: "full", epoch: 0 });
    });
    return () => { cancelled = true; controller.current?.dispose(); controller.current = null; };
  }, []);
  function safely(action: keyof Pick<InvitationController, "open" | "expand" | "replay" | "showFull">) {
    try { controller.current?.[action](); }
    catch { controller.current?.dispose(); controller.current = null; setView({ enhanced: false, state: "full", epoch: view.epoch + 1 }); }
  }
  return (
    <div ref={root} className="invitation-experience" data-state={view.state} data-enhanced={view.enhanced}>
      <div className="experience-toolbar"><a className="text-button bypass-link" href="#invitation" onClick={(event) => { if (controller.current) { event.preventDefault(); safely("showFull"); } }}>View full invitation <span aria-hidden="true">↗</span></a></div>
      <div className="experience-stage">
        <div className="envelope-accessibility" inert={view.enhanced && view.state !== "closed" && view.state !== "opening"}><JungleEnvelope /></div>
        <a className="open-button static-open" href="#invitation">View your invitation <span aria-hidden="true">↓</span></a>
        <button className="open-button enhanced-open" data-open onClick={() => safely("open")} disabled={view.state !== "closed"}>Tap to open <span aria-hidden="true">↑</span></button>
        <div className="card-frame" id="invitation" tabIndex={-1} aria-label="Zunain’s third birthday invitation" aria-hidden={view.enhanced && (view.state === "closed" || view.state === "opening")}>{children}</div>
        <div className="confetti" data-confetti aria-hidden="true" />
      </div>
      <div className="scene-actions">
        <button className="continue-button" data-continue disabled={view.state !== "reveal"} onClick={() => safely("expand")}>Continue <span aria-hidden="true">↓</span></button>
        <button className="text-button replay-button" onClick={() => safely("replay")}>↻ Replay</button>
      </div>
      <div className="extras-wrapper" hidden={view.enhanced && view.state !== "full" && view.state !== "expanding"}>
        <EventExtras active={view.state === "full"} timerEpoch={view.epoch} onReplay={() => safely("replay")} />
      </div>
      <p className="sr-only" role="status" aria-live="polite">{view.enhanced ? view.state === "reveal" ? "Zunain is turning three! Continue for the party details." : view.state === "full" ? "The full invitation and party details are ready." : "" : ""}</p>
    </div>
  );
}

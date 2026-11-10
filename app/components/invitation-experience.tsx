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
    let frame = 0;
    const image = root.current?.querySelector("img");
    if (!image) return;
    Promise.all([image.decode(), import("../lib/invitation-controller")]).then(async ([, module]) => {
      await new Promise<void>((resolve) => { frame = requestAnimationFrame(() => resolve()); });
      if (cancelled || !root.current) return;
      if (!image.naturalWidth || !root.current.getBoundingClientRect().width) throw new Error("Invitation layout is unavailable");
      controller.current = module.createInvitationController(root.current, (state, epoch) => {
        if (!cancelled) setView({ enhanced: true, state, epoch });
      });
    }).catch(() => {
      if (cancelled) return;
      controller.current?.dispose(); controller.current = null;
      setView({ enhanced: false, state: "full", epoch: 0 });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); controller.current?.dispose(); controller.current = null; };
  }, []);
  function safely(action: keyof Pick<InvitationController, "open" | "replay" | "showFull">) {
    try { controller.current?.[action](); }
    catch { controller.current?.dispose(); controller.current = null; setView({ enhanced: false, state: "full", epoch: view.epoch + 1 }); }
  }
  return (
    <div ref={root} className="invitation-experience" data-state={view.state} data-enhanced={view.enhanced}>
      <div className="experience-stage">
        <div className="envelope-accessibility" inert={!view.enhanced || (view.state !== "closed" && view.state !== "opening")}><JungleEnvelope available={view.enhanced && view.state === "closed"} onOpen={() => safely("open")} /></div>
        <div className="card-frame" id="invitation" tabIndex={-1} aria-label="Zunain’s third birthday invitation" aria-hidden={view.enhanced && (view.state === "closed" || view.state === "opening")}>{children}</div>
        <div className="confetti" data-confetti aria-hidden="true" />
      </div>
      <div className="extras-wrapper" hidden={view.enhanced && view.state !== "full" && view.state !== "expanding"} inert={view.enhanced && view.state !== "full"}>
        <EventExtras active={view.state === "full"} timerEpoch={view.epoch} onReplay={() => safely("replay")} />
      </div>
      <p className="sr-only" role="status" aria-live="polite">{view.enhanced ? view.state === "reveal" ? "Zunain is turning three! The party details will appear shortly." : view.state === "full" ? "The full invitation and party details are ready." : "" : ""}</p>
    </div>
  );
}

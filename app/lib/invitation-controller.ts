import { gsap } from "gsap";
import { canTransition, invitation, restoredScene, type InvitationState } from "./invitation";

export interface InvitationController {
  open(): void;
  replay(): void;
  showFull(): void;
  dispose(): void;
}

export function createInvitationController(
  root: HTMLDivElement,
  notify: (state: InvitationState, timerEpoch: number) => void,
): InvitationController {
  const requireElement = <T extends HTMLElement>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing invitation element: ${selector}`);
    return element;
  };
  const stage = requireElement<HTMLDivElement>(".experience-stage");
  const card = requireElement<HTMLDivElement>(".card-frame");
  const shell = requireElement<HTMLDivElement>("[data-envelope-shell]");
  const flap = requireElement<HTMLDivElement>("[data-envelope-flap]");
  const seal = requireElement<HTMLDivElement>("[data-envelope-seal]");
  const openButton = requireElement<HTMLButtonElement>("[data-open]");
  const extras = requireElement<HTMLDivElement>(".extras-wrapper");
  const envelopeAccess = requireElement<HTMLDivElement>(".envelope-accessibility");
  const confettiHost = requireElement<HTMLDivElement>("[data-confetti]");
  const bodyParts = shell.querySelectorAll<HTMLElement>("[data-envelope-part]:not(.envelope-foliage-wrap):not(.envelope-cue)");
  const foliage = requireElement<HTMLDivElement>(".envelope-foliage-wrap");
  const intro = requireElement<HTMLDivElement>(".envelope-intro");
  const cue = requireElement<HTMLSpanElement>(".envelope-cue");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Deterministic, local visual checkpoints; inert in production.
  const checkpoint = process.env.NODE_ENV === "development" ? new URLSearchParams(window.location.search).get("checkpoint") : null;
  const checkpoints: Record<string, number> = { flap: .55, extraction: .95, reveal: 2.25, "expansion-early": 3.35, "expansion-mid": 3.65, "expansion-late": 4, pan: 4.4 };
  const reducedMotion = () => motion.matches || checkpoint === "reduced-motion";
  const previousScene = restoredScene(window.history.state);
  let state: InvitationState = "full";
  let disposed = false;
  let run = 0;
  let context: gsap.Context | null = null;
  let timeline: gsap.core.Timeline | null = null;
  let cleanupIntent: (() => void) | null = null;
  let restoreAnchor: (() => void) | null = null;
  let confettiPlayed = false;
  let width = root.clientWidth;
  let viewportHeight = window.innerHeight;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const frames = new Set<number>();
  const playing = () => state === "opening" || state === "reveal" || state === "expanding";

  function later(callback: () => void) {
    const current = run;
    const id = requestAnimationFrame(() => {
      frames.delete(id);
      if (!disposed && current === run) callback();
    });
    frames.add(id);
  }

  function suspendAnchoring() {
    if (restoreAnchor) return;
    const style = document.documentElement.style;
    const previous = style.getPropertyValue("overflow-anchor");
    const priority = style.getPropertyPriority("overflow-anchor");
    style.setProperty("overflow-anchor", "none");
    restoreAnchor = () => {
      if (previous) style.setProperty("overflow-anchor", previous, priority);
      else style.removeProperty("overflow-anchor");
      restoreAnchor = null;
    };
  }

  function restoreAnchoring() { restoreAnchor?.(); }

  function transition(next: InvitationState) {
    if (disposed || (next !== state && !canTransition(state, next))) return false;
    state = next;
    root.dataset.state = next;
    root.dataset.enhanced = "true";
    // Keep DOM accessibility/layout synchronous with GSAP; React mirrors these attributes.
    openButton.setAttribute("aria-disabled", String(next !== "closed"));
    envelopeAccess.inert = next !== "closed" && next !== "opening";
    card.setAttribute("aria-hidden", String(next === "closed" || next === "opening"));
    extras.hidden = next !== "full" && next !== "expanding";
    extras.inert = next !== "full";
    if (next === "reveal" || next === "full" || next === "closed") {
      try {
        const entry = { ...window.history.state };
        if (next === "closed") delete entry.__zunainInvitation;
        else entry.__zunainInvitation = next;
        window.history.replaceState(entry, "");
      } catch { /* History restrictions must never block the invitation. */ }
    }
    notify(next, run);
    return true;
  }

  // Invalidate callbacks before reverting styles. Layout extent is managed by the caller.
  function cancelRun() {
    run += 1;
    cleanupIntent?.(); cleanupIntent = null;
    timeline?.kill(); timeline = null;
    context?.revert(); context = null;
    timers.forEach(clearTimeout); timers.clear();
    frames.forEach(cancelAnimationFrame); frames.clear();
    confettiHost.replaceChildren();
  }

  function scoped(callback: () => void) {
    context ??= gsap.context(() => {}, root);
    context.add(callback);
  }

  function fullHeight() {
    const height = stage.getBoundingClientRect().width * invitation.artworkHeight / invitation.artworkWidth;
    if (!Number.isFinite(height) || height <= 0) throw new Error("Invalid invitation geometry");
    return height;
  }

  function full() {
    if (disposed) return;
    const scrollPosition = window.scrollY;
    const moveFocus = document.activeElement === openButton;
    suspendAnchoring();
    // Prevent temporary context reversion or a disappearing scene minimum from clamping scroll.
    stage.style.minHeight = `${Math.max(stage.getBoundingClientRect().height, card.scrollHeight)}px`;
    cancelRun();
    transition("full");
    card.removeAttribute("style");
    stage.style.removeProperty("min-height");
    // Flush final layout while anchoring is suspended. Only repair a synchronous layout shift;
    // there are no deferred scroll writes, so the initiating gesture keeps its native behavior.
    stage.getBoundingClientRect();
    if (window.scrollY !== scrollPosition) window.scrollTo({ top: scrollPosition, behavior: "instant" });
    restoreAnchoring();
    if (moveFocus) card.focus({ preventScroll: true });
  }

  function guarded(callback: () => void) {
    const current = run;
    return () => {
      if (disposed || current !== run) return;
      try { callback(); } catch { full(); }
    };
  }

  function resetClosed(focus: boolean) {
    suspendAnchoring();
    cancelRun();
    confettiPlayed = false;
    transition("closed");
    card.removeAttribute("style");
    const height = fullHeight();
    const target = card.getBoundingClientRect();
    const envelope = shell.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    if (envelope.width <= 0 || envelope.height <= 0) throw new Error("Invalid envelope geometry");
    const scale = envelope.width * .86 / target.width;
    stage.style.minHeight = `${Math.max(envelope.bottom - stageRect.top + 76, height * invitation.revealFraction)}px`;
    scoped(() => {
      gsap.set(card, {
        x: envelope.left + envelope.width * .07 - target.left,
        y: envelope.top + envelope.height * .07 - target.top,
        scale, rotation: 0, height: envelope.height * .84 / scale,
        zIndex: 3, transformOrigin: "0 0", boxShadow: "0 4px 12px -5px #30452f20",
      });
    });
    stage.getBoundingClientRect();
    restoreAnchoring();
    if (focus) {
      window.scrollTo({ top: 0, behavior: "instant" });
      later(() => openButton.focus({ preventScroll: true }));
    }
  }

  function burst() {
    if (confettiPlayed || reducedMotion() || state !== "reveal") return;
    confettiPlayed = true;
    const colors = ["#c87842", "#a5b77c", "#557840", "#e7ba64", "#d9bfa1"];
    const bits = Array.from({ length: 20 }, (_, index) => {
      const bit = document.createElement("span");
      bit.style.backgroundColor = colors[index % colors.length];
      bit.style.borderRadius = index % 3 === 0 ? "50%" : "1px";
      confettiHost.append(bit);
      return bit;
    });
    scoped(() => {
      gsap.set(confettiHost, { top: fullHeight() * .39 });
      gsap.fromTo(bits, { x: 0, y: 0, opacity: 0, rotation: 0 }, {
        x: (index) => Math.sin(index * 2.4) * (55 + index * 3),
        y: (index) => -70 + (index % 6) * 22,
        rotation: (index) => index * 49, opacity: 1, duration: .55, ease: "power2.out",
      });
      gsap.to(bits, { y: "+=55", opacity: 0, duration: .55, delay: .5, ease: "power1.in", onComplete: guarded(() => confettiHost.replaceChildren()) });
    });
  }

  function listenForScrollIntent() {
    let touch: { x: number; y: number } | null = null;
    const interrupt = () => { if (playing()) full(); };
    const onWheel = (event: WheelEvent) => { if (event.deltaX !== 0 || event.deltaY !== 0) interrupt(); };
    const onTouchStart = (event: TouchEvent) => {
      const point = event.touches[0];
      touch = point ? { x: point.clientX, y: point.clientY } : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const point = event.touches[0];
      if (touch && point && Math.hypot(point.clientX - touch.x, point.clientY - touch.y) >= 10) interrupt();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input,textarea,select,[contenteditable]:not([contenteditable='false']),[role='slider']")) return;
      if (event.key === " " && target?.closest("button,a,[role='button']")) return;
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) interrupt();
    };
    // A press that started during extraction must not become a skip when released after reveal.
    let cardPressCanSkip = false;
    const onCardPress = () => { cardPressCanSkip = state === "reveal" || state === "expanding"; };
    const onCardClick = () => { if (cardPressCanSkip && (state === "reveal" || state === "expanding")) full(); cardPressCanSkip = false; };
    const onTouchEnd = () => { touch = null; };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    card.addEventListener("pointerdown", onCardPress);
    card.addEventListener("click", onCardClick);
    return () => {
      window.removeEventListener("wheel", onWheel); window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove); window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd); window.removeEventListener("keydown", onKey);
      card.removeEventListener("pointerdown", onCardPress); card.removeEventListener("click", onCardClick);
    };
  }

  function open() {
    if (disposed || state !== "closed") return;
    // This state change is the synchronous activation guard, independent of React rendering.
    transition("opening");
    const height = fullHeight();
    const envelope = shell.getBoundingClientRect();
    if (envelope.width <= 0 || envelope.height <= 0) { full(); return; }
    if (reducedMotion()) { full(); return; }
    const revealHeight = height * invitation.revealFraction;
    const scale = envelope.width * .86 / card.clientWidth;
    const envelopeY = envelope.top - stage.getBoundingClientRect().top;
    const drop = Math.max(48, revealHeight * scale + 18 - envelopeY);
    suspendAnchoring();
    cleanupIntent = listenForScrollIntent();
    if (!(checkpoint && checkpoint in checkpoints)) {
      const id = setTimeout(guarded(full), 6500);
      timers.add(id);
    }
    const pan = { y: 0 };
    let panDestination = 0;
    scoped(() => {
      card.style.willChange = "transform,height";
      timeline = gsap.timeline({ onComplete: guarded(full) });
      timeline.addLabel("seal", 0)
        .to(seal, { scale: 1.06, rotation: -18, y: -6, opacity: 0, duration: .22, ease: "power1.out" }, 0)
        .to(cue, { opacity: 0, duration: .18 }, 0)
        .to(intro, { opacity: 0, duration: .35 }, .2)
        .to(flap, { rotationX: -180, transformPerspective: 900, duration: .45, ease: "power2.inOut" }, .1)
        .set(flap, { zIndex: 2 }, .55)
        .addLabel("extraction", .95)
        .to(card, { y: 0, height: revealHeight, duration: .8, ease: "power2.inOut" }, .55)
        .to(bodyParts, { y: drop, duration: .8, ease: "power2.inOut" }, .55)
        .to(foliage, { y: 24, opacity: 0, duration: .55, ease: "power1.out" }, .8)
        .to(bodyParts, { opacity: 0, duration: .45, ease: "power1.out" }, 1.15)
        .set(card, { zIndex: 8 }, 1.35)
        .to(card, { x: 0, y: 0, scale: 1, rotation: 0, boxShadow: "0 12px 36px -14px #42513a25", duration: .65, ease: "power2.inOut" }, 1.35)
        .addLabel("reveal", 2)
        .call(guarded(() => {
          const moveFocus = document.activeElement === openButton;
          transition("reveal");
          card.style.removeProperty("will-change");
          if (moveFocus) card.focus({ preventScroll: true });
          burst();
        }), [], 2)
        .addLabel("expand", 3.25)
        .call(guarded(() => transition("expanding")), [], 3.25)
        .to(card, { height, duration: .8, ease: "power2.inOut" }, 3.25)
        .addLabel("pan", 3.65)
        .call(guarded(() => {
          pan.y = window.scrollY;
          const safeTop = parseFloat(getComputedStyle(root).getPropertyValue("--safe-top")) || 0;
          const cardTop = card.getBoundingClientRect().top + window.scrollY;
          const finalDocumentHeight = document.documentElement.scrollHeight + height - card.getBoundingClientRect().height;
          panDestination = Math.max(0, Math.min(cardTop + height * invitation.detailsFraction - safeTop - 24, finalDocumentHeight - window.innerHeight));
        }), [], 3.65)
        .to(pan, {
          y: () => panDestination, duration: 1.45, ease: "power2.inOut",
          onUpdate: guarded(() => window.scrollTo({ top: pan.y, behavior: "instant" })),
        }, 3.65)
        .addLabel("full", 5.1);
      if (checkpoint && checkpoint in checkpoints) timeline.seek(checkpoints[checkpoint], false).pause();
    });
  }

  function onResize() {
    const nextWidth = root.clientWidth;
    const significant = Math.abs(nextWidth - width) > 1 || Math.abs(window.innerHeight - viewportHeight) > 120;
    width = nextWidth; viewportHeight = window.innerHeight;
    if (!significant) return;
    if (playing()) full();
    else if (state === "closed") {
      try { resetClosed(false); } catch { full(); }
    }
  }
  function onPageShow(event: PageTransitionEvent) { if (event.persisted) { if (playing()) full(); else onResize(); } }
  function onVisibility() { if (document.hidden && playing()) full(); }
  function onMotionChange() { if (playing()) full(); }
  function removeListeners() {
    window.removeEventListener("resize", onResize); window.removeEventListener("pageshow", onPageShow);
    document.removeEventListener("visibilitychange", onVisibility); motion.removeEventListener("change", onMotionChange);
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("pageshow", onPageShow);
  document.addEventListener("visibilitychange", onVisibility);
  motion.addEventListener("change", onMotionChange);

  try {
    if (checkpoint === "initialization-failure") throw new Error("QA: animation initialization failure");
    fullHeight();
    if (window.location.hash === "#invitation" || previousScene || window.scrollY > 80) full();
    else resetClosed(false);
  } catch (error) {
    cancelRun(); restoreAnchoring(); removeListeners();
    stage.style.removeProperty("min-height"); card.removeAttribute("style");
    root.dataset.enhanced = "false"; root.dataset.state = "full";
    extras.hidden = false; extras.inert = false; card.setAttribute("aria-hidden", "false");
    throw error;
  }

  return {
    open,
    replay() { if (!disposed) resetClosed(true); },
    showFull: full,
    dispose() {
      if (disposed) return;
      const moveFocus = document.activeElement === openButton;
      full();
      disposed = true;
      removeListeners();
      root.dataset.enhanced = "false"; root.dataset.state = "full";
      envelopeAccess.inert = true;
      if (moveFocus) card.focus({ preventScroll: true });
    },
  };
}

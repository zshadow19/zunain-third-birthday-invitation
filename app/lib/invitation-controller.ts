import { gsap } from "gsap";
import { canTransition, invitation, restoredScene, type InvitationState } from "./invitation";

export interface InvitationController {
  open(): void;
  expand(): void;
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
  const continueButton = requireElement<HTMLButtonElement>("[data-continue]");
  const confettiHost = requireElement<HTMLDivElement>("[data-confetti]");
  const parts = root.querySelectorAll<HTMLElement>("[data-envelope-part]");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Development-only, deterministic visual QA. This branch is removed in production.
  const checkpoint = process.env.NODE_ENV === "development" ? new URLSearchParams(window.location.search).get("checkpoint") : null;
  const reducedMotion = () => motion.matches || checkpoint === "reduced-motion";
  const previousScene = restoredScene(window.history.state);
  let state: InvitationState = previousScene === "reveal" ? "reveal" : "full";
  let disposed = false;
  let run = 0;
  let context: gsap.Context | null = null;
  let timeline: gsap.core.Timeline | null = null;
  let cleanupPan: (() => void) | null = null;
  let confettiPlayed = false;
  let width = root.clientWidth;
  let viewportHeight = window.innerHeight;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const frames = new Set<number>();

  function later(callback: () => void) {
    const current = run;
    const id = requestAnimationFrame(() => {
      frames.delete(id);
      if (!disposed && current === run) callback();
    });
    frames.add(id);
  }

  function transition(next: InvitationState) {
    if (disposed || (next !== state && !canTransition(state, next))) return false;
    state = next;
    root.dataset.state = next;
    root.dataset.enhanced = "true";
    if (next === "reveal" || next === "full" || next === "closed") {
      try {
        // Preserve Next.js's own fields and the URL; never add scene history entries.
        const entry = { ...window.history.state };
        if (next === "closed") delete entry.__zunainInvitation;
        else entry.__zunainInvitation = next;
        window.history.replaceState(entry, "");
      } catch { /* Restricted history access must not block the invitation. */ }
    }
    notify(next, run);
    return true;
  }

  // The common teardown invalidates every completion callback before reverting styles.
  function cancelRun() {
    run += 1;
    cleanupPan?.(); cleanupPan = null;
    timeline?.kill(); timeline = null;
    context?.revert(); context = null;
    timers.forEach(clearTimeout); timers.clear();
    frames.forEach(cancelAnimationFrame); frames.clear();
    confettiHost.replaceChildren();
    root.style.removeProperty("overflow-anchor");
    card.style.removeProperty("will-change");
  }

  function scoped(callback: () => void) {
    context ??= gsap.context(() => {}, root);
    context.add(callback);
  }

  function watchdog(milliseconds: number) {
    const current = run;
    const id = setTimeout(() => {
      timers.delete(id);
      if (!disposed && run === current && (state === "opening" || state === "expanding")) full(false);
    }, milliseconds);
    timers.add(id);
  }

  function full(focus: boolean) {
    if (disposed) return;
    const scrollPosition = window.scrollY;
    cancelRun();
    transition("full");
    card.removeAttribute("style");
    window.scrollTo({ top: scrollPosition, behavior: "instant" });
    if (focus) later(() => card.focus({ preventScroll: true }));
  }

  function fullHeight() {
    return stage.getBoundingClientRect().width * invitation.artworkHeight / invitation.artworkWidth;
  }

  function resetClosed(focus: boolean) {
    cancelRun();
    confettiPlayed = false;
    transition("closed");
    card.removeAttribute("style");
    const target = card.getBoundingClientRect();
    const envelope = shell.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const scale = envelope.width * .86 / target.width;
    stage.style.setProperty("--envelope-bottom", `${envelope.bottom - stageRect.top}px`);
    scoped(() => {
      gsap.set(parts, { clearProps: "all" });
      gsap.set(card, {
        x: envelope.left + envelope.width * .07 - target.left,
        y: envelope.top + envelope.height * .07 - target.top,
        scale, rotation: 0, height: envelope.height * .84 / scale,
        zIndex: 3, transformOrigin: "0 0",
      });
    });
    if (focus) later(() => { window.scrollTo({ top: 0, behavior: "instant" }); openButton.focus({ preventScroll: true }); });
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
        x: (index) => Math.sin(index * 2.4) * (65 + index * 4),
        y: (index) => -95 + (index % 6) * 30,
        rotation: (index) => index * 49, opacity: 1, duration: .65, ease: "power2.out",
      });
      gsap.to(bits, { y: "+=75", opacity: 0, duration: .65, delay: .6, ease: "power1.in", onComplete: () => confettiHost.replaceChildren() });
    });
  }

  function open() {
    if (!transitionFrom("closed", "opening")) return;
    const current = run;
    const finish = () => {
      if (disposed || current !== run || state !== "opening") return;
      timers.forEach(clearTimeout); timers.clear();
      gsap.set(card, { x: 0, y: 0, scale: 1, rotation: 0, height: fullHeight() * invitation.revealFraction, clearProps: "transform,zIndex,willChange" });
      transition("reveal");
      later(() => continueButton.focus({ preventScroll: true }));
      burst();
    };
    if (reducedMotion()) {
      scoped(() => { gsap.set(parts, { opacity: 0 }); finish(); });
      return;
    }
    if (checkpoint !== "extraction") watchdog(4500);
    scoped(() => {
      card.style.willChange = "transform";
      const envelope = shell.getBoundingClientRect();
      const scale = envelope.width * .86 / card.clientWidth;
      const extractedY = envelope.top - stage.getBoundingClientRect().top - fullHeight() * invitation.revealFraction * scale - 18;
      timeline = gsap.timeline({ onComplete: finish });
      timeline.addLabel("seal", 0)
        .to(seal, { scale: 1.12, rotation: -22, y: -9, opacity: 0, duration: .22 }, 0)
        .to(flap, { rotationX: 180, transformPerspective: 900, duration: .5, ease: "power2.inOut" }, .15)
        .set(flap, { zIndex: 2 }, .65)
        .addLabel("extraction", .85)
        .to(card, { y: extractedY, rotation: -3, height: fullHeight() * invitation.revealFraction, duration: .58, ease: "power2.inOut" }, .63)
        .to(parts, { opacity: 0, duration: .38, ease: "power1.out" }, 1.05)
        .set(card, { zIndex: 8 }, 1.4)
        .to(card, { x: 0, y: 0, scale: 1, rotation: 0, duration: .59, ease: "power2.inOut" }, 1.21)
        .addLabel("reveal", 1.8);
      if (checkpoint === "extraction") timeline.pause("extraction");
    });
  }

  function transitionFrom(from: InvitationState, next: InvitationState) {
    return state === from && transition(next);
  }

  function listenForScrollIntent(cancel: () => void) {
    let touch: { x: number; y: number } | null = null;
    const onWheel = (event: WheelEvent) => { if (event.deltaX !== 0 || event.deltaY !== 0) cancel(); };
    const onTouchStart = (event: TouchEvent) => { const point = event.touches[0]; touch = point ? { x: point.clientX, y: point.clientY } : null; };
    const onTouchMove = (event: TouchEvent) => {
      const point = event.touches[0];
      if (touch && point && Math.hypot(point.clientX - touch.x, point.clientY - touch.y) > 2) cancel();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input,textarea,select,[contenteditable='true'],[role='slider']")) return;
      if (event.key === " " && target?.closest("button,a,[role='button']")) return;
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) cancel();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel); window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove); window.removeEventListener("keydown", onKey);
    };
  }

  function expand() {
    if (state !== "reveal") return;
    // Confetti and the opening timeline are cancelled without changing the settled card geometry.
    cancelRun();
    transition("expanding");
    const height = fullHeight();
    scoped(() => gsap.set(card, { height: height * invitation.revealFraction }));
    root.style.overflowAnchor = "none";
    if (reducedMotion()) { full(true); return; }
    const current = run;
    const start = { y: window.scrollY };
    cleanupPan = listenForScrollIntent(() => {
      if (state === "expanding") full(document.activeElement === continueButton);
    });
    if (checkpoint !== "pan") watchdog(3500);
    scoped(() => {
      timeline = gsap.timeline({ onComplete: () => {
        if (current === run && state === "expanding") full(true);
      } });
      timeline.addLabel("expand", 0)
        .to(card, { height, duration: .45, ease: "power2.inOut" }, 0)
        .addLabel("pan", .25)
        .to(start, {
          y: () => {
            const cardTop = card.getBoundingClientRect().top + window.scrollY;
            const safeTop = parseFloat(getComputedStyle(root).getPropertyValue("--safe-top")) || 0;
            const destination = cardTop + height * invitation.detailsFraction - safeTop - 24;
            const finalDocumentHeight = document.documentElement.scrollHeight + height - card.getBoundingClientRect().height;
            return Math.max(0, Math.min(destination, finalDocumentHeight - window.innerHeight));
          },
          duration: 1.05, ease: "power2.inOut",
          onUpdate: () => { if (current === run) window.scrollTo({ top: start.y, behavior: "instant" }); },
        }, .25)
        .addLabel("full", 1.3);
      if (checkpoint === "pan") timeline.pause(.65);
    });
  }

  function replay() {
    if (disposed) return;
    resetClosed(true);
  }

  function onResize() {
    const nextWidth = root.clientWidth;
    const significant = Math.abs(nextWidth - width) > 1 || Math.abs(window.innerHeight - viewportHeight) > 120;
    width = nextWidth; viewportHeight = window.innerHeight;
    if (!significant) return;
    if (state === "opening" || state === "expanding") full(false);
    else if (state === "closed") resetClosed(false);
    else if (state === "reveal") scoped(() => gsap.set(card, { height: fullHeight() * invitation.revealFraction }));
  }
  function onPageShow(event: PageTransitionEvent) { if (event.persisted) onResize(); }
  function onVisibility() { if (document.hidden && (state === "opening" || state === "expanding")) full(false); }
  function onMotionChange() { if (state === "opening" || state === "expanding") full(false); }
  window.addEventListener("resize", onResize);
  window.addEventListener("pageshow", onPageShow);
  document.addEventListener("visibilitychange", onVisibility);
  motion.addEventListener("change", onMotionChange);

  try {
    if (checkpoint === "initialization-failure") throw new Error("QA: animation initialization failure");
    if (window.location.hash === "#invitation" || previousScene === "full") full(false);
    else if (previousScene === "reveal") {
      cancelRun();
      transition("reveal");
      scoped(() => gsap.set(card, { height: fullHeight() * invitation.revealFraction }));
      confettiPlayed = true;
    } else if (window.scrollY > 80) full(false);
    else resetClosed(false);
  } catch (error) {
    cancelRun();
    window.removeEventListener("resize", onResize); window.removeEventListener("pageshow", onPageShow);
    document.removeEventListener("visibilitychange", onVisibility); motion.removeEventListener("change", onMotionChange);
    root.dataset.enhanced = "false"; root.dataset.state = "full";
    throw error;
  }

  return {
    open, expand, replay,
    showFull() { full(true); later(() => window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 20, behavior: "instant" })); },
    dispose() {
      disposed = true; cancelRun();
      window.removeEventListener("resize", onResize); window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility); motion.removeEventListener("change", onMotionChange);
      card.removeAttribute("style"); root.dataset.enhanced = "false"; root.dataset.state = "full";
    },
  };
}

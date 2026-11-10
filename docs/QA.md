# Invitation verification — 11 November 2026

## Automated checks

- `npm test`: timezone conversion, countdown rollover/zero clamp, duplicate-transition guards, recovery/replay transitions, and completed-scene history decoding.
- `npm run typecheck`: TypeScript passes.
- `npm run build`: production build passes; the invitation is prerendered as static content.
- `node scripts/check-built-page.mjs`: verifies one server-rendered, full-height, accessible invitation; fallback anchors; event timestamp; directions; canonical/Open Graph/Twitter metadata; 1200 × 630 preview; and the unchanged original PNG checksum.

## Browser verification

Verified in the Codex in-app Chromium browser on Windows, using explicit CSS viewport sizes. These are browser viewport checks, not physical-device or touch-hardware validation.

| Scenario | Result |
| --- | --- |
| 320, 375, 390, 430, 480 × 844 | Production reveal checked at all five widths. One card, natural image ratio, no horizontal overflow, full 3 and hat visible, event details concealed, Continue reachable. |
| 1000 × 1000 desktop | Card capped at 480 px and centered in the usable viewport. |
| 568 × 320 landscape | Controls reachable through native scrolling; Continue completes and the full invitation remains scrollable. |
| Original artwork | Preserved file hash; no image filtering, retyping, reconstruction, or distortion. |
| Opening and layering | Seal releases, flap opens behind the card, pocket stays in front during extraction, envelope fades as the card emerges. |
| Reveal boundary | `0.52` visually accepted; small whitespace remains below the entire 3 and no printed event details appear. |
| Completed reveal | Stationary until Continue; rapid double-click opens once and produces a single 20-piece confetti burst. |
| Guided pan | Expansion and pan overlap; final screenshot places the printed date and venue near the top. Card width remains unchanged. |
| Wheel and keyboard interruption | Development pan fixture immediately enters `full`, clears animation styles, and leaves native scrolling active. |
| Replay during confetti | Confetti removed immediately, scroll restored to zero, Tap to Open receives focus, and later callbacks do not advance the scene. |
| Replay during guided pan | Paused pan fixture returns immediately to `closed`, removes confetti, restores scroll zero, and focuses Tap to Open. |
| Resize / bypass during extraction | Both recover to a full readable card, with the opening timeline cancelled. |
| Initialization failure | Development failure fixture leaves one full-height card and working native fallback anchors; body overflow remains unrestricted. |
| Reduced motion | Forced development branch verified without confetti or guided pan, with both deliberate interactions usable. Actual OS preference integration still needs a device check. |
| Browser history | In the final production build, leaving for the local social image and using Back restores both `reveal` and `full`; restored reveal does not replay confetti. The existing entry is updated without adding scene navigation entries. Additional browser engines remain in the device checklist. |
| Directions | Link has the venue-name destination and `api=1`; the floor is displayed separately. Destination pin/app handoff requires device verification. |

The closed and replayed 390 px captures were compared after returning to the same geometry. Small JPEG/focus rasterization differences are expected; replay restores the layout and scroll position. Intermediate extraction uses a paused GSAP timeline label for repeatability.

## Saved visual checkpoints

| Checkpoint | File |
| --- | --- |
| Closed envelope | [01-closed-envelope-390.jpg](qa/01-closed-envelope-390.jpg) |
| Extraction at 0.85 seconds, development fixture | [02-card-extraction-390.jpg](qa/02-card-extraction-390.jpg) |
| Completed birthday reveal, confetti finished | [03-birthday-reveal-390.jpg](qa/03-birthday-reveal-390.jpg) |
| Guided-pan destination | [04-guided-pan-destination-390.jpg](qa/04-guided-pan-destination-390.jpg) |
| Card bottom and extras | [05-card-bottom-and-extras-390.jpg](qa/05-card-bottom-and-extras-390.jpg) |
| Replayed envelope | [06-replayed-envelope-390.jpg](qa/06-replayed-envelope-390.jpg) |

Additional width captures, the desktop and landscape views, and the initialization-failure fallback are in `docs/qa/`. The social composition is `public/social-preview.jpg`. Development captures may include the Next.js development indicator; production captures do not.

## Verification limits and physical-device checklist

JavaScript-disabled **server HTML** is verified, and controller-initialization failure is exercised in the browser. A real browser run with JavaScript disabled was not completed: native Chrome access approval timed out. Do not treat the failure fixture as a JavaScript-disabled browser test.

After deployment, record device, OS, app version, production URL, date, and pass/fail for each item below. All physical-device checks remain **pending**.

- iOS Safari, WhatsApp, and Messenger: envelope opening; readable stationary reveal; Continue; touch-drag cancellation; native scrolling to the card bottom; safe-area and collapsing browser-toolbar behavior.
- Android Chrome, WhatsApp, and Messenger: the same flow, including back/forward return from Maps and portrait/landscape changes during opening and pan.
- Enable the device’s reduced-motion preference; verify that no confetti or guided pan occurs and every control remains usable.
- Disable JavaScript in a browser and reload the production page; use the static anchors, read the entire artwork, and open directions.
- Use keyboard navigation and a screen reader; check focus transfer, visible focus, event text, and the absence of per-second countdown announcements.
- Try rapid taps, replay while confetti/pan is active, background/resume, slow artwork loading, failed controller loading, and browser back/forward restoration.
- Confirm the directions pin is the intended Lakeshore Heights entrance and that the floor instruction remains visible.
- Confirm the public canonical URL and social-preview image after setting `SITE_URL`, then inspect an actual WhatsApp/Messenger link preview. Platform caches may retain an earlier image.

No live Vercel deployment or physical-device validation was performed as part of this delivery.

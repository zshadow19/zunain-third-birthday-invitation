# Invitation verification — 11 November 2026

## Automated checks

- `npm test`: **29 passing tests**, including 13 music lifecycle tests and the existing invitation/countdown/address/restoration tests. Music checks cover initial silence, synchronous activation, rejected/throwing playback, volume fades, toggles, Replay preference, stale promises/queued pause events, visibility, blocked resumption, missing/decode failures, cleanup, and Strict Mode-style remounts. Invitation checks retain guarded progression, interruption, recovery, and history coverage. The adapters verify behavior and cleanup; browser checks verify actual media playback, GSAP rendering, and layout.
- `npm run typecheck`: passes.
- `npm run lint`: passes without warnings; the existing masthead anchor error is fixed.
- `npm run build`: passes; the page remains statically prerendered. The sandbox blocked worker creation with `spawn EPERM`; the same build and tests passed outside the sandbox.
- `node scripts/check-built-page.mjs`: passes. Confirms one full accessible server-rendered card, one native envelope target, one Replay, no Continue/bypass navigation, preserved event/directions/social metadata, 1200 × 630 preview dimensions, and the unchanged original PNG checksum.
- Music build checks also confirm exactly one audio element with the supplied local source, no autoplay, `preload="none"`, one toggle, and a nonempty MP3 with a valid header. A production HTTP smoke check returned `200`, `audio/mpeg`, 4,829,100 bytes, and byte-for-byte equality with the supplied asset (SHA-256 recorded in [MUSIC.md](MUSIC.md)). Next.js serves public assets from `public/`; they are not expected to be copied into `.next/static`.

## Local browser verification

Verified in the Codex in-app Chromium browser on Windows against local development and production servers. Explicit viewport overrides are browser layout checks, not physical-device or touch-hardware tests.

| Scenario | Observed result |
| --- | --- |
| Envelope activation | Footprint seal, envelope surface, Enter, and Space open the invitation. The envelope is one named native button. Rapid repeated taps leave one opening sequence. |
| Extraction | Paused 0.95-second checkpoint shows the card behind the front pocket and the flap behind the card. No abrupt card handoff was observed during local playback. |
| Flap orientation repair | Corrected the reverse face from `rotateX(180deg)` to `rotateY(180deg)`. Checked closed, partially rotated, fully open (new 0.55-second checkpoint), and extraction states at 390 × 844 and 1000 × 900. The wide base remains attached to the envelope top edge and the tip extends upward. Reverse-face visibility and pocket/card overlap remain correct; no clipping or flicker was observed in local playback. |
| Flap interruption / Replay | Three keyboard-interrupted opening/Replay cycles returned the flap transform to `none`, the scene to `closed`, and scroll to zero. Existing transition timing and interruption tests still pass. |
| Automatic production playback | Sampled at approximately 0.28-second intervals: birthday reveal first observed at 2.06 s, still stationary at 3.20 s; expanding by 3.48 s; pan underway by 3.76 s; full scene by 5.20 s. Timeline endpoints are 2.0 / 3.25 / 3.65 / 5.1 s. |
| Card continuity/confetti | Card width stayed approximately 343.2 CSS px from reveal through completion in the 390 px test viewport. Exactly 20 confetti elements appeared once and were removed before expansion. |
| Incidental taps | Card/decorative taps during the extraction checkpoint leave the scene opening. Card taps after reveal/expansion immediately expose the full card. |
| Scroll interruption | Native wheel input and keyboard scrolling interrupt playback. PageDown then leaves native scrolling active; no later scroll movement was observed after the native scroll settled. |
| Interrupted expansion anchoring | Card-tap interruption at 3.35, 3.65, 4.0, and 4.4 s: scroll positions respectively 0, 0, 28, and 272 CSS px remained exactly unchanged after settling to full height. Card document-top stayed at 106 CSS px. Temporary anchoring styles were removed. |
| Responsive reveal | Checked 320 × 844, 375 × 667, 390 × 844, 430 × 932, 480 × 844, 1000 × 1000, 568 × 320, and 320 × 480. One artwork image; no horizontal overflow; width remains readable in landscape; native scrolling remains available. Desktop card cap is 480 CSS px. |
| Replay | Single final-action control resets scroll to zero, restores envelope geometry, and focuses the envelope. No playback Replay control is present. Transition-time replay/stale callback cancellation is covered by controller tests. |
| Reduced motion | Development preference fixture opens directly to full with zero confetti and no pan. Actual OS preference and live preference changes require a device check. |
| Failure fallback | Initialization-failure fixture leaves the complete original card and event actions visible. No envelope interaction is required to access the static card. |
| Production restoration | Navigating from the completed production page to its social-preview image and using Back restored `full` and the exact 494.4 CSS-pixel scroll position, with no confetti. Legacy reveal-entry normalization is also covered by controller tests. |
| Accessibility | Accessible DOM snapshots show one named envelope button while closed, the image after reveal, focus on the card when the opener disappears, and one Replay after full availability. Live status no longer mentions Continue. Countdown retains `aria-live="off"`. |
| Artwork/event data | Original checksum, aspect ratio, timestamp, image alt text, venue, and directions destination remain preserved. |

## Current captures

- [Closed/replayed envelope](qa/refined-envelope-390.png)
- [Corrected fully opened flap, mobile](qa/refined-flap-390.png)
- [Corrected fully opened flap, desktop](qa/refined-flap-desktop.png)
- [Extraction checkpoint](qa/refined-extraction-390.png)
- [Birthday reveal](qa/refined-reveal-390.png)
- [Production final scene](qa/refined-final-390.png)

Earlier numbered JPG captures in `docs/qa/` document the former manual Continue flow; they are historical references, not evidence for this revision.

The extraction capture was refreshed after the flap repair. During this check the existing development server initially retained the old generated CSS despite reporting recompilation; restarting it regenerated the corrected reverse-face transform. Flap verification and captures above use the fresh preview.

## Music verification

Source, license, configuration, replacement instructions, and the audio-specific device checklist are in [MUSIC.md](MUSIC.md).

| Scenario | Completed local verification |
| --- | --- |
| Initial silence | Development and production pages: media paused, time zero, ready state zero, one player, no autoplay, `preload="none"`. |
| Trusted envelope activation | Mouse and Enter activation request audio while opening begins. Actual MP3 decoded to a duration of 150.909375 seconds, reached ready state 4, and currentTime advanced through opening/reveal/expansion/full. The scene completed normally; it did not wait for audio readiness. |
| Volume/fades | Controller tests verify the 650 ms fade to 0.23 and 180 ms fade-out before pause. This is programmatic verification, not a physical-speaker loudness or listening test. |
| Replay / pause preference | Playing Replay retained one player and increased time from 78.191461 to 78.281218 seconds. Pausing stopped media, and reopening the envelope kept it paused. Explicit Play resumed from the retained position. |
| Rapid toggles / keyboard | Four rapid production toggles returned to playing with one player and preserved position. Space on the music button pauses/resumes independently of the invitation. Promise and queued-event races are covered in controller tests. |
| Resize / placement | Checked 320 × 480, 390 × 844, 568 × 320, and 1000 × 900. Hit target stays 44 × 44 CSS px; the visible circle is 32 px. No horizontal overflow. Control remains fixed and clear of the key printed name/3/event copy in inspected scroll positions. Resizing retains one media element and track position. Real safe-area insets remain a device check. |
| Reduced motion | Development reduced-motion fixture opened directly to full, with no confetti, while the MP3 reached ready state 4 and played normally after the envelope gesture. |
| Background / blocked audio / missing media | Unit event tests verify pause/resume preference, blocked resumption, missing/decode errors, and resource cleanup. Real OS backgrounding, autoplay restrictions, and failed-network behavior remain device/browser checks; these were not simulated in the local production browser. |

Captures: [short closed screen with control](qa/music-closed-320.png), [production invitation with control](qa/music-final-390.png).

## Verification limits and physical-device checklist

The 10 CSS-pixel touch threshold is verified through controller event tests. Real touch hardware, scroll momentum, iOS/Android viewport behavior, and screen-reader announcements were not verified locally. JavaScript-disabled access is verified in built server HTML; a browser run with JavaScript disabled remains pending. Initialization failure is a separate browser-tested case.

All physical-device checks remain pending:

- Music: iOS Safari, Android Chrome, WhatsApp/Messenger in-app browsers; first-gesture activation, actual volume/fades, looping, rapid toggles, Replay, background/lock/return, rejected resumption, and failed/slow media. Confirm device volume behavior and accessible control placement. See the full list in [MUSIC.md](MUSIC.md).

- iOS Safari and Android Chrome, plus WhatsApp/Messenger in-app browsers: full-envelope hit target, touch gesture interruption, momentum scrolling, safe areas, and collapsing browser toolbars.
- Deliberate touch movement below/above 10 CSS px during every phase; confirm that animation never fights the gesture. Try rapid taps and a press beginning during extraction and ending after reveal.
- Short portrait/landscape screens: announcement stays readable without excessive shrinking, event details remain reachable, and rotation/background/resume recovers safely.
- OS reduced-motion preference: no confetti or animated scrolling; verify preference changes during playback.
- Keyboard and VoiceOver/TalkBack: focus order/transfer, visible focus, live status, event alt text, and quiet countdown.
- JavaScript disabled, slow/failed image decode, and failed animation-module loading: full card and directions remain usable.
- Back/forward restoration across browsers and Maps app handoff; verify the correct Lakeshore Heights entrance and ninth-floor instruction.

No deployment or physical-device validation was performed for this revision.

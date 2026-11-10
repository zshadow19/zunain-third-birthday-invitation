# Zunain’s third birthday invitation

A mobile-first, three-scene invitation built with Next.js 16.4.6, React, TypeScript, Tailwind CSS, and GSAP. The original 820 × 1919 artwork is preserved unchanged.

## Run locally

Use Node.js 22 LTS or newer and npm:

```sh
npm ci
npm run dev
```

Open the Local URL printed by Next.js. If port 3000 is occupied, Next.js chooses the next available port.

```sh
npm test
npm run typecheck
npm run build
node scripts/check-built-page.mjs
npm start
```

`npm test` checks Dhaka-time conversion, countdown boundaries, transition guards, recovery/replay paths, and safe browser-history restoration. `check-built-page.mjs` requires a completed build and verifies the server-rendered fallback, one original card, social metadata, preview dimensions, and the artwork checksum.

## Experience and configuration

- `app/lib/invitation.ts` contains event details and normalized artwork coordinates. `revealFraction` starts at **0.52**, visually checked to include the entire 3 and party hat while excluding the printed event details. `detailsFraction` starts at **0.57** and positions the printed date near the top after the pan.
- The client controller follows `closed → opening → reveal → expanding → full`. One card element is reused throughout; clipping changes around an undistorted image. The measured envelope-to-card handoff uses uniform transforms.
- Continue expands the wrapper over 0–0.45 seconds and begins a pan at 0.25 seconds, completing around 1.3 seconds. Touch drag, wheel, or scrolling keys immediately cancel the pan. There is no body scroll lock, pinning, or snapping. Completed scenes are remembered on the existing browser-history entry, preserving Next.js router fields and adding no navigation steps. Replay clears that scene marker.
- Reduced motion skips extraction, confetti, and guided scrolling while preserving both deliberate interactions. Replay cancels the current animation run and restores the envelope, initial geometry, scroll, and keyboard focus.
- Server-rendered HTML contains the full card and event extras. JavaScript progressively enables the staged presentation only after image decoding and controller loading succeed. Initialization failure leaves the static introduction, anchors, full card, and directions available.
- The countdown targets **2026-11-21T18:30:00+06:00**, independent of the guest’s timezone. At zero it shows “It’s party time!” The directions link uses the venue name; the ninth-floor instruction remains visible separately.

## Vercel setup

1. Import this repository into a Vercel project and use the detected **Next.js** preset.
2. Use Node.js **22.x**, install with `npm ci`, and build with `npm run build`. Leave the output directory at its framework default.
3. Set `SITE_URL` to the final absolute HTTPS origin, for example `https://your-invitation.vercel.app`, and redeploy when changing it. Do not put a path or trailing slash in this value.
4. If `SITE_URL` is absent, metadata uses `https://${VERCEL_PROJECT_PRODUCTION_URL}` when Vercel supplies that hostname. Local development defaults to `http://localhost:3000`; set `SITE_URL` locally if validating canonical metadata on a different port.
5. After deployment, check the actual canonical and social-image URLs, directions destination, and the physical-device checklist in `docs/QA.md` before sharing.

This delivery is deploy-ready. It does not create or publish a Vercel project.

## Artwork and social assets

The original lives at `public/dinosaur_jungle_birthday_invitation_artwork.png`. Do not replace or edit it for animation. Its SHA-256 is:

```text
59a0a00edadde1d01d401a8d8a58dafd727129d83f66d2e292fc39d12f911ded
```

`public/social-preview.jpg` is a separately composed 1200 × 630 image using a proportional rendering of the original card. It does not stretch or regenerate the invitation. To regenerate the preview and footprint icons, run `npm run assets`; the script uses Sharp bundled with the installed Next.js dependency tree and never writes to the master artwork.

## Visual checkpoints

See `docs/QA.md` and `docs/qa/` for saved checkpoints and verification limits. Development-only fixtures make intermediate states repeatable:

| Local URL suffix | Action and expected state |
| --- | --- |
| `/?checkpoint=extraction` | Tap to Open; freeze the opening timeline at its 0.85-second extraction label. |
| `/?checkpoint=pan` | Open, then Continue; freeze at 0.65 seconds for scroll-intent and replay checks. |
| `/?checkpoint=reduced-motion` | Exercise the reduced-motion branch without changing OS preferences. |
| `/?checkpoint=initialization-failure` | Exercise the full static fallback after controller initialization fails. |

These fixtures are inert in production. Use `/` for normal playback. A fragment link to `#invitation` opens the full card directly.

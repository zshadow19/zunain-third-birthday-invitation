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
npm run lint
npm run build
node scripts/check-built-page.mjs
npm start
```

`npm test` checks countdown boundaries and controller progression, interruption, recovery, replay cleanup, and history restoration using deterministic DOM/GSAP adapters. `check-built-page.mjs` requires a completed build and verifies the full server-rendered fallback, one original card, one envelope target/Replay, social metadata, preview dimensions, and the artwork checksum.

## Experience and configuration

- `app/lib/invitation.ts` contains event details and normalized artwork coordinates. `revealFraction` starts at **0.52**, visually checked to include the entire 3 and party hat while excluding the printed event details. `detailsFraction` starts at **0.57** and positions the printed date near the top after the pan.
- The client controller follows `closed → opening → reveal → expanding → full`. One card element is reused throughout; clipping changes around an undistorted image. The measured envelope-to-card handoff uses uniform transforms.
- The whole envelope and seal form one native button. One guarded GSAP sequence extracts/settles the card by 2.0 seconds, holds the birthday reveal until 3.25 seconds, expands over 3.25–4.05 seconds, and pans over 3.65–5.1 seconds. Card width stays unchanged after settling; short screens use native scrolling.
- Wheel and scrolling keys immediately cancel playback; touch movement interrupts at 10 CSS pixels. Taps can skip only after extraction completes, and decorative taps do nothing. Interruption exposes the full card without a deferred scroll correction. There is no scroll lock, pinning, or snapping. History updates preserve router fields and add no entries; previous reveal/full entries restore the full card.
- Reduced motion opens the full invitation immediately without confetti or guided scrolling. One Replay control appears with the final actions. Replay cancels the current run and restores envelope geometry, scroll, history, and keyboard focus.
- Server-rendered HTML contains the full card and event extras. JavaScript progressively enables the envelope only after image decoding, controller loading, and rendered-layout measurement succeed. Initialization failure leaves the full card and directions directly available.
- The countdown targets **2026-11-21T18:30:00+06:00**, independent of the guest’s timezone. At zero it shows “It’s party time!” The directions link uses the venue name and street address; the ninth-floor instruction remains visible separately.

## Vercel setup

1. Import this repository into a Vercel project and use the detected **Next.js** preset.
2. Use Node.js **22.x**, install with `npm ci`, and build with `npm run build`. Leave the output directory at its framework default.
3. Set `SITE_URL` to the final absolute HTTPS origin, for example `https://your-invitation.vercel.app`, and redeploy when changing it. Do not put a path or trailing slash in this value.
4. If `SITE_URL` is absent, metadata uses `https://${VERCEL_PROJECT_PRODUCTION_URL}` when Vercel supplies that hostname. Local development defaults to `http://localhost:3000`; set `SITE_URL` locally if validating canonical metadata on a different port.
5. After deployment, check the actual canonical and social-image URLs, directions destination, and the physical-device checklist in `docs/QA.md` before sharing.

This delivery is deploy-ready. It does not create or publish a Vercel project.

## Background music

The supplied track is `public/audio/playful-joyful-audio.mp3`. It starts from the first envelope gesture, fades to 23% volume, and keeps its position through Replay. One small music toggle pauses/resumes it; playback failures never block the invitation. Initial load is silent and the MP3 is loaded on demand. See [music source, license, behavior, replacement instructions, and device checklist](docs/MUSIC.md).

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
| `/?checkpoint=flap` | Open the envelope; freeze the fully opened flap at 0.55 seconds. |
| `/?checkpoint=extraction` | Open the envelope; freeze extraction at 0.95 seconds. |
| `/?checkpoint=reveal` | Open; freeze at 2.25 seconds during the birthday hold. |
| `/?checkpoint=expansion-early` | Open; freeze expansion at 3.35 seconds. |
| `/?checkpoint=expansion-mid` | Open; freeze expansion at 3.65 seconds. |
| `/?checkpoint=expansion-late` | Open; freeze expansion/pan at 4.0 seconds. |
| `/?checkpoint=pan` | Open; freeze the guided pan at 4.4 seconds. |
| `/?checkpoint=reduced-motion` | Exercise the reduced-motion branch without changing OS preferences. |
| `/?checkpoint=initialization-failure` | Exercise the full static fallback after controller initialization fails. |

These fixtures are inert in production. Use `/` for normal playback. A fragment link to `#invitation` opens the full card directly.

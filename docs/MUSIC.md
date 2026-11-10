# Invitation music

The invitation uses the user-supplied `public/audio/playful-joyful-audio.mp3` (4,829,100 bytes, approximately 151 seconds). It is served locally; there is no external audio service or runtime dependency.

Supplied-file SHA-256: `a26ec1f25a0b3fa525c02ca0f93c96fa078ef60f82338f7a3e29f53518e98a40`.

## Source and license

- Track: [Playful Cheerful Joyful Music by STAROSTIN](https://pixabay.com/music/happy-childrens-tunes-playful-cheerful-joyful-music-263210/).
- License: [Pixabay Content License summary](https://pixabay.com/service/license-summary/) and [full terms, sections 5–6](https://pixabay.com/service/terms/), checked 11 November 2026.
- The track page identifies this music as available under the Pixabay Content License. The license permits free use and adaptation, including incorporation into creative projects, without required attribution; it prohibits standalone distribution/sale and other listed uses. This invitation combines the music with its existing visual experience. Keep the download/license record when distributing the project; the source page also lists Content ID registration.
- This is the supplied file associated with that source, not a newly downloaded or substituted track. Preserve any download certificate supplied with it.

## Playback behavior

- Initial load is silent, with `preload="none"` and no autoplay. The native audio element is owned once by the experience and controlled through `useInvitationMusic`; it is independent of GSAP and animation state.
- The first envelope activation calls native `play()` synchronously before starting the animation. Loading/decoding and playback rejection never delay the invitation.
- Playback fades toward **23% element volume over 650 ms** after playback actually starts. Pause fades out over **180 ms**, then stops the player. Backgrounding and cleanup pause immediately.
- Music loops using the browser's native loop support. Loop seamlessness depends on the MP3's encoded boundaries; the track has not been trimmed or recompressed.
- The small circular toggle has a 44 × 44 CSS-pixel hit target, visible keyboard focus, safe-area positioning, and accurate Play/Mute labels. A pending request can be cancelled. An explicit Play tap can start music before opening; default page load remains silent.
- Replay and viewport changes preserve the same player and track position. If the guest pauses music, opening/replaying the envelope does not override that preference. Preferences are in memory only; there is no localStorage or cross-session persistence.
- Hidden documents pause. Foreground return attempts one resume only for music that was actually playing, provided the guest has not paused it. A browser-blocked start/resume remains paused until the guest explicitly uses the control; no automatic retry loop runs.
- Reduced motion affects the invitation's visual choreography, not the guest's music choice.
- Unmount/Strict Mode cleanup cancels fades, removes listeners, pauses the player, and aborts/releases its source. Late promise results cannot restart a disposed player.

Mobile browsers may require a new trusted interaction to resume audio and may reserve volume control for the device. The 23% setting is applied where supported; actual iOS/in-app-browser volume behavior needs device verification.

## Replacing the track later

Replace the file at the same path with a supported, licensed MP3, or update `invitationMusic.src`, the built-page asset check, and this document together. Keep the source/license record. Do not change GSAP to replace audio. Adjust the default volume/fade durations in `app/lib/invitation-music.ts` only if needed. Run the checks and production asset smoke test again.

## Verification

Controller tests cover initial silence, synchronous activation, rejection/throwing playback, fade volume, toggle/resume, Replay preference, stale promises/fades, visibility, blocked foreground resumption, missing/decode failures, resource cleanup, and Strict Mode-style remounting.

See [QA notes](QA.md) for completed local browser/build checks. Physical-device checks remain pending:

- iOS Safari, Android Chrome, and WhatsApp/Messenger in-app browsers: first envelope gesture starts audio when permitted; the animation proceeds if audio is blocked or slow.
- Confirm comfortable volume, smooth fade, native looping, and browser/device volume behavior.
- Pause/resume, rapid toggles, Replay while playing/paused, and rotation/scrolling retain one track and do not reset its position.
- Background the app, lock/unlock, and return. Only previously playing, unpaused music may resume; a rejected resume stays paused until explicit Play.
- Check safe areas, screen-reader labels, keyboard activation/focus, and no overlap of the control with printed name, 3, or event details at short/narrow viewports.
- Test a missing/slow/undecodable asset and JavaScript-disabled access. The full invitation must remain usable; no-JavaScript visitors see no inert music button.

No deployment was performed for this change.

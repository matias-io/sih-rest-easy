# Rest Easy

The shared app lives in `web/`. Electron in `desktop/` serves the same files. There is no build step. Use `npm run web` on port 8770 for local development.

`web/js/mascot.js` handles cursor-following pupils on intro and setup. Setup eyelids mirror `eyes.state.closed` in `watchEyes()` without the gameplay rest delay. Keep gaze independent of eyelid transforms. Space provides the existing keyboard blink fallback.

Read `CLAUDE.md` for the overlay, GPU rendering and rehearsal switches.

## Notification assets

- `web/js/audio.js` routes Teams, Slack and Discord events to their own recordings. Generic desktop notifications use real Windows sounds, or the host OS sounds when available.
- `web/vendor/sounds/sources.json` records the source and SHA-256 of each added app or Windows recording. Teams files came from the installed Microsoft package. Slack and Discord files came from their own CDNs. These recordings remain proprietary, not Apache or CC0.
- App sound keys must remain separate from generic OS keys. `probeSystemSounds()` must never overwrite Teams, Slack or Discord sounds.
- A playback returns a stop callback. Dismissal, eviction, rest and End must stop audio. Overlap is capped at eight sounds with one active ringtone.
- Keep the jokes suitable for a public hackathon demo. No dating ads or sexual content. Use meetings, billing, printers, updates and software failures.
- Notification layouts are parody recreations with brand marks, not screenshots of the apps. Never describe them as exact current native UIs.

Verification: syntax-check changed JS, decode the bundled audio in Chromium, exercise feed tiers and dismissals, check End cleanup, and record visual changes with the motion-capture skill. Keep captures in git-ignored `.local/recordings/`.

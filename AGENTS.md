# Rest Easy

The shared app lives in `web/`. Electron in `desktop/` serves the same files. There is no build step. Use `npm run web` on port 8770 for local development.

`web/js/mascot.js` handles cursor-following pupils on intro and setup. Setup eyelids mirror `eyes.state.closed` in `watchEyes()` without the gameplay rest delay. Keep gaze independent of eyelid transforms. Space provides the existing keyboard blink fallback.

Read `CLAUDE.md` for the overlay, GPU rendering and rehearsal switches.

Desktop effects cover the full primary display with `enableLargerThanScreen` and macOS `screen-saver` + 1. `screenInsets()` supplies work-area margins: the HUD and tune panel sit below the menu bar/notch; bottom captions, notifications and facecam clear the Dock/taskbar. Screen capture remains optional and bounded. Only the setup button requests access. Local regression checks: `.local/verify-no-screen.cjs` and `.local/check-capture-fallback.cjs`.

Music gain is scaled by 0.8 after the BAC/rest curve and notification ducking. Start gain is zero to avoid a sober startup burst.

## Notification assets

- High-BAC popup sounds use `notifyPopup(kind, tier)` in `web/js/audio.js`. Tiers 0–1 keep app sounds, tier 2 uses memes half the time, and tier 3 always uses memes. The five-clip shuffle pool includes Vine boom and crying cat. These use the notification voice pool, music ducking and dismissal cleanup. Sources and hashes for the new recordings are in `web/vendor/chaos/sources.json`.
- `web/js/audio.js` routes Teams, Slack and Discord events to their own recordings. Generic desktop notifications use real Windows sounds, or the host OS sounds when available.
- `web/vendor/sounds/sources.json` records the source and SHA-256 of each added app or Windows recording. Teams files came from the installed Microsoft package. Slack and Discord files came from their own CDNs. These recordings remain proprietary, not Apache or CC0.
- App sound keys must remain separate from generic OS keys. `probeSystemSounds()` must never overwrite Teams, Slack or Discord sounds.
- A playback returns a stop callback. Dismissal, eviction, rest and End must stop audio. Overlap is capped at eight sounds with one active ringtone.
- Keep the jokes suitable for a public hackathon demo. No dating ads or sexual content. Use meetings, billing, printers, updates and software failures.
- Notification layouts are parody recreations with brand marks, not screenshots of the apps. Never describe them as exact current native UIs.

Verification: syntax-check changed JS, decode the bundled audio in Chromium, exercise feed tiers and dismissals, check End cleanup, and record visual changes with the motion-capture skill. Keep captures in git-ignored `.local/recordings/`.

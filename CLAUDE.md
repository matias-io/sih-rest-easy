# Rest Easy

One codebase in `web/` (no build step). `npm run web` serves it on 8770; `npm run desktop` wraps the same page in Electron (`desktop/`) as a click-through overlay on the real desktop. Anything added to `web/` works in both; desktop-only behaviour goes behind `window.restEasyDesktop`.

- Intro/setup mascot: `web/js/mascot.js` follows the cursor. In pre-flight, `watchEyes()` mirrors the tracker's closed state directly, including the Space fallback. Pupil movement stays independent of eyelid animation.

- Deploys: production is sih.matiass.ca: `XDG_CONFIG_HOME=~/.wrangler-matiass npx wrangler deploy -c wrangler.matiass.jsonc` (the account that owns the zone; set `CLOUDFLARE_ACCOUNT_ID` to that account if wrangler asks which one). Deploy from a clean, up-to-date `main`. `wrangler login` needs a real terminal window, not a background shell. GitHub Pages deploys on push to main. The old `npx wrangler deploy` workers.dev target lost its sign-in and is stale.
- Testing: `?autorun=60&cycle=20&rise=7` (web, add `&cam=0` for no camera) or `REST_EASY_QUERY="autorun=60&cycle=20" REST_EASY_VISIBLE=1 npm run desktop`. Read the `PERF` lines. `REST_EASY_SMOKE=1` is the hidden self-check.
- Screen effects are one WebGL shader (`web/js/fx.js`). Do not bring back SVG filters: they ran on the CPU and caused the lag.
- On desktop the shader canvas is hidden while sober (level < 0.08) so the real screen shows through with no capture delay.
- Desktop effects cover the full primary display with `enableLargerThanScreen` and macOS `screen-saver` + 1. `screenInsets()` uses work-area margins to keep the HUD below the notch and bottom captions above the Dock/taskbar. Screen capture stays optional: Start checks permission before hiding; capture and first-frame waits time out after three seconds. Only the setup button requests access. See local probes in `AGENTS.md`.
- Music gain is scaled by 0.8, with zero startup gain; sober silence, rest attenuation and notification ducking still apply.
- Desktop distortion ramps with BAC: the shader copy goes from ~25% opacity to 60-75% at BAC 0.40 (no flips/mirrors, world transform fixed so clicks still land). `web/js/haze.js` adds click-through overlays (tunnel vision, eyelids, blobs, beat flashes, torn bars) driven by BAC, music and meme clips (`m.sting` from `chaos.tick`). BAC 0.40 = level 1 is meant to be barely usable.
- `web/js/club.js` owns the fixed six-beam club rig, edge washes, disco ball and silly captions. BAC controls intensity; smoothed music energy/kicks control pulses. Keep its center mask, click-through behavior, reduced-motion handling and `clear()` on End. Animate transforms/opacity only.
- Mac capture is a snapshot taken with the window hidden at Start: ScreenCaptureKit includes protected windows, so live capture would recurse. Windows keeps live capture. The root HTML background must stay transparent in desktop mode, and overlay entry must blur the Mac window. Cmd/Ctrl+Shift+Space toggles rest while click-through is active; Space remains the setup fallback.
- Install dependencies with Node 24 (`.nvmrc`); Electron's installer can exit early under Node 26. `desktop/launch.js` clears inherited `ELECTRON_RUN_AS_NODE` before starting Electron. Launcher regressions: `node --test desktop/launch.test.js`.
- Sound: real Teams, Slack and Discord recordings in `web/vendor/sounds`, with source paths/URLs and hashes in `sources.json`. They remain proprietary. Generic notifications use bundled Windows sounds or `/system-sound/<kind>` locally; AOSP sounds cover rest and UI effects. App sound keys must not be overwritten by the OS probe. Playback is bounded and stops on dismissal, rest and End. See `AGENTS.md`.
- Popup audio uses `notifyPopup(kind, tier)`: normal app sounds at tiers 0–1, memes half the time at tier 2, and a shuffled meme clip at tier 3. Vine boom and crying cat are original downloaded MP3s capped at five seconds, with provenance in `web/vendor/chaos/sources.json`. They share notification limits, ducking and cleanup.
- The NCS track in `web/vendor/music` plays through an analyser in `web/js/music.js`; its `musicState` (energy, kick, mode) drives the shader, DOM transforms and ads.
- Edit with patch scripts written to a file; inline heredocs with JS quotes break in this shell.
- `web/js/ads.js` + `web/css/ads.css` (junk pop-up ads, written by Codex): `createAds(host)` -> `tick(t, level, energy)`, `clear()`. Capped at 6 ads; beat bursts have a 5-second cooldown. Closing an ad dismisses it.
- Surprise cameos alternate Dario and Sam. Dario is first, 10–18 seconds into the run once eyes are open and level exceeds 0.3. Their timers are owned by `createDrunk()` and cleared on End.
- DevTools Chrome throttles rAF in a tab that was navigated in the background; open test runs with a new foreground page.

- Phones and tablets (`web/js/device.js`, tested in `device.test.mjs`) get the intro and a share-link button; `setup()` and `start()` refuse to run there, including `?autorun`. Touch laptops still count as computers because they have a fine pointer.
- Screens scroll when the window is shorter than them (`.screen` has `overflow-y:auto` and auto margins on its first and last child). `node tools/ui-audit.mjs http://127.0.0.1:8770 .local/audit/<name>` screenshots 8 desktop and handheld profiles and flags clipping, sideways scroll, and runs that start on a phone. `npm test` runs the unit tests; CI runs them on every PR.

- Website modes (`mode` in `web/js/main.js`): Start stays locked until the visitor shares a Chrome tab or picks the practice desktop. A shared screen or window is refused and stopped. The desktop app is recommended first and skips the chooser. `node tools/share-audit.mjs http://127.0.0.1:8770 .local/audit/share` checks all of this in a private Chrome (11 checks). The practice desktop's to-do list is `web/js/work.js`.
- `REST_EASY_VISIBLE=1` turns off capture protection, so the overlay records itself: the facecam leaves a square ghost in the drunk background. Judge visuals from a normal run, not that mode.

- Linux desktop app: uses the Mac's snapshot capture (Linux can't hide the overlay from its own capture). Tested under WSL on 2026-11-16: it starts and the bridge loads, but WSLg has no desktop to capture (black frames), so capture on a real X11 or Wayland desktop is unverified. WSL test recipe without sudo: temporary Node 24 tarball in /tmp, `npm ci` on a copy of the repo, `apt-get download libnss3 libnspr4 libasound2t64` and `dpkg-deb -x` them into /tmp, then `LD_LIBRARY_PATH=... REST_EASY_SMOKE=1 electron . --no-sandbox`.

## Git workflow

- Work goes through a branch and a pull request into `main`; nobody pushes to `main` directly. Branch names are `type/topic` (`feat/`, `fix/`, `perf/`, `chore/`, `docs/`).
- Commit subjects are short Conventional Commits (`feat: ...`, `fix: ...`) that say what changed. No "fix cam" or "IDIOT".
- Never commit `node_modules`, `.npm-cache` or other caches, `.env` files or anything over 10 MB. The `hygiene` check fails a PR that does. Run `git status` before committing.
- Delete the branch after its PR merges.
- A clone was 76 MB until 2026-11-16 because an unmerged branch (`copilot-is-an-idiot`) had committed a 60 MB npm cache. That branch was deleted; a bundle of it is in `.local/recovery/` on Matias's laptop. `main` alone clones at about 15 MB, mostly the MediaPipe model, its wasm and the music.

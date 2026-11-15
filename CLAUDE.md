# Rest Easy

One codebase in `web/` (no build step). `npm run web` serves it on 8770; `npm run desktop` wraps the same page in Electron (`desktop/`) as a click-through overlay on the real desktop. Anything added to `web/` works in both; desktop-only behaviour goes behind `window.restEasyDesktop`.

- Intro/setup mascot: `web/js/mascot.js` follows the cursor. In pre-flight, `watchEyes()` mirrors the tracker's closed state directly, including the Space fallback. Pupil movement stays independent of eyelid animation.

- Deploys: `npx wrangler deploy` (workers.dev) and `XDG_CONFIG_HOME=~/.wrangler-matiass npx wrangler deploy -c wrangler.matiass.jsonc` (sih.matiass.ca, the account that owns the zone). `wrangler login` needs a real terminal window, not a background shell. GitHub Pages deploys on push to main.
- Testing: `?autorun=60&cycle=20&rise=7` (web, add `&cam=0` for no camera) or `REST_EASY_QUERY="autorun=60&cycle=20" REST_EASY_VISIBLE=1 npm run desktop`. Read the `PERF` lines. `REST_EASY_SMOKE=1` is the hidden self-check.
- Screen effects are one WebGL shader (`web/js/fx.js`). Do not bring back SVG filters: they ran on the CPU and caused the lag.
- On desktop the shader canvas is hidden while sober (level < 0.08) so the real screen shows through with no capture delay.
- Desktop distortion ramps with BAC: the shader copy goes from ~25% opacity to 60-75% at BAC 0.40 (no flips/mirrors, world transform fixed so clicks still land). `web/js/haze.js` adds click-through overlays (blobs, beat flashes, torn bars; no darkening layers) driven by BAC, music and meme clips (`m.sting` from `chaos.tick`). BAC 0.40 = level 1 is meant to be barely usable.
- `web/js/club.js` owns the fixed six-beam club rig, edge washes, disco ball and silly captions. BAC controls intensity; smoothed music energy/kicks control pulses. Keep its center mask, click-through behavior, reduced-motion handling and `clear()` on End. Animate transforms/opacity only.
- Mac capture is a snapshot taken with the window hidden at Start: ScreenCaptureKit includes protected windows, so live capture would recurse. Windows keeps live capture. The root HTML background must stay transparent in desktop mode, and overlay entry must blur the Mac window. Cmd/Ctrl+Shift+Space toggles rest while click-through is active; Space remains the setup fallback.
- Install dependencies with Node 24 (`.nvmrc`); Electron's installer can exit early under Node 26. `desktop/launch.js` clears inherited `ELECTRON_RUN_AS_NODE` before starting Electron. Launcher regressions: `node --test desktop/launch.test.js`.
- Sound: real Teams, Slack and Discord recordings in `web/vendor/sounds`, with source paths/URLs and hashes in `sources.json`. They remain proprietary. Generic notifications use bundled Windows sounds or `/system-sound/<kind>` locally; AOSP sounds cover rest and UI effects. App sound keys must not be overwritten by the OS probe. Playback is bounded and stops on dismissal, rest and End. See `AGENTS.md`.
- The NCS track in `web/vendor/music` plays through an analyser in `web/js/music.js`; its `musicState` (energy, kick, mode) drives the shader, DOM transforms and ads.
- Edit with patch scripts written to a file; inline heredocs with JS quotes break in this shell.
- `web/js/ads.js` + `web/css/ads.css` (junk pop-up ads, written by Codex): `createAds(host)` -> `tick(t, level, energy)`, `clear()`. Capped at 6 ads; beat bursts have a 5-second cooldown. Closing an ad dismisses it.
- Surprise cameos alternate Dario and Sam. Dario is first, 10–18 seconds into the run once eyes are open and level exceeds 0.3. Their timers are owned by `createDrunk()` and cleared on End.
- DevTools Chrome throttles rAF in a tab that was navigated in the background; open test runs with a new foreground page.

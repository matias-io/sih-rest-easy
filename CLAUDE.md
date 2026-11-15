# Rest Easy

One codebase in `web/` (no build step). `npm run web` serves it on 8770; `npm run desktop` wraps the same page in Electron (`desktop/`) as a click-through overlay on the real desktop. Anything added to `web/` works in both; desktop-only behaviour goes behind `window.restEasyDesktop`.

- Deploys: `npx wrangler deploy` (workers.dev) and `XDG_CONFIG_HOME=~/.wrangler-matiass npx wrangler deploy -c wrangler.matiass.jsonc` (sih.matiass.ca, the account that owns the zone). `wrangler login` needs a real terminal window, not a background shell. GitHub Pages deploys on push to main.
- Testing: `?autorun=60&cycle=20&rise=7` (web, add `&cam=0` for no camera) or `REST_EASY_QUERY="autorun=60&cycle=20" REST_EASY_VISIBLE=1 npm run desktop`. Read the `PERF` lines. `REST_EASY_SMOKE=1` is the hidden self-check.
- Screen effects are one WebGL shader (`web/js/fx.js`). Do not bring back SVG filters: they ran on the CPU and caused the lag.
- On desktop the shader canvas is hidden while sober (level < 0.08) so the real screen shows through with no capture delay.
- Sound: no synthesis and no proprietary app sounds in the repo. AOSP sounds in `web/vendor/sounds`, OS sounds via `/system-sound/<kind>` locally, music streamed from the NCS YouTube upload (`web/js/music.js`).
- Edit with patch scripts written to a file; inline heredocs with JS quotes break in this shell.

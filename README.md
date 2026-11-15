# Rest Easy

Your screen gets drunk the longer you keep your eyes open. The only fix is to close them.

Built at the Stupid Ideas Hackathon, Ottawa, 15 Nov 2026, by Matias Suxo.

**Live:** https://sih.matiass.ca

## How it works

1. A pre-flight check confirms your browser, display, camera and eye tracker. Blink twice to confirm it sees you.
2. Optionally share your screen. Share the whole screen and your real desktop becomes the backdrop; share a window or tab and it plays live.
3. Press Start. The page goes fullscreen. While your eyes are open, a "screen BAC" climbs: the picture sways, doubles, warps, and work notifications get stranger until it is full 2012 montage parody.
4. Close your eyes for a few seconds. A bell tells you the screen is sober again.

Eye tracking is MediaPipe Face Landmarker (478-point face mesh, blink blendshapes) running on your GPU in the browser. The camera never leaves your device. No synthesized sound: it plays official Android system sounds (Google AOSP, Apache 2.0, in `web/vendor/sounds`), and when run locally, your operating system's own notification sounds. Screen effects run in a WebGL shader. No build step.

## Two versions, one app

Everything lives in `web/`. The desktop version is a thin Electron shell (`desktop/`) that loads the same page.

| | Web (Chrome) | Desktop (Electron) |
|---|---|---|
| Run | `npm run web` | `npm run desktop` |
| Backdrop | a picture of your screen, a live window or tab, or the built-in desktop | Windows: live desktop; Mac: desktop snapshot taken at Start |
| Your real apps stay usable | no | yes: clicks and typing pass through |
| Stop | End button or Esc | End button, Ctrl+Alt+X or F9 (Ctrl+Shift+Q quits) |

A browser will not let a page draw over your desktop or pass clicks through, which is why the desktop version exists. Windows excludes the overlay from screen capture. Modern macOS includes protected windows in capture, so the Mac app briefly hides itself and takes a snapshot at Start to prevent recursive feedback. While sober, the overlay is transparent and the real desktop shows through. Press Cmd+Shift+Space on Mac (Ctrl+Shift+Space on Windows) to toggle rest while using other apps; Space still works during setup.

## Run

Use Node 24 LTS (`nvm use` reads `.nvmrc`). Node 26 can silently leave Electron's download only partly extracted.

```
npm install
npm run web       # http://127.0.0.1:8770
npm run desktop   # the overlay on your real desktop
npm run deploy    # Cloudflare (sih.matiass.ca)
```

With pnpm, run `pnpm install`; Electron's required installer is enabled in `pnpm-workspace.yaml`. For an existing incomplete installation, use Node 24 and run `pnpm rebuild electron`. The desktop launcher also clears inherited `ELECTRON_RUN_AS_NODE` from IDE terminals.

Speed is set on the setup screen (7 to 35 seconds from sober to gone) or with `?rise=20`. Rehearsal switches (web): `?level=0.8` starts drunk, `?cam=0` skips the camera (hold Space to close your eyes), `]` adds drunkenness. `REST_EASY_VISIBLE=1 npm run desktop` lets screenshots see the overlay (it will also see itself).

Brand icons in `web/vendor/icons` are from simple-icons (CC0); the brands belong to their owners and are used here as parody.

Notification sounds use the actual Teams ringtone and message recording from Microsoft's installed Teams package, Slack's Knock Brush from Slack's CDN, and Discord's message, ringtone, join and leave recordings from Discord's CDN. PagerDuty alerts use the sound from PagerDuty's Chrome notification extension (Apache 2.0, license bundled). Windows mail, calendar and system recordings cover generic desktop alerts. Exact sources and SHA-256 hashes are in `web/vendor/sounds/sources.json`; the full event mapping is in `web/vendor/sounds/README.md`. The Teams, Slack, Discord and Windows recordings remain the property of their owners; they are not covered by the Android, PagerDuty or icon licenses.

The remaining Android UI sounds in `web/vendor/sounds` are from the Android Open Source Project, Apache License 2.0. Notification banners are parody recreations with brand marks. Dating ads and relationship jokes have been removed.

Third-party material:
- Music: DEAF KEV - Invincible [NCS Release], provided by NoCopyrightSounds (`web/vendor/music`). The screen follows it through an audio analyser: calm in the quiet intro, chaos at the drop.
- Photo: Sam Altman at TechCrunch Disrupt SF 2019, by TechCrunch, CC BY 2.0, via Wikimedia Commons (`web/vendor/img/sam.jpg`). Parody use.
- Photo: Dario Amodei at TechCrunch Disrupt 2023, Kimberly White / Getty Images for TechCrunch, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), [via Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Dario_Amodei_at_TechCrunch_Disrupt_2023_02_%28close_up_cropped%29.jpg). Existing close-up crop by Nagae Iku, displayed with CSS cropping (`web/vendor/img/dario.jpg`). Parody use; provenance in `web/vendor/img/dario.source.json`.
- Unused legacy asset: "Sound of American Train Horn Nathan Airchime K5LA" by WeenyBeany, CC BY 4.0, via Wikimedia Commons. Horn playback is disabled.

Timed test run: add `?autorun=60&cycle=20` on the web, or `REST_EASY_QUERY="autorun=60&cycle=20" npm run desktop`. It goes through setup, runs for 60 s closing the eyes every 20 s, and prints a `PERF` line every 5 s (fps, worst frame, tracking time, memory).

Performance: eye inference runs in a worker with one frame in flight (adaptive 24 fps High / 15 fps Light), with a throttled main-thread fallback. Camera capture is capped at 640×480 or 320×240; screen capture at 1920×1080/30 fps. The shader uploads only newly decoded frames and reduces resolution as distortion increases. The built-in desktop uses lighter color effects without fullscreen CSS blur; captured screens retain shader blur. End pauses tracking and clears transient timers/audio. Local vendor assets are cached and streamed with byte-range support. `PERF` reports actual worst-frame duration, including stalls longer than 100 ms.

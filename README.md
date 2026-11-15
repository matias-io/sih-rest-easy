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
| Backdrop | a picture of your screen, a live window or tab, or the built-in desktop | your real desktop, live |
| Your real apps stay usable | no | yes: clicks and typing pass through |
| Stop | End button or Esc | End button, Ctrl+Alt+X or F9 (Ctrl+Shift+Q quits) |

A browser will not let a page draw over your desktop or pass clicks through, which is why the desktop version exists. Its window is excluded from screen capture, so it can show the live screen back, distorted, without showing itself.

## Run

```
npm install
npm run web       # http://127.0.0.1:8770
npm run desktop   # the overlay on your real desktop
npm run deploy    # Cloudflare (sih.matiass.ca)
```

Speed is set on the setup screen (7 to 35 seconds from sober to gone) or with `?rise=20`. Rehearsal switches (web): `?level=0.8` starts drunk, `?cam=0` skips the camera (hold Space to close your eyes), `]` adds drunkenness. `REST_EASY_VISIBLE=1 npm run desktop` lets screenshots see the overlay (it will also see itself).

Brand icons in `web/vendor/icons` are from simple-icons (CC0); the brands belong to their owners and are used here as parody.

Sounds in `web/vendor/sounds` are Android system sounds from the Android Open Source Project (Google), Apache License 2.0.

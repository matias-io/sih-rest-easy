# Rest Easy

Your screen gets drunk the longer you keep your eyes open. The only fix is to close them.

Built at the Stupid Ideas Hackathon, Ottawa, 15 Nov 2026, by Matias Suxo.

**Live:** https://matias-io.github.io/sih-rest-easy/

## How it works

1. A pre-flight check confirms your browser, display, camera and eye tracker. Blink twice to confirm it sees you.
2. Optionally share your screen. Share the whole screen and your real desktop becomes the backdrop; share a window or tab and it plays live.
3. Press Start. The page goes fullscreen. While your eyes are open, a "screen BAC" climbs: the picture sways, doubles, warps, and work notifications get stranger until it is full 2012 montage parody.
4. Close your eyes for a few seconds. A bell tells you the screen is sober again.

Eye tracking is MediaPipe Face Landmarker (478-point face mesh, blink blendshapes) running on your GPU in the browser. The camera never leaves your device. All sound is synthesized. No build step, no server.

## What a web page cannot do

A browser will not let a page draw over your real desktop or pass clicks through to other apps. So the "real desktop" mode is a captured picture of your screen (or a live view of one window or tab), not a true overlay. The built-in desktop is the fully interactive mode.

## Run locally

```
python -m http.server 8770
```

Open http://localhost:8770 in Chrome. Rehearsal switches: `?level=0.8` starts drunk, `?cam=0` skips the camera (hold Space to close your eyes), `]` adds drunkenness, Esc ends.

# Notification sounds

- [scope] Starting revision `94f37d9`, clean checkout. User requested official notification sounds and removal of the train sound. Done bar: verified sources, correct sound routing, no horn playback.
- [evidence] All 11 existing manifest recordings matched their official CDN or installed Microsoft source bytes. Discord requests needed a browser User-Agent.
- [decision] Retained those recordings; added PagerDuty's Chrome extension sound from pinned commit `36abffc06fccff4f4c0798c5e5005b2e9fa0deb8`, with upstream Apache license. Other apps keep documented OS fallbacks rather than unverified vendor sounds.
- [change] Removed horn registration, export and both chaos-effect triggers. Visual effects remain.
- [verification] All 12 manifest recordings passed SHA-256 checks and full FFmpeg decode. Changed JS syntax and `git diff --check` passed. Mock Audio checks passed app routing after OS probing, generic fallback, stop callbacks, single ringtone, eight-sound cap, rest/End cleanup and no horn triggers.
- [limit] No browser listening session or deployment performed. Changes are local and uncommitted.
- [integration] Pulled latest main `8db1e9c`; reapplied the sound changes while retaining new photo notifications and timer/disposal cleanup. User authorized direct push to main.
- [resumption] Pulled main through `d2b4588`; all original notification recordings and routes were already retained.
- [change] User requested notification audio over continuously playing music. Set notification volume to 0.75 and music target multiplier to 0.35 during active alerts. Idempotent stop accounting restores music after the final alert; music is never paused or restarted by notifications.
- [verification] Headless Chrome, actual local app and real Audio elements: all 12 notification routes advanced playback with nonzero Web Audio samples while the music remained playing and advanced. Measured music gain 0.99997 before, 0.35003 during, 0.99997 after an alert. Repeated stop callbacks left the active counter at zero. JS syntax and diff checks passed. Test harness retained in ignored `.local/verify-audio.cjs`; physical speaker output was not listened to.

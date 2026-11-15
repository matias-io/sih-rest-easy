# BAC-driven chaos effects

35 recordings supplied from `Deliverables/Rockstar/sfx`, including the MLG air horn. `sources.json` records original and bundled hashes. No open license is claimed for these supplied recordings.

Clips are normalized to -20 LUFS with a -3 dB true-peak target, encoded as mono 96 kbps MP3 and trimmed to at most five seconds. Long music clips are excluded so they do not replace the main soundtrack. The old train-horn recording remains unused; the newly requested horn is `mlg-air-horn.mp3`.

`web/js/chaos.js` runs from the gameplay frame clock. Below normalized level 0.18 it is silent. Above that, a quadratic rate curve rises from about 0.25 to four clip starts per second. A shuffle bag plays every effect before repeating, without an immediate repeat across bags. At most five chaos voices play at once, independently of the notification voice pool. Notifications lower the chaos mix so their sounds remain audible. Music continues throughout.

Rest, sober level and End clear active chaos voices. There are no background spawning timers and no queued burst after a pause.

Checks: `node --test web/js/chaos.test.mjs`; the ignored `.local/verify-chaos.cjs` checks Chromium decoding and live playback, rest/wake and End using the actual page.

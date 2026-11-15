import test from 'node:test';
import assert from 'node:assert/strict';
import { createChaos } from './chaos.js';
import { CHAOS_FILES } from './chaos-files.js';
import { notificationAudio } from './audio.js';

test('BAC increases clip rate; playback is bounded, varied, and stops for rest', () => {
  const played = [];
  class FakeAudio {
    constructor(src) { this.src = src; this.paused = true; }
    cloneNode() { return new FakeAudio(this.src); }
    play() { this.paused = false; played.push(this); return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const originalAudio = globalThis.Audio, originalRandom = Math.random;
  globalThis.Audio = FakeAudio;
  Math.random = () => 0.5;
  try {
    function simulate(level) {
      played.length = 0;
      const chaos = createChaos();
      for (let t = 0; t < 30; t += 1 / 60) {
        chaos.tick(t, level, false);
        assert.ok(played.filter(a => !a.paused).length <= 5);
      }
      const count = played.length;
      chaos.clear();
      assert.ok(played.every(a => a.paused));
      return count;
    }
    const sober = simulate(0), low = simulate(0.25), middle = simulate(0.6), high = simulate(1);
    assert.equal(sober, 0);
    assert.ok(low < middle && middle < high, JSON.stringify({ low, middle, high }));
    assert.equal(new Set(played.slice(0, CHAOS_FILES.length).map(a => a.src)).size, CHAOS_FILES.length);
    assert.ok(played.some(a => a.src.endsWith('mlg-air-horn.mp3')));

    const chaos = createChaos();
    chaos.tick(0, 1, false); chaos.tick(1, 1, false);
    const current = played.at(-1), fullVolume = current.volume;
    notificationAudio.active = 1;
    chaos.tick(1.1, 1, false);
    assert.ok(current.volume < fullVolume);
    chaos.tick(1.2, 1, true);
    assert.ok(played.every(a => a.paused));
    const count = played.length;
    chaos.tick(20, 1, false); // No burst of queued sounds after resting.
    assert.equal(played.length, count);
    chaos.tick(21, 1, false);
    assert.equal(played.length, count + 1);
    played.at(-1).onerror();
    chaos.tick(22, 1, false); chaos.clear(); chaos.clear();
    assert.ok(played.every(a => a.paused));
    console.log({ low, middle, high, distinctClips: CHAOS_FILES.length });
  } finally {
    globalThis.Audio = originalAudio;
    Math.random = originalRandom;
    notificationAudio.active = 0;
  }
});

// node --test web/js/device.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { isPhoneOrTablet } from './device.js';

const desktopMq = (q) => q === '(any-pointer: fine)';
const touchOnlyMq = (q) => q === '(pointer: coarse)';
const cases = [
  ['iPhone Safari', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) Mobile/15E148 Safari/604.1', maxTouchPoints: 5 }, touchOnlyMq, true],
  ['Android Chrome', { userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/140 Mobile Safari/537.36', userAgentData: { mobile: true } }, touchOnlyMq, true],
  ['iPadOS asking for the desktop site', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.5 Safari/605.1.15', maxTouchPoints: 5 }, touchOnlyMq, true],
  ['Mac Chrome', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/140 Safari/537.36', maxTouchPoints: 0, userAgentData: { mobile: false } }, desktopMq, false],
  ['Windows touch laptop', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140 Safari/537.36', maxTouchPoints: 10, userAgentData: { mobile: false } }, (q) => q === '(any-pointer: fine)' || q === '(pointer: coarse)', false],
  ['Windows touch laptop that reports no fine pointer', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36', maxTouchPoints: 10, userAgentData: { mobile: false } }, (q) => q === '(pointer: coarse)' || q === '(any-pointer: coarse)', false],
  ['Electron desktop app', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/142 Electron/39.0.0 Safari/537.36', maxTouchPoints: 0 }, desktopMq, false],
];
for (const [name, nav, mq, want] of cases) test(name, () => assert.equal(isPhoneOrTablet(nav, mq), want));

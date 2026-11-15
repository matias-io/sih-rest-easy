const DESIGNS = [
  ['ram', 'CERTIFIED HARDWARE UPGRADE', '<div class="ad-product">💾</div><h2>DOWNLOAD MORE RAM</h2><p>128 GB. Delivered as a PDF.</p><button class="ad-cta" type="button">INSTALL MEMORY.PDF</button>'],
  ['meeting', 'YOUR FREE TRIAL HAS ENDED', '<div class="ad-product">📅</div><h2>Meeting Premium</h2><p>Upgrade to leave this meeting.</p><button class="ad-cta" type="button">CONTINUE FOR 40 MINUTES</button>'],
  ['cookie', 'WE VALUE YOUR PRIVACY', '<div class="ad-product">🍪</div><h2>Accept 8,412 cookies</h2><p>One for each tab you forgot about.</p><button class="ad-cta" type="button">ACCEPT ALL MEETINGS</button>'],
  ['update', 'UPDATE AVAILABLE', '<div class="ad-product">🔄</div><h2>Installing update 1 of 1</h2><p>Now installing update 2 of 1.</p><button class="ad-cta" type="button">RESTART MY RESTART</button>'],
  ['sale', '🔥 FLASH SALE 🔥', '<div class="ad-discount">−97%</div><div class="ad-product">🧦 🩴 🔌</div><h2>Premium technical debt</h2><p>Buy one bug. Get the entire backlog.</p><button class="ad-cta" type="button">ADD TO REGRET</button>'],
  ['wheel', '🎉 YOUR FREE SPIN 🎉', '<div class="ad-wheel">🎯</div><h2>Spin to win a weekend!</h2><p>Every slice says “on call”.</p><button class="ad-cta" type="button">CLAIM MY PTO*</button><small>*Paid in exposure.</small>'],
  ['shipping', '📦 FREE SHIPPING 📦', '<div class="ad-product">🚚💨</div><h2>SHIP IT NOW</h2><p>Tests are just delivery delays.</p><div class="ad-badge">ZERO CHECKS. ZERO FEES.</div><small>Returns accepted after the demo.</small>'],
  ['local', '👀 HIGH DEMAND IN YOUR AREA', '<div class="ad-product">🛒 👁️ 🛒</div><h2>3 people in Ottawa are looking at this</h2><p>It is your exposed development server.</p><button class="ad-cta" type="button">ONLY 1 LOCALHOST LEFT</button>'],
  ['winner', '🏆 CONGRATULATIONS!!!', '<div class="ad-product">🎊 💻 🎊</div><h2>You are the 1,000,000th visitor!</h2><p>Your prize is a free migration.</p><button class="ad-cta" type="button">CLAIM 40,000 ROWS</button><small>No rollback included.</small>'],
  ['download', '⬇ DOWNLOAD READY ⬇', '<h2>Which button is real?</h2><button class="ad-cta" type="button">DOWNLOAD</button><button class="ad-fake" type="button">DOWNLOAD (FASTER)</button><button class="ad-fake" type="button">ACTUAL DOWNLOAD</button><small>All three download more buttons.</small>'],
  ['doctor', '🚨 DOCTORS HATE THIS 🚨', '<div class="ad-product">👁️ 🩹 👁️</div><h2>This ONE eyelid trick!</h2><p>Local developer closes eyes. Stops seeing bugs.</p><button class="ad-cta" type="button">BLINK TO FIND OUT</button>'],
  ['virus', '⚠ SYSTEM PANIC CENTER', '<h2>Scanning your vibes…</h2><div class="ad-scan"><span></span></div><p>847 threats found in “final_FINAL_v2”.</p><div class="ad-terminal">THREAT: uncommitted feelings<br>STATUS: emotionally executable</div><button class="ad-cta" type="button">QUARANTINE MY SPRINT</button><small>Fake scan. Real deadlines.</small>'],
  ['coupon', '✂ EXCLUSIVE COUPON ✂', '<div class="ad-discount">100% OFF</div><h2>Your next good decision</h2><div class="ad-code">USE CODE: OOPS</div><p>Minimum purchase: your sleep schedule.</p><button class="ad-cta" type="button">APPLY BAD JUDGMENT</button>'],
  ['storage', '☁ YOUR CLOUD IS FULL', '<div class="ad-product">🪣 💾 🪣</div><h2>Download more bucket</h2><p>Store infinite screenshots of the same error.</p><button class="ad-cta" type="button">UPGRADE TO WET STORAGE</button><small>Now with artisanal data leaks.</small>'],
  ['urgent', '⏰ LAST CHANCE. AGAIN.', '<div class="ad-badge">ONLY 2 BRAIN CELLS LEFT</div><h2>Become a senior developer in 4 minutes</h2><p>Step 1: rename yourself “Senior”.</p><button class="ad-cta" type="button">SKIP TO BURNOUT</button>']
];

const MAX_ADS = 6;
const BEAT_COOLDOWN = 5;

export function createAds(host) {
  host.style.pointerEvents = 'none';
  const ads = [];
  let lastDesign = -1;
  let lastTime = null;
  let lastEnergy = 0;
  let currentLevel = 0;
  let now = 0;
  let spawnCredit = 0;
  let nextBeatAd = 0;
  let lastTextUpdate = -Infinity;
  let active = false;
  let sequence = 0;

  function remove(ad) {
    ad.element.remove();
    const index = ads.indexOf(ad);
    if (index !== -1) ads.splice(index, 1);
  }

  function spawn() {
    // Choose uniformly from all designs except the previous one.
    let designIndex = Math.floor(Math.random() * (DESIGNS.length - 1));
    if (designIndex >= lastDesign) designIndex += 1;
    if (lastDesign === -1) designIndex = Math.floor(Math.random() * DESIGNS.length);
    lastDesign = designIndex;
    const [variant, title, content] = DESIGNS[designIndex];
    // Evict before appending so the DOM never temporarily exceeds the cap.
    while (ads.length >= MAX_ADS) remove(ads[0]);
    const element = document.createElement('section');
    element.className = `ad-popup ad-${variant}`;
    element.setAttribute('aria-label', `Joke advertisement: ${title}`);
    element.style.left = `${-6 + Math.random() * 94}%`;
    element.style.top = `${-5 + Math.random() * 91}%`;
    element.style.width = `clamp(165px, ${19 + Math.random() * 17}vw, 390px)`;
    element.style.setProperty('--ad-rotation', `${-9 + Math.random() * 18}deg`);
    element.style.setProperty('--ad-delay', `${-Math.random() * 4}s`);
    element.style.zIndex = String(++sequence);
    const motion = Math.random();
    const motionClass = motion < 0.28 ? ' ad-drift' : motion < 0.49 ? ' ad-shake' : '';
    element.innerHTML = `<div class="ad-card${motionClass}"><div class="ad-title">${title}</div><button class="ad-close" type="button" aria-label="Close ad">x</button><div class="ad-body">${content}<div class="ad-timer">OFFER EXPIRES IN <span class="ad-countdown"></span></div></div></div>`;
    const ad = {
      element,
      expires: now + 6 + Math.random() * 4,
      offerEnd: now + 12 + Math.random() * 87,
      fadeEnd: null,
      countdown: element.querySelector('.ad-countdown'),
      countdownText: ''
    };
    ad.countdown.textContent = ad.countdownText = formatCountdown(ad.offerEnd - now);
    element.querySelector('.ad-close').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!ads.includes(ad)) return;
      remove(ad);
    });
    ads.push(ad);
    host.appendChild(element);
  }

  function formatCountdown(seconds) {
    const remaining = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  }

  function tick(t, level, energy) {
    if (!Number.isFinite(t)) return;
    now = t;
    currentLevel = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
    const loudness = Number.isFinite(energy) ? Math.min(1, Math.max(0, energy)) : 0;
    const dt = lastTime === null ? 0 : Math.min(0.25, Math.max(0, t - lastTime));
    if (lastTime !== null && t < lastTime) {
      clear();
      now = t;
      currentLevel = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
    }
    lastTime = t;
    if (currentLevel < 0.15) {
      for (const ad of ads) {
        if (ad.fadeEnd === null) {
          ad.fadeEnd = now + 0.18;
          ad.element.classList.add('ad-leaving');
        }
      }
    }
    for (let index = ads.length - 1; index >= 0; index -= 1) {
      const ad = ads[index];
      if ((ad.fadeEnd !== null && now >= ad.fadeEnd) || now >= ad.expires) remove(ad);
    }
    if (currentLevel >= 0.3) {
      if (!active) {
        spawn();
        nextBeatAd = now + BEAT_COOLDOWN;
      }
      const intensity = (currentLevel - 0.3) / 0.7;
      // Keep the escalation, but leave room for the feed and surprise cameos.
      const rate = 0.18 + 0.82 * intensity ** 3 * (0.65 + loudness * 0.35);
      spawnCredit += dt * rate;
      while (spawnCredit >= 1) {
        spawn();
        spawnCredit -= 1;
      }
      if (loudness > 0.75 && lastEnergy <= 0.75 && now >= nextBeatAd) {
        spawn();
        nextBeatAd = now + BEAT_COOLDOWN;
      }
      active = true;
    } else {
      spawnCredit = 0;
      active = false;
    }
    lastEnergy = loudness;
    if (now - lastTextUpdate >= 0.25) {
      for (const ad of ads) {
        const text = formatCountdown(ad.offerEnd - now);
        if (text !== ad.countdownText) ad.countdown.textContent = ad.countdownText = text;
      }
      lastTextUpdate = now;
    }
  }

  function clear() {
    for (const ad of ads) ad.element.remove();
    ads.length = 0;
    lastTime = null;
    lastEnergy = 0;
    currentLevel = 0;
    spawnCredit = 0;
    nextBeatAd = 0;
    lastTextUpdate = -Infinity;
    lastDesign = -1;
    active = false;
    sequence = 0;
    // No scheduled work: all countdowns, expiry and fades are driven by tick().
  }

  return { tick, clear };
}

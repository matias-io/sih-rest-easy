// The notification feed, styled like Windows 11 toasts from the apps a developer actually has open.
// Four tiers, picked by how drunk the screen is: 0 a normal workday, 1 this week's news leaks in,
// 2 unhinged, 3 MLG.
import { notify } from './audio.js';

// Real brand marks (simple-icons, CC0) on each brand's own colour, the way Windows shows them.
const ICONS = new URL('../vendor/icons/', import.meta.url).href;
const icon = (bg, file) => `<span class="ti" style="background:${bg}"><img src="${ICONS}${file}.svg" alt=""></span>`;
const text = (bg, glyph, fg = '#fff') => `<span class="ti" style="background:${bg};color:${fg};font-size:9px">${glyph}</span>`;
const SLACK = icon('#4A154B', 'slack');
const PICTURES = new URL('../vendor/img/feed/', import.meta.url).href;
// Bundled cameos, with source credits in vendor/img/feed/sources.json.
const PHOTOS = [
  { file: 'jensen.jpg', title: 'Jensen Huang', alt: 'Jensen Huang wearing a leather jacket at a conference', caption: 'Your GPU has joined the meeting.' },
  { file: 'lori-and-jensen.jpg', title: 'Lori & Jensen Huang', alt: 'Lori Huang seated beside Jensen Huang', caption: 'This meeting could have been a photo.' },
  { file: 'fictional-spy.svg', title: 'Agent 404 · fictional spy', alt: 'Cartoon detective wearing a hat and holding a magnifying glass', caption: 'Undercover in the printer queue.', illustration: true }
];
// name, icon, chat (shows the sender's avatar and, for Teams, the quick-reply box)
const APPS = {
  discord: ['Discord', icon('#5865F2', 'discord'), 'discord'], slack: ['Slack', SLACK, 'chat'], teams: ['Microsoft Teams', icon('#5059C9', 'microsoftteams'), 'teams'], outlook: ['Outlook', icon('#0078D4', 'microsoftoutlook'), 'chat'],
  github: ['GitHub', icon('#181717', 'github')], jira: ['Jira', icon('#0052CC', 'jira')], pager: ['PagerDuty', icon('#06AC38', 'pagerduty')],
  vercel: ['Vercel', icon('#000', 'vercel')], aws: ['AWS Billing', icon('#232F3E', 'amazonaws')], claude: ['Claude', icon('#D97757', 'anthropic')],
  cursor: ['Cursor', text('#111', '◩')], cf: ['Cloudflare', icon('#F38020', 'cloudflare')], npm: ['npm', icon('#CB3837', 'npm')],
  linkedin: ['LinkedIn', icon('#0A66C2', 'linkedin')], zoom: ['Zoom', icon('#0B5CFF', 'zoom')], docker: ['Docker Desktop', icon('#2496ED', 'docker')],
  win: ['Windows Update', icon('#0078D4', 'windows11')], cal: ['Google Calendar', icon('#4285F4', 'googlecalendar')], chatgpt: ['ChatGPT', icon('#0d0d0d', 'openai'), 'chat'],
  nvidia: ['NVIDIA App', icon('#76B900', 'nvidia')], so: ['Stack Overflow', icon('#F58025', 'stackoverflow')], mlg: ['xX_N0T1FY_Xx', text('#0d0', '404', '#000')],
  photos: ['Random photo drop', text('#426257', '▧')]
};
const AVATAR = ['#c239b3', '#0f6cbd', '#107c10', '#d83b01', '#8764b8', '#038387', '#ca5010'];
const avatar = (who) => {
  const name = who.replace(/\s*\(.*$/, '').replace(/ is calling.*$/, ''), init = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `<span class="av" style="background:${AVATAR[h % AVATAR.length]}">${init}</span>`;
};

// [app, title, body, buttons?]
const FEED = [
  [ // 0: a normal workday
    ['slack', 'Priya (#general)', 'standup in 5, cameras on pls'],
    ['teams', 'Dave is calling you', 'Incoming video call', ['Accept', 'Decline']],
    ['teams', 'Dave (Manager)', 'quick sync? 2 min'],
    ['discord', 'build-enjoyer (#general)', 'can you hop in voice for literally one second'],
    ['discord', 'Hackathon voice is calling you', 'Incoming voice call', ['Accept', 'Decline']],
    ['github', 'dependabot[bot]', 'opened 47 pull requests in your-org/monolith'],
    ['outlook', 'IT Helpdesk', 'Your password expires in 3 days'],
    ['jira', 'SIH-1763', 'Dave moved "Quick fix" from In Progress to In Progress'],
    ['slack', 'Marcus (#eng)', 'who pushed to main on a friday'],
    ['cal', 'Mandatory Fun', 'Starts in 5 minutes · Room B', ['Join', 'Snooze']],
  ],
  [ // 1: this week leaks in
    ['discord', '@everyone (#announcements)', '@everyone please stop using @everyone'],
    ['discord', 'Dave joined General', 'Dave joined to ask if you saw his Teams message.', null, 'discordJoin'],
    ['teams', 'Daily standup is calling you', 'Incoming video call', ['Accept', 'Decline']],
    ['pager', '[TRIGGERED] prod-api', 'You are on call. You have always been on call.', ['Acknowledge']],
    ['slack', 'Kyle (#random)', 'jensen just added #OpenToWork to his linkedin 💀'],
    ['chatgpt', 'Sam Altman', 'hey. need $7 trillion by EOD. venmo ok?'],
    ['teams', 'IT Security', 'Training overdue: "How To Attend Two Meetings At Once" (12 min)', ['Start']],
    ['vercel', 'Your invoice is ready', 'Amount due: $96,281.40 (one page got popular)', ['Pay now']],
    ['nvidia', 'Driver update', 'Update available. Your GPU would like to restart the meeting.'],
    ['linkedin', 'LinkedIn', 'Your printer endorsed you for machine learning'],
    ['cf', 'Cloudflare status', 'Cloudflare is down. So is everything else.'],
    ['claude', 'Claude', "You're absolutely right! Also, you've hit your usage limit."],
    ['cal', 'Recurring: quick sync', 'Repeats every 30 seconds. Ends: never.'],
    ['aws', 'Billing alert', 'us-east-1 is down. You are still being charged.'],
    ['npm', 'npm audit', '847 vulnerabilities (812 critical). Run npm audit fix --force to make it worse.'],
  ],
  [ // 2: unhinged
    ['discord', 'Dave left General', 'Dave is now calling you on a different app.', null, 'discordLeave'],
    ['discord', 'The entire server is calling you', 'Incoming voice call', ['Accept', 'Decline']],
    ['slack', 'Slackbot', 'Your status is now: in a meeting about leaving meetings'],
    ['teams', 'Microsoft Teams', 'You are the presenter. There are 412 attendees.'],
    ['win', 'Printer needs attention', 'PC LOAD LETTER. The printer has joined your standup.'],
    ['win', 'Restart required', 'Your eyes need to restart to finish installing updates', ['Restart now', 'Restart now']],
    ['slack', 'Jensen (DM)', 'the more you blink, the more you save'],
    ['docker', 'Docker Desktop', 'Docker Desktop is using 127 GB of your 128 GB'],
    ['teams', 'Dave', 'Dave is sharing his screen. Dave is sharing his feelings.'],
    ['so', 'Your question was closed', 'Duplicate of "how do i sleep" (asked 14 years ago)'],
    ['chatgpt', 'Sam Altman', 'ok $6 trillion. final offer. AGI is also tired'],
    ['github', 'Copilot reviewed your PR', '"LGTM" (it did not read it)'],
    ['zoom', 'Zoom', 'You are on mute. You have been on mute since 2020.'],
    ['outlook', 'Mom', 'are you blinking enough'],
    ['cursor', 'Cursor', 'Agent deleted your database. Agent is sorry. Agent would do it again.'],
    ['jira', 'SIH-1763', 'Your eyelids were assigned to you. Story points: 13'],
  ],
  [ // 3: MLG
    ['discord', '@everyone (#general)', 'THE BUILD PASSED. NOBODY TOUCH ANYTHING.'],
    ['teams', 'Dave is still calling you', 'Incoming video call', ['Accept', 'Decline']],
    ['slack', 'Production (#incidents)', 'The rollback has requested a rollback.'],
    ['discord', 'Standup bot joined General', 'Playing: the meeting you just escaped', null, 'discordJoin'],
    ['mlg', 'xX_Dave_Xx', '1v1 me on Excel, no pivot tables'],
    ['mlg', 'MOM', 'GET THE CAMERA'],
    ['mlg', '360 NO SLEEP', 'u just got quickscoped by a calendar invite'],
    ['mlg', 'Illuminati', 'confirmed. 3 unread.'],
    ['mlg', 'SAMPLE TEXT', 'SAMPLE TEXT'],
    ['mlg', 'WOMBO COMBO', 'happy feet in #general'],
    ['mlg', 'Jensen', 'RTX ON. EYES OFF.'],
    ['mlg', 'Sam Altman', 'gg ez. $7 trillion pls'],
  ]
];

export function createFeed(box, chatlog) {
  const used = FEED.map(() => 0);
  const active = new Set();
  let photosIn = 4 + Math.floor(Math.random() * 4), photoDeck = [], lastPhoto;
  function push(tier) {
    // Leave 3–6 regular notifications between photos, across all feed tiers.
    let photo;
    if (--photosIn === 0) {
      if (!photoDeck.length) photoDeck = [...PHOTOS];
      const choices = photoDeck.filter(item => item !== lastPhoto);
      photo = choices[Math.floor(Math.random() * choices.length)];
      photoDeck.splice(photoDeck.indexOf(photo), 1);
      lastPhoto = photo;
      photosIn = 4 + Math.floor(Math.random() * 4);
    }
    const list = FEED[tier];
    const [app, who, msg, buttons, sound] = photo
      ? ['photos', photo.title, photo.caption]
      : list[used[tier]++ % list.length];
    const [name, mark, kind] = APPS[app];
    const el = document.createElement('div');
    const call = buttons?.includes('Accept');
    el.dataset.app = app;
    el.className = 'toast' + (kind === 'discord' ? ' discord' : '') + (tier === 3 ? ' dank' : '') + (call ? ' call' : kind === 'teams' ? ' teams' : '');
    if (call) {
      // the real Teams call toast: name, "is calling you", avatar, round video / audio / hang-up buttons
      const caller = who.replace(/ is calling.*$/, '');
      el.innerHTML = `<span class="x">✕</span><div class="call-brand">${mark}<span>${name}</span></div><div class="who"></div><div class="msg">is calling you</div>${avatar(caller)}<div class="rounds"><i class="vid"><svg viewBox="0 0 24 24" width="19" height="19" fill="#fff"><path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/></svg></i><i class="aud"><svg viewBox="0 0 24 24" width="19" height="19" fill="#fff"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/></svg></i><i class="end"><svg viewBox="0 0 24 24" width="19" height="19" fill="#fff"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z"/></svg></i></div>`;
      el.querySelector('.who').textContent = caller;
    } else {
      el.innerHTML = `<div class="th">${mark}<span class="app"></span><span class="x">✕</span></div><div class="row">${kind ? avatar(who) : ''}<div><div class="who"></div><div class="msg"></div></div></div>`;
      el.querySelector('.app').textContent = name; el.querySelector('.who').textContent = who; el.querySelector('.msg').textContent = msg;
      // the real Teams chat banner ends in a Reply row
      if (kind === 'teams' && !buttons) { const r = document.createElement('div'); r.className = 'reply'; r.innerHTML = '<span>↩&nbsp; Reply</span>'; el.append(r); }
      if (buttons) { const row = document.createElement('div'); row.className = 'acts'; for (const b of buttons) { const btn = document.createElement('button'); btn.textContent = b; btn.className = /Accept|Join/.test(b) ? 'go' : /Decline/.test(b) ? 'no' : ''; row.append(btn); } el.append(row); }
    }
    if (photo) {
      el.classList.add('photo-toast');
      const img = document.createElement('img');
      img.className = 'feed-photo' + (photo.illustration ? ' illustration' : '');
      img.src = PICTURES + photo.file; img.alt = photo.alt; img.decoding = 'async';
      img.onerror = () => img.remove();
      el.querySelector('.th').after(img);
      const dismiss = document.createElement('button');
      dismiss.className = 'x'; dismiss.type = 'button'; dismiss.textContent = '✕';
      dismiss.setAttribute('aria-label', 'Dismiss photo of ' + photo.title);
      el.querySelector('.x').replaceWith(dismiss);
    }
    const stopSound = notify(sound || (call ? app === 'discord' ? 'discordCall' : 'teamsCall' : { slack: 'slack', teams: 'teams', discord: 'discord', outlook: 'email', cal: 'calendar', pager: 'critical', win: 'critical' }[app] || 'system'));
    let closed = false, exitTimer;
    const dispose = () => { clearTimeout(expiryTimer); clearTimeout(exitTimer); stopSound(); active.delete(el); el.remove(); };
    const close = () => { if (closed) return; closed = true; clearTimeout(expiryTimer); stopSound(); el.classList.add('out'); exitTimer = setTimeout(dispose, 300); };
    const expiryTimer = setTimeout(close, 7000);
    el.dismiss = close; el.dispose = dispose;
    el.onclick = close; active.add(el);
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.dispose();
    if (chatlog && app === 'slack') { const p = document.createElement('p'), b = document.createElement('b'); b.textContent = who.split(' (')[0]; p.append(b, msg); chatlog.append(p); while (chatlog.children.length > 40) chatlog.firstChild.remove(); chatlog.scrollTop = 1e6; }
  }
  return { push, clear: () => { for (const el of active) el.dispose(); box.innerHTML = ''; if (chatlog) chatlog.innerHTML = ''; } };
}

// The notification feed, styled like Windows 11 toasts from the apps a developer actually has open.
// Four tiers, picked by how drunk the screen is: 0 a normal workday, 1 this week's news leaks in,
// 2 unhinged, 3 MLG.
import { notify } from './audio.js';

// Real brand marks (simple-icons, CC0) on each brand's own colour, the way Windows shows them.
const ICONS = new URL('../vendor/icons/', import.meta.url).href;
const icon = (bg, file) => `<span class="ti" style="background:${bg}"><img src="${ICONS}${file}.svg" alt=""></span>`;
const text = (bg, glyph, fg = '#fff') => `<span class="ti" style="background:${bg};color:${fg};font-size:9px">${glyph}</span>`;
const SLACK = `<svg viewBox="0 0 24 24" class="ti"><rect x="7" y="2" width="3.6" height="20" rx="1.8" fill="#E01E5A"/><rect x="13.4" y="2" width="3.6" height="20" rx="1.8" fill="#2EB67D"/><rect x="2" y="7" width="20" height="3.6" rx="1.8" fill="#36C5F0"/><rect x="2" y="13.4" width="20" height="3.6" rx="1.8" fill="#ECB22E"/></svg>`;
// name, icon, chat (shows the sender's avatar and, for Teams, the quick-reply box)
const APPS = {
  slack: ['Slack', SLACK, 'chat'], teams: ['Microsoft Teams', icon('#5059C9', 'microsoftteams'), 'teams'], outlook: ['Outlook', icon('#0078D4', 'microsoftoutlook'), 'chat'],
  github: ['GitHub', icon('#181717', 'github')], jira: ['Jira', icon('#0052CC', 'jira')], pager: ['PagerDuty', icon('#06AC38', 'pagerduty')],
  vercel: ['Vercel', icon('#000', 'vercel')], aws: ['AWS Billing', icon('#232F3E', 'amazonaws')], claude: ['Claude', icon('#D97757', 'anthropic')],
  cursor: ['Cursor', text('#111', '◩')], cf: ['Cloudflare', icon('#F38020', 'cloudflare')], npm: ['npm', icon('#CB3837', 'npm')],
  linkedin: ['LinkedIn', icon('#0A66C2', 'linkedin')], zoom: ['Zoom', icon('#0B5CFF', 'zoom')], docker: ['Docker Desktop', icon('#2496ED', 'docker')],
  win: ['Windows Update', icon('#0078D4', 'windows11')], cal: ['Google Calendar', icon('#4285F4', 'googlecalendar')], chatgpt: ['ChatGPT', icon('#0d0d0d', 'openai'), 'chat'],
  nvidia: ['NVIDIA App', icon('#76B900', 'nvidia')], so: ['Stack Overflow', icon('#F58025', 'stackoverflow')], mlg: ['xX_N0T1FY_Xx', text('#0d0', '420', '#000')]
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
    ['github', 'dependabot[bot]', 'opened 47 pull requests in your-org/monolith'],
    ['outlook', 'IT Helpdesk', 'Your password expires in 3 days'],
    ['jira', 'SIH-1763', 'Dave moved "Quick fix" from In Progress to In Progress'],
    ['slack', 'Marcus (#eng)', 'who pushed to main on a friday'],
    ['cal', 'Mandatory Fun', 'Starts in 5 minutes · Room B', ['Join', 'Snooze']],
  ],
  [ // 1: this week leaks in
    ['pager', '[TRIGGERED] prod-api', 'You are on call. You have always been on call.', ['Acknowledge']],
    ['slack', 'Kyle (#random)', 'jensen just added #OpenToWork to his linkedin 💀'],
    ['chatgpt', 'Sam Altman', 'hey. need $7 trillion by EOD. venmo ok?'],
    ['teams', 'IT Security', 'Training overdue: "How To Tell If Your GF Is A Spy" (12 min)', ['Start']],
    ['vercel', 'Your invoice is ready', 'Amount due: $96,281.40 (one page got popular)', ['Pay now']],
    ['nvidia', 'Driver update', 'GeForce 591.44: removes kiss cam support'],
    ['linkedin', 'LinkedIn', 'A suspected spy viewed your profile'],
    ['cf', 'Cloudflare status', 'Cloudflare is down. So is everything else.'],
    ['claude', 'Claude', "You're absolutely right! Also, you've hit your usage limit."],
    ['cal', 'Declined: Coldplay', 'Jensen H. declined "Coldplay (kiss cam seats)"'],
    ['aws', 'Billing alert', 'us-east-1 is down. You are still being charged.'],
    ['npm', 'npm audit', '847 vulnerabilities (812 critical). Run npm audit fix --force to make it worse.'],
  ],
  [ // 2: unhinged
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
  function push(tier) {
    const list = FEED[tier], [app, who, msg, buttons] = list[used[tier]++ % list.length];
    const [name, mark, kind] = APPS[app];
    const el = document.createElement('div');
    el.className = 'toast' + (tier === 3 ? ' dank' : '');
    el.innerHTML = `<div class="th">${mark}<span class="app"></span><span class="x">✕</span></div><div class="row">${kind ? avatar(who) : ''}<div><div class="who"></div><div class="msg"></div></div></div>`;
    el.querySelector('.app').textContent = name; el.querySelector('.who').textContent = who; el.querySelector('.msg').textContent = msg;
    if (kind === 'teams' && !buttons) { const r = document.createElement('div'); r.className = 'reply'; r.innerHTML = '<span>Send a quick reply</span><span>➤</span>'; el.append(r); }
    if (buttons) { const row = document.createElement('div'); row.className = 'acts'; for (const b of buttons) { const btn = document.createElement('button'); btn.textContent = b; btn.className = /Accept|Join/.test(b) ? 'go' : /Decline/.test(b) ? 'no' : ''; row.append(btn); } el.append(row); }
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    el.onclick = close; setTimeout(close, 7000);
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    if (chatlog && app === 'slack') { const p = document.createElement('p'), b = document.createElement('b'); b.textContent = who.split(' (')[0]; p.append(b, msg); chatlog.append(p); chatlog.scrollTop = 1e6; }
    notify();
  }
  return { push, clear: () => { box.innerHTML = ''; if (chatlog) chatlog.innerHTML = ''; } };
}

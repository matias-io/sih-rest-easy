// The notification feed, styled like Windows 11 toasts from the apps a developer actually has open.
// Four tiers, picked by how drunk the screen is: 0 a normal workday, 1 this week's news leaks in,
// 2 unhinged, 3 MLG.
import { notify } from './audio.js';

const tile = (bg, glyph, fg = '#fff', size = 11) => `<span class="ti" style="background:${bg};color:${fg};font-size:${size}px">${glyph}</span>`;
const SLACK = `<svg viewBox="0 0 24 24" class="ti"><rect x="7" y="2" width="3.6" height="20" rx="1.8" fill="#E01E5A"/><rect x="13.4" y="2" width="3.6" height="20" rx="1.8" fill="#2EB67D"/><rect x="2" y="7" width="20" height="3.6" rx="1.8" fill="#36C5F0"/><rect x="2" y="13.4" width="20" height="3.6" rx="1.8" fill="#ECB22E"/></svg>`;
const APPS = {
  slack: ['Slack', SLACK], teams: ['Microsoft Teams', tile('#5059C9', 'T', '#fff', 12)], outlook: ['Outlook', tile('#0078D4', 'O', '#fff', 12)],
  github: ['GitHub', tile('#0d1117', 'GH', '#fff', 8)], jira: ['Jira', tile('#0052CC', '◆')], pager: ['PagerDuty', tile('#06AC38', 'P', '#fff', 12)],
  vercel: ['Vercel', tile('#000', '▲', '#fff', 9)], aws: ['AWS Billing', tile('#232F3E', 'aws', '#FF9900', 7)], claude: ['Claude', tile('#D97757', '✳', '#fff', 12)],
  cursor: ['Cursor', tile('#111', '◩')], cf: ['Cloudflare', tile('#F38020', '☁', '#fff', 11)], npm: ['npm', tile('#CB3837', 'npm', '#fff', 7)],
  linkedin: ['LinkedIn', tile('#0A66C2', 'in', '#fff', 10)], zoom: ['Zoom', tile('#0B5CFF', '▶', '#fff', 9)], docker: ['Docker Desktop', tile('#1D63ED', '🐳', '#fff', 10)],
  win: ['Windows Update', tile('#0067C0', '⊞', '#fff', 12)], cal: ['Calendar', tile('#D83B01', '31', '#fff', 8)], chatgpt: ['ChatGPT', tile('#0d0d0d', '֎', '#fff', 11)],
  nvidia: ['NVIDIA App', tile('#76B900', 'N', '#000', 12)], so: ['Stack Overflow', tile('#F48024', '≡')], mlg: ['xX_N0T1FY_Xx', tile('#0d0', '420', '#000', 7)]
};

// [app, title, body, buttons?]
const FEED = [
  [ // 0: a normal workday
    ['slack', 'Priya (#general)', 'standup in 5, cameras on pls'],
    ['teams', 'Dave is calling you', 'Incoming video call', ['Accept', 'Decline']],
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
    const [name, icon] = APPS[app];
    const el = document.createElement('div');
    el.className = 'toast' + (tier === 3 ? ' dank' : '');
    el.innerHTML = `<div class="th">${icon}<span class="app"></span><span class="x">✕</span></div><div class="who"></div><div class="msg"></div>`;
    el.querySelector('.app').textContent = name; el.querySelector('.who').textContent = who; el.querySelector('.msg').textContent = msg;
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

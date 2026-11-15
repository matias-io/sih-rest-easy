// The notification feed. Four tiers, picked by how drunk the screen is:
// 0 normal office, 1 slightly off (this week's news leaks in), 2 unhinged, 3 MLG.
import { notify } from './audio.js';

const APPS = {
  slack: ['Slack', '#611f69', '#'], teams: ['Teams', '#4b53bc', 'T'], mail: ['Outlook', '#0f6cbd', '✉'],
  cal: ['Calendar', '#d83b01', '31'], news: ['News', '#b3261e', 'N'], sys: ['System', '#3a4257', '⚙'],
  in: ['LinkedIn', '#0a66c2', 'in'], hr: ['HR Portal', '#1e7a4c', 'HR'], mlg: ['xX_N0T1FY_Xx', '#0d0', '420']
};

const FEED = [
  [ // 0: normal
    ['slack', 'Priya · #general', 'standup in 5, cameras on pls'],
    ['teams', 'Dave (Manager)', 'quick sync? 2 min'],
    ['cal', 'Reminder', 'Mandatory Fun, 3:00 PM, Room B'],
    ['mail', 'IT Helpdesk', 'Your password expires in 3 days'],
    ['slack', 'Marcus', 'did you see my PR'],
    ['teams', 'Dave (Manager)', 'per my last message'],
  ],
  [ // 1: slightly off
    ['hr', 'Policy update', 'Reminder: employees may not date foreign intelligence assets'],
    ['slack', 'Kyle · #random', 'jensen just added #OpenToWork to his linkedin 💀'],
    ['slack', 'Sam Altman', 'hey. need $7 trillion by EOD. venmo ok?'],
    ['news', 'Markets', 'NVDA sheds $430B. Analysts cite "a situationship".'],
    ['teams', 'IT Security', 'Training due: "How To Tell If Your GF Is A Spy" (12 min)'],
    ['cal', 'Declined', 'Jensen H. declined: Coldplay concert (kiss cam section)'],
    ['in', 'LinkedIn', 'A spy viewed your profile'],
    ['teams', 'Dave (Manager)', 'this meeting could have been a nap'],
    ['slack', 'Sam Altman', 'ok $6 trillion. final offer'],
  ],
  [ // 2: unhinged
    ['sys', 'Windows Update', 'Your eyes need to restart to finish installing updates'],
    ['slack', 'Jensen', 'the more you blink, the more you save'],
    ['mail', 'Mom', 'are you blinking enough'],
    ['teams', 'Dave (Manager)', 'Dave is sharing his screen. Dave is sharing his feelings.'],
    ['sys', 'Clippy', 'It looks like you are awake. Would you like help with that?'],
    ['slack', 'Sam Altman', 'AGI achieved internally (it is also tired)'],
    ['hr', 'HR Portal', 'Your eyelids have filed a complaint'],
    ['news', 'Breaking', 'Local screen "has had a few", sources say'],
    ['in', 'LinkedIn', 'Congratulate your retinas on 5 years of service'],
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
    const list = FEED[tier], [app, who, msg] = list[used[tier]++ % list.length];
    const [name, colour, glyph] = APPS[app];
    const el = document.createElement('div');
    el.className = 'toast' + (tier === 3 ? ' dank' : '');
    el.innerHTML = `<div class="ico" style="background:${colour}">${glyph}</div><div><div class="app"><span>${name}</span><span>now</span></div><div class="who"></div><div class="msg"></div></div>`;
    el.querySelector('.who').textContent = who; el.querySelector('.msg').textContent = msg;
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    el.onclick = close; setTimeout(close, 6500);
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    if (chatlog && app === 'slack') { const p = document.createElement('p'); p.innerHTML = '<b></b>'; p.firstChild.textContent = who.split(' · ')[0]; p.append(msg); chatlog.append(p); chatlog.scrollTop = 1e6; }
    notify();
  }
  return { push, clear: () => { box.innerHTML = ''; } };
}

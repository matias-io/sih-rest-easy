// The practice desktop's to-do list: five small jobs to finish while the screen gets drunk.
// Each job is done by doing the real thing on the fake desktop, not by ticking a box.

export const TASKS = [
  { id: 'write', label: 'Write 20 words of the Q4 report' },
  { id: 'reply', label: 'Reply to Dave in #general' },
  { id: 'approve', label: 'Approve PR #4012' },
  { id: 'clear', label: 'Clear 3 notifications' },
  { id: 'call', label: 'Join the standup call' },
];

export const wordCount = (text) => (text.trim().match(/[\p{L}\p{N}']+/gu) || []).length;

// Pure progress state, so it can be tested without a page.
export function createProgress() {
  const done = new Set();
  let cleared = 0;
  return {
    done,
    mark(id) { const fresh = TASKS.some((t) => t.id === id) && !done.has(id); if (fresh) done.add(id); return fresh; },
    cleared() { cleared++; return cleared >= 3 && this.mark('clear'); },
    reset() { done.clear(); cleared = 0; },
    get count() { return done.size; },
  };
}

// Wires the list into the practice desktop. Returns tick(level) for the frame loop.
export function createWork({ list, score, notes, chatform, toasts }) {
  const progress = createProgress();
  let baseWords = 0, approveBtn = null, dodge = 0;

  function render() {
    list.replaceChildren(...TASKS.map((t) => {
      const li = document.createElement('li'); li.dataset.task = t.id;
      li.className = progress.done.has(t.id) ? 'done' : '';
      const box = document.createElement('span'); box.className = 'box'; box.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span'); text.textContent = t.label;
      li.append(box, text);
      if (t.id === 'approve' && !progress.done.has('approve')) {
        approveBtn = document.createElement('button'); approveBtn.type = 'button'; approveBtn.className = 'approve'; approveBtn.textContent = 'Approve';
        approveBtn.onclick = () => complete('approve');
        li.append(approveBtn);
      }
      return li;
    }));
    score.textContent = `${progress.count} of ${TASKS.length} done`;
  }
  function complete(id) { if (progress.mark(id)) { render(); list.querySelector(`[data-task="${id}"]`)?.classList.add('just'); } }

  notes.addEventListener('input', () => { if (wordCount(notes.value) - baseWords >= 20) complete('write'); });
  chatform.addEventListener('submit', () => complete('reply'));
  // only clicks count: a notification that times out on its own was not dealt with
  toasts.addEventListener('click', (e) => {
    const toast = e.target.closest('.toast'); if (!toast) return;
    if (toast.classList.contains('call') || e.target.closest('.go')) complete('call');
    if (progress.cleared()) render();
  }, true);

  return {
    progress,
    reset() { progress.reset(); baseWords = wordCount(notes.value); dodge = 0; render(); },
    // past half drunk, the Approve button starts edging away from the cursor
    tick(level, pointer) {
      if (!approveBtn?.isConnected) return;
      if (level < 0.5 || !pointer) { if (dodge) { dodge = 0; approveBtn.style.transform = ''; } return; }
      const r = approveBtn.getBoundingClientRect(), dx = r.left + r.width / 2 - pointer.x, dy = r.top + r.height / 2 - pointer.y;
      const near = Math.hypot(dx, dy) < 90;
      dodge = near ? Math.min(1, dodge + 0.15) : Math.max(0, dodge - 0.05);
      const push = dodge * 70 * (level - 0.4);
      approveBtn.style.transform = `translate(${(Math.sign(dx) || 1) * push}px, ${(Math.sign(dy) || 1) * push * 0.4}px)`;
    },
  };
}

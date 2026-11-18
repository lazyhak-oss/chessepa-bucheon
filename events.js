// 대회 정보 표: events.json(매일 자동 갱신)으로 다시 그리고, 이미 끝난 대회는 숨긴다.
// 파일을 못 읽으면 HTML에 적어 둔 줄을 그대로 둔다.
(async () => {
  const body = document.getElementById('event-grid');
  if (!body) return;
  let data;
  try {
    const res = await fetch('events.json', { cache: 'no-cache' });
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }

  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // 한국 날짜
  const part = (d) => d.split('-').map(Number);
  const when = (a, b) => {
    const [y, m, d] = part(a);
    let s = `${y}. ${m}. ${d}.`;
    if (b && b !== a) {
      const [y2, m2, d2] = part(b);
      s += y2 === y && m2 === m ? `–${d2}.` : `–${m2}. ${d2}.`;
    }
    return s;
  };
  const ARROW = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

  const td = (text) => { const c = document.createElement('td'); c.textContent = text; return c; };
  const rows = (data.events || []).filter((e) => e.end >= today).map((e) => {
    const tr = document.createElement('tr');
    const name = td(e.name);
    const [, dm, dd] = e.deadline ? part(e.deadline) : [];
    const info = [e.target, e.deadline && `접수 마감 ${dm}. ${dd}.`].filter(Boolean).join(' · ');
    if (info) { const s = document.createElement('small'); s.textContent = info; name.append(s); }
    const go = document.createElement('td');
    go.className = 'go';
    const a = document.createElement('a');
    a.className = 'icon-btn icon-btn--sm';
    a.href = e.url; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', `${e.name} 대회 안내 (새 창)`);
    a.innerHTML = ARROW;
    go.append(a);
    tr.append(name, td(when(e.start, e.end)), td(e.region), td(e.kind), go);
    return tr;
  });
  if (!rows.length) {
    const tr = document.createElement('tr');
    const c = td('지금 접수 중인 대회가 없습니다. 전체 대회 일정에서 확인해 주세요.');
    c.colSpan = 5; tr.append(c); rows.push(tr);
  }
  body.replaceChildren(...rows);

  const upd = document.getElementById('event-updated');
  if (upd && data.updated) upd.textContent = data.updated.replaceAll('-', '. ') + '.';
})();

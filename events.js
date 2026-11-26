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

// 공지사항 표: notices.json(블로그 공지 글, 매일 자동 갱신)으로 다시 그린다.
// 파일을 못 읽으면 HTML에 적어 둔 줄을 그대로 둔다.
(async () => {
  const body = document.getElementById('notice-grid');
  if (!body) return;
  let data;
  try {
    const res = await fetch('notices.json', { cache: 'no-cache' });
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }
  const list = (data.notices || []).filter((n) => /^https:\/\/blog\.naver\.com\//.test(n.url));
  if (!list.length) return;
  const day = (d) => d.split('-').map(Number).join('. ') + '.';
  const ARROW = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  const td = (text) => { const c = document.createElement('td'); c.textContent = text; return c; };
  body.replaceChildren(...list.map((n) => {
    const tr = document.createElement('tr');
    const title = td(n.title);
    if (n.summary) { const s = document.createElement('small'); s.textContent = n.summary; title.append(s); }
    const go = document.createElement('td');
    go.className = 'go';
    const a = document.createElement('a');
    a.className = 'icon-btn icon-btn--sm';
    a.href = n.url; a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('aria-label', `${n.title} 블로그에서 보기 (새 창)`);
    a.innerHTML = ARROW;
    go.append(a);
    tr.append(title, td(day(n.date)), td(n.category), go);
    return tr;
  }));
  const upd = document.getElementById('notice-updated');
  if (upd && data.updated) upd.textContent = day(data.updated);
})();

// 첫 화면 NOTICE(이번 달 행사 안내)와 클럽데이 카드: 학원관리앱(chess-epa-os)에 입력한
// 공휴일 수업 여부, 전체 휴강일, "클럽데이"·"보강데이" 행사를 가져와 보여 준다.
// 못 불러오면 "문자로 안내" 문구를 그대로 둔다.
(async () => {
  let data;
  try {
    const res = await fetch('https://chess-epa-os.vercel.app/api/external/month-notice');
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }
  const today = data.today;
  const wd = (d) => '일월화수목금토'[new Date(d + 'T00:00:00Z').getUTCDay()];
  const md = (d) => `${+d.slice(5, 7)}/${+d.slice(8, 10)}(${wd(d)})`;
  const time = (e) => (e.startTime ? ` ${e.startTime}${e.endTime ? '–' + e.endTime : ''}` : '');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };

  // NOTICE: 이번 달 행사가 모두 지나갔으면 다음 달 안내를 보여 준다.
  const list = document.getElementById('notice-list');
  const mon = document.getElementById('notice-month');
  if (list) {
    let nd = data;
    const dated = (x) => [...x.days, ...(x.events || []), ...x.clubDays.filter((c) => c.date.slice(0, 7) === x.month), ...x.makeupDays];
    const cur = dated(data);
    if (cur.length && cur.every((e) => e.date < today)) {
      const [y, m] = data.month.split('-').map(Number);
      const next = `${m === 12 ? y + 1 : y}-${String((m % 12) + 1).padStart(2, '0')}`;
      try {
        const r = await fetch(`https://chess-epa-os.vercel.app/api/external/month-notice?month=${next}`);
        if (r.ok) nd = await r.json();
      } catch { /* 다음 달을 못 불러오면 이번 달 안내를 그대로 둔다 */ }
    }
    const label = `${+nd.month.slice(5, 7)}월`;
    if (mon) mon.textContent = label;
    const items = nd.days.map((d) => {
      const li = el('li', '', `${md(d.date)} ${d.name}`);
      li.append(el('b', d.status === '휴강' ? 'off' : 'on', d.status));
      return li;
    });
    for (const e of nd.events || []) items.push(el('li', 'notice-event', `${md(e.date)} ${e.name}${time(e)}`));
    const club = nd.clubDays.filter((c) => c.date.slice(0, 7) === nd.month);
    if (club.length) items.push(el('li', 'notice-event', `체스클럽 ${club.map((c) => md(c.date) + time(c)).join(', ')}`));
    if (nd.makeupDays.length) {
      const t = time(nd.makeupDays[0]);
      const same = nd.makeupDays.every((m) => time(m) === t);
      items.push(el('li', 'notice-event', `보강데이 ${nd.makeupDays.map((m) => md(m.date) + (same ? '' : time(m))).join('·')}${same ? t : ''}`));
    }
    if (!items.length) items.push(el('li', '', `${label}은 공휴일 휴강 없이 정상 수업합니다.`));
    list.replaceChildren(...items);
  }

  // 수업 외 활동의 클럽데이 카드
  const box = document.getElementById('clubday-when');
  if (box) {
    const label = (c) => `${+c.date.slice(5, 7)}월 ${+c.date.slice(8, 10)}일(${wd(c.date)})${time(c)}`;
    const thisMonth = data.clubDays.filter((c) => c.date.slice(0, 7) === today.slice(0, 7));
    const upcoming = data.clubDays.filter((c) => c.date >= today);
    if (thisMonth.length) {
      const past = thisMonth.every((c) => c.date < today);
      box.textContent = `${past ? '이번 달 클럽데이(종료)' : '이번 달 클럽데이'}: ${thisMonth.map(label).join(', ')}`;
      if (past && upcoming.length) box.textContent += ` · 다음: ${label(upcoming[0])}`;
    } else if (upcoming.length) {
      box.textContent = `다음 클럽데이: ${label(upcoming[0])}`;
    }
  }
})();

// 갤러리: 위쪽 작은 사진 줄이 4초마다 한 장씩 옆으로 넘어가고, 지금 사진이 아래에 크게 나온다.
// 지금 사진은 작은 사진 줄에서 빛나게 표시한다. 항목 버튼으로 그 폴더 사진만 고른다.
// 마우스를 올리거나 키보드로 들어가 있으면 멈추고, 움직임 줄이기를 켠 사람에게는 자동으로 넘기지 않는다.
// 스크립트가 없으면 첫 사진이 크게 보이고, 작은 사진을 누르면 큰 사진 파일이 열린다.
// 학원관리앱 "홈페이지 관리"에서 고친 항목(albums['gallery.항목'])은 그 사진으로 바꾸고, 아니면 HTML 사진을 그대로 쓴다.
const strip = document.querySelector('.g-strip');
const stage = document.querySelector('.g-stage');

const loadAlbums = async () => {
  try {
    const res = await fetch('https://chess-epa-os.vercel.app/api/external/homepage', { signal: AbortSignal.timeout(4000) });
    return res.ok ? (await res.json()).albums || {} : {};
  } catch { return {}; }
};

const applyAlbums = (albums, chips) => {
  const okUrl = (u) => typeof u === 'string' && /^https:\/\/[^\s"'()<>]+$/.test(u);
  chips.forEach((chip) => {
    const cat = chip.dataset.cat;
    const list = cat && albums['gallery.' + cat];
    if (!Array.isArray(list)) return;
    const label = chip.firstChild.textContent.trim();
    const items = list.filter((g) => g && okUrl(g.url)).map((g, i) => {
      const li = document.createElement('li');
      li.dataset.cat = cat;
      const a = document.createElement('a');
      a.href = g.url;
      const img = document.createElement('img');
      img.src = okUrl(g.thumb) ? g.thumb : g.url;
      img.alt = typeof g.caption === 'string' && g.caption ? g.caption : `${label} ${i + 1}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      a.append(img);
      li.append(a);
      return li;
    });
    const old = [...strip.children].filter((li) => li.dataset.cat === cat);
    if (old.length) old[0].before(...items); else strip.append(...items);
    old.forEach((li) => li.remove());
  });
  // 항목별 사진 수를 다시 세고, 사진이 없는 항목은 숨긴다
  chips.forEach((chip) => {
    const n = chip.dataset.cat ? strip.querySelectorAll(`li[data-cat="${chip.dataset.cat}"]`).length : strip.children.length;
    chip.querySelector('span').textContent = n;
    chip.hidden = !n;
  });
};

if (strip && stage) loadAlbums().then((albums) => {
  const chips = [...document.querySelectorAll('.chips .chip')];
  applyAlbums(albums, chips);
  const big = stage.querySelector('img');
  const count = stage.querySelector('.g-count');
  const all = [...strip.children];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let list = all, at = 0;

  const show = (i) => {
    if (!list.length) return;
    list[at]?.classList.remove('is-on');
    at = (i + list.length) % list.length;
    const li = list[at];
    const a = li.querySelector('a');
    li.classList.add('is-on');
    big.src = a.href;
    big.alt = a.querySelector('img').alt;
    count.textContent = `${at + 1} / ${list.length}`;
    if (!still) big.animate([{ opacity: 0.35 }, { opacity: 1 }], 400);
    // 작은 사진 줄만 옆으로 움직여 지금 사진을 가운데에 둔다(페이지는 스크롤하지 않는다)
    strip.scrollTo({ left: li.offsetLeft - (strip.clientWidth - li.offsetWidth) / 2, behavior: still ? 'auto' : 'smooth' });
    new Image().src = list[(at + 1) % list.length].querySelector('a').href; // 다음 사진 미리 받기
  };

  chips.forEach((chip) => chip.addEventListener('click', () => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    all.forEach((li) => { li.hidden = !!chip.dataset.cat && li.dataset.cat !== chip.dataset.cat; li.classList.remove('is-on'); });
    list = all.filter((li) => !li.hidden);
    at = 0;
    show(0);
  }));

  strip.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    e.preventDefault();
    show(list.indexOf(li));
  });
  stage.querySelector('.g-prev').addEventListener('click', () => show(at - 1));
  stage.querySelector('.g-next').addEventListener('click', () => show(at + 1));

  show(0);
  if (!still) {
    setInterval(() => {
      if (!document.hidden && !strip.matches(':hover, :focus-within') && !stage.matches(':hover, :focus-within')) show(at + 1);
    }, 4000);
  }
});

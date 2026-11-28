// 모바일 옆 메뉴, 사진 슬라이드 화살표, 스크롤하면 나타나는 연출.
document.documentElement.classList.add('js');

// 자동 넘김: 마우스를 올리거나 키보드로 들어가 있으면 멈추고, 움직임 줄이기를 켠 사람에게는 하지 않는다
const autoplay = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const every = (el, ms, fn) => {
  if (!autoplay) return;
  setInterval(() => { if (!document.hidden && !el.matches(':hover, :focus-within')) fn(); }, ms);
};

// 사진 슬라이드: 화살표 한 번에 한 장, 3.5초마다 다음 장, 끝에서 처음으로. 스크립트가 없어도 옆으로 밀어 넘길 수 있다
document.querySelectorAll('.slider').forEach((slider) => {
  const track = slider.querySelector('.slider-track');
  const move = (dir) => {
    const step = track.firstElementChild.offsetWidth + parseFloat(getComputedStyle(track).columnGap);
    const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    if (dir > 0 && end) track.scrollTo({ left: 0, behavior: 'smooth' });
    else track.scrollBy({ left: dir * step, behavior: 'smooth' });
  };
  slider.querySelectorAll('[data-dir]').forEach((btn) => btn.addEventListener('click', () => move(+btn.dataset.dir)));
  every(slider, 3500, () => move(1));
});

// 한 칸에 사진 여러 장(data-slides): 4.5초마다 다음 사진으로 서서히 바뀐다
document.querySelectorAll('[data-slides]').forEach((box) => {
  // 사진은 앱에서 바뀔 수 있어(site-content.js) 매번 새로 찾는다
  if (box.querySelectorAll('img').length < 2) return;
  let at = 0;
  every(box, 4500, () => {
    const imgs = box.querySelectorAll('img');
    if (imgs.length < 2) return;
    at = Math.min(at, imgs.length - 1);
    imgs[at].classList.remove('is-on');
    at = (at + 1) % imgs.length;
    imgs[at].classList.add('is-on');
  });
});

// 화면에 들어오면 떠오른다. 움직임 줄이기를 켠 사람에게는 하지 않는다
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.section-head, .feature, .class-card, .process li, .statement p, .cta-banner, .slider, .accordion details')
    .forEach((el) => { el.classList.add('reveal'); io.observe(el); });
}

const menuBtn = document.querySelector('.menu-btn');
const drawer = document.getElementById('drawer');

if (menuBtn && drawer) {
  const setOpen = (open) => {
    drawer.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) drawer.querySelector('.drawer-close').focus();
    else if (drawer.contains(document.activeElement)) menuBtn.focus();
  };
  menuBtn.addEventListener('click', () => setOpen(true));
  drawer.addEventListener('click', (e) => { if (e.target.closest('a, .drawer-close')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) setOpen(false);
  });
}

// 평가 인포그래픽: 큰 원에서 각 아이콘으로 사선을 긋고, 큰 원과 아이콘 둘레에 여러 겹 호를 그린다.
// 선은 큰 원 오른쪽 호에서 출발해 아이콘을 감싸는 호의 한가운데에 닿는다. 화면 크기가 바뀌면 다시 그린다.
const hub = document.querySelector('.hub');
if (hub && 'ResizeObserver' in window) {
  const svg = hub.querySelector('.hub-lines');
  const TONES = ['#e65416', '#b03c0a', '#f2a27f'];
  const pt = (c, r, a) => [c.x + r * Math.cos(a), c.y + r * Math.sin(a)];
  const arc = (c, r, a0, a1, color, w = 2) => {
    const [x0, y0] = pt(c, r, a0), [x1, y1] = pt(c, r, a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
  };
  const center = (el, box) => { const r = el.getBoundingClientRect(); return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, r: r.width / 2 }; };
  const deg = Math.PI / 180;
  const draw = () => {
    if (getComputedStyle(svg).display === 'none') return;
    const box = hub.getBoundingClientRect();
    svg.setAttribute('width', box.width); svg.setAttribute('height', box.height);
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const core = center(hub.querySelector('.hub-core'), box);
    const R = core.r + 18;
    const icons = [...hub.querySelectorAll('.hub-ico')].map((el) => center(el, box));
    const angles = icons.map((ic) => Math.atan2(ic.y - core.y, ic.x - core.x));
    let out = '';
    // 큰 원: 선이 출발하는 오른쪽 호 + 왼쪽에 겹겹이 두른 호(색 3톤)
    out += arc(core, R, Math.min(...angles) - 14 * deg, Math.max(...angles) + 14 * deg, TONES[0], 2.5);
    out += arc(core, R, 120 * deg, 235 * deg, TONES[0], 2.5);
    out += arc(core, R + 13, 140 * deg, 250 * deg, TONES[1], 2);
    out += arc(core, R + 26, 160 * deg, 215 * deg, TONES[2], 2);
    out += arc(core, R + 13, -60 * deg, -25 * deg, TONES[2], 2);
    // 각 아이콘: 큰 원 쪽을 감싸는 호, 그 호의 한가운데로 들어오는 사선
    icons.forEach((ic, i) => {
      const tone = TONES[i % 3];
      const back = Math.atan2(core.y - ic.y, core.x - ic.x); // 아이콘에서 큰 원을 바라보는 방향
      const ring = ic.r + 9;
      const [sx, sy] = pt(core, R, angles[i]);
      const [ex, ey] = pt(ic, ring, back);
      out += `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${tone}" stroke-width="2"/>`;
      out += arc(ic, ring, back - 95 * deg, back + 95 * deg, tone, 2.5);
      out += arc(ic, ring + 8, back + 20 * deg, back + 70 * deg, TONES[(i + 2) % 3], 1.5);
    });
    svg.innerHTML = out;
  };
  new ResizeObserver(draw).observe(hub);
  document.fonts?.ready.then(draw);
}

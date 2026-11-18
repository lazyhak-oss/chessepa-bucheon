// 모바일 옆 메뉴, 사진 슬라이드 화살표, 스크롤하면 나타나는 연출.
document.documentElement.classList.add('js');

// 사진 슬라이드: 화살표 한 번에 한 장. 스크립트가 없어도 옆으로 밀어 넘길 수 있다
document.querySelectorAll('.slider').forEach((slider) => {
  const track = slider.querySelector('.slider-track');
  slider.querySelectorAll('[data-dir]').forEach((btn) => btn.addEventListener('click', () => {
    const step = track.firstElementChild.offsetWidth + parseFloat(getComputedStyle(track).columnGap);
    track.scrollBy({ left: btn.dataset.dir * step, behavior: 'smooth' });
  }));
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

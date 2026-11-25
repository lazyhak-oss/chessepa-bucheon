// 갤러리: 위쪽 작은 사진 줄이 4초마다 한 장씩 옆으로 넘어가고, 지금 사진이 아래에 크게 나온다.
// 지금 사진은 작은 사진 줄에서 빛나게 표시한다. 항목 버튼으로 그 폴더 사진만 고른다.
// 마우스를 올리거나 키보드로 들어가 있으면 멈추고, 움직임 줄이기를 켠 사람에게는 자동으로 넘기지 않는다.
// 스크립트가 없으면 첫 사진이 크게 보이고, 작은 사진을 누르면 큰 사진 파일이 열린다.
const strip = document.querySelector('.g-strip');
const stage = document.querySelector('.g-stage');

if (strip && stage) {
  const chips = [...document.querySelectorAll('.chips .chip')];
  const big = stage.querySelector('img');
  const count = stage.querySelector('.g-count');
  const all = [...strip.children];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let list = all, at = 0;

  const show = (i) => {
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
}

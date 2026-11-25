// 갤러리: 항목 버튼으로 사진을 골라 보고, 사진을 누르면 크게 본다.
// 스크립트가 없으면 모든 사진이 보이고, 사진을 누르면 큰 사진 파일이 열린다.
const chips = [...document.querySelectorAll('.chips .chip')];
const items = [...document.querySelectorAll('.gallery-grid li')];

chips.forEach((chip) => chip.addEventListener('click', () => {
  chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  items.forEach((li) => { li.hidden = !!chip.dataset.cat && li.dataset.cat !== chip.dataset.cat; });
}));

const box = document.querySelector('.lightbox');
if (box && box.showModal) {
  const img = box.querySelector('img');
  const count = box.querySelector('.lightbox-count');
  let list = [], at = 0;
  const show = (i) => {
    at = (i + list.length) % list.length;
    const a = list[at];
    img.src = a.href;
    img.alt = a.querySelector('img').alt;
    count.textContent = `${at + 1} / ${list.length}`;
  };
  document.querySelector('.gallery-grid')?.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    list = items.filter((li) => !li.hidden).map((li) => li.querySelector('a'));
    show(list.indexOf(a));
    box.showModal();
  });
  box.querySelector('.lightbox-close').addEventListener('click', () => box.close());
  box.querySelector('.lightbox-prev').addEventListener('click', () => show(at - 1));
  box.querySelector('.lightbox-next').addEventListener('click', () => show(at + 1));
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(at - 1);
    if (e.key === 'ArrowRight') show(at + 1);
  });
  box.addEventListener('close', () => img.removeAttribute('src'));
}

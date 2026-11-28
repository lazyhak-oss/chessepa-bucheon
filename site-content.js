// 학원관리앱(chess-epa-os)의 "홈페이지 관리"에서 바꾼 문구와 사진을 불러와 적용한다.
// data-edit="키" 문구, data-photo="키" 사진 칸, data-gallery 활동 사진 슬라이드가 대상이다.
// 못 불러오거나 값이 비어 있으면 HTML에 적어 둔 내용을 그대로 둔다.
(async () => {
  let data;
  try {
    const res = await fetch('https://chess-epa-os.vercel.app/api/external/homepage');
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }

  const okUrl = (u) => typeof u === 'string' && /^https:\/\/[^\s"'()<>]+$/.test(u);
  const texts = data.texts || {};
  const photos = data.photos || {};

  document.querySelectorAll('[data-edit]').forEach((el) => {
    const v = texts[el.dataset.edit];
    if (typeof v === 'string' && v.trim()) el.textContent = v.trim();
  });

  document.querySelectorAll('[data-photo]').forEach((el) => {
    const url = photos[el.dataset.photo];
    if (!okUrl(url)) return;
    let img = el.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = (el.dataset.label || '').replace(/\s*사진.*$/, '') || '더체스EPA 사진';
      img.loading = 'lazy';
      el.replaceChildren(img);
    }
    img.src = url;
    el.hidden = false;
    // E·P·A 큰 글자는 같은 사진을 글자 안에 채운다
    const num = el.closest('.feature')?.querySelector('.feature-num[style*="--img"]');
    if (num) num.style.setProperty('--img', `url("${url}")`);
  });

  // 슬라이드 사진 묶음(data-album): 앱에서 고친 적 있는 묶음만 바꾸고, 다 지웠으면 칸을 숨긴다
  const albums = data.albums || {};
  document.querySelectorAll('[data-album]').forEach((el) => {
    const list = albums[el.dataset.album];
    if (!Array.isArray(list)) return;
    const items = list.filter((a) => a && okUrl(a.url));
    if (!items.length) { el.style.display = 'none'; return; }
    el.replaceChildren(...items.map((a, i) => {
      const img = document.createElement('img');
      img.src = a.url;
      img.alt = typeof a.caption === 'string' && a.caption ? a.caption : '더체스EPA 사진';
      if (i) img.loading = 'lazy'; else img.className = 'is-on';
      return img;
    }));
  });

  const track = document.querySelector('[data-gallery]');
  const gallery = Array.isArray(data.gallery) ? data.gallery.filter((g) => g && okUrl(g.url)) : [];
  if (track && gallery.length) {
    track.replaceChildren(...gallery.map((g) => {
      const box = document.createElement('div');
      box.className = 'feature-media';
      const img = document.createElement('img');
      img.src = g.url;
      img.alt = typeof g.caption === 'string' && g.caption ? g.caption : '더체스EPA 활동 사진';
      img.loading = 'lazy';
      box.append(img);
      return box;
    }));
  }
})();

"""'사진' 폴더의 하위 폴더를 갤러리 항목(탭)으로 삼아 gallery.html의 사진 목록을 다시 만든다.

사진 추가: 사진/<항목 이름>/ 에 사진을 넣고(새 폴더 = 새 항목) 이 스크립트를 실행한다.
  python scripts/build_gallery.py
- 사진은 images/gallery/ 아래에 큰 사진(긴 변 1600px)과 목록용 작은 사진(480px)으로 줄여 저장한다.
  촬영 위치·기기 정보(EXIF)는 지운다. 이미 줄여 둔 사진은 건너뛴다.
- 원본 폴더에서 지운 사진은 갤러리에서도 지운다.
- 이름이 _로 시작하는 폴더(예: 사진/_갤러리 제외)는 올리지 않는다. 포스터처럼 뺄 사진을 여기로 옮긴다.
- 원본 '사진' 폴더는 깃허브에 올리지 않는다(.gitignore).
Pillow가 필요하다.
"""
import html
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "사진"
OUT = ROOT / "images" / "gallery"
PAGE = ROOT / "gallery.html"
EXTS = {".jpg", ".jpeg", ".png", ".webp"}
START, END = "<!-- gallery:start -->", "<!-- gallery:end -->"
# 항목 순서. 여기 없는 새 폴더는 뒤에 이름순으로 붙는다
ORDER = ["수업사진", "대회사진", "클럽데이", "마인드 스포츠", "학원내부사진"]


def slug(name):
    return re.sub(r"\s+", "-", name.strip())


def save(src, dst, size, quality):
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im.thumbnail((size, size))
    im.save(dst, "JPEG", quality=quality, optimize=True, progressive=True)  # EXIF 없이 저장


def build():
    cats, keep = [], set()
    rank = lambda p: (ORDER.index(p.name) if p.name in ORDER else len(ORDER), p.name)
    for folder in sorted((p for p in SRC.iterdir() if p.is_dir() and not p.name.startswith("_")), key=rank):
        files = sorted(f for f in folder.iterdir() if f.suffix.lower() in EXTS)
        if not files:
            continue
        s, items = slug(folder.name), []
        for f in files:
            full, thumb = OUT / s / f"{f.stem}.jpg", OUT / s / "t" / f"{f.stem}.jpg"
            save(f, full, 1600, 80)
            save(f, thumb, 480, 72)
            keep |= {full, thumb}
            items.append(full.relative_to(ROOT).as_posix())
        cats.append((folder.name, s, items))
        print(f"{folder.name}: {len(items)}장")

    for old in OUT.rglob("*.jpg"):  # 원본에서 지운 사진
        if old not in keep:
            old.unlink()

    total = sum(len(i) for _, _, i in cats)
    e = lambda t: html.escape(t, quote=True)
    tabs = [f'<button class="chip" type="button" data-cat="" aria-pressed="true">전체 <span>{total}</span></button>']
    tabs += [f'<button class="chip" type="button" data-cat="{e(s)}" aria-pressed="false">{e(n)} <span>{len(i)}</span></button>'
             for n, s, i in cats]
    figs = []
    for name, s, items in cats:
        for k, src in enumerate(items, 1):
            head, tail = src.rsplit("/", 1)
            figs.append(f'<li data-cat="{e(s)}"><a href="{e(src)}"><img src="{e(head)}/t/{e(tail)}" alt="{e(name)} {k}" loading="lazy" decoding="async"></a></li>')
    first, first_alt = cats[0][2][0], f"{cats[0][0]} 1"
    block = (f'{START}\n    <div class="chips" aria-label="갤러리 항목">{"".join(tabs)}</div>\n'
             f'    <ul class="g-strip" aria-label="사진 목록, 옆으로 넘겨 보기">\n      ' + "\n      ".join(figs) + '\n    </ul>\n'
             f'    <figure class="g-stage"><img src="{e(first)}" alt="{e(first_alt)}">'
             '<figcaption class="g-count"></figcaption>'
             '<button class="icon-btn g-prev" type="button" aria-label="이전 사진">←</button>'
             '<button class="icon-btn g-next" type="button" aria-label="다음 사진">→</button></figure>\n'
             f'    {END}')

    page = PAGE.read_text(encoding="utf-8")
    if START not in page or END not in page:
        raise SystemExit("gallery.html에서 갤러리 표시(<!-- gallery:start/end -->)를 찾지 못했습니다")
    page = re.sub(re.escape(START) + ".*?" + re.escape(END), lambda _: block, page, flags=re.S)
    PAGE.write_text(page, encoding="utf-8", newline="\n")
    print(f"갤러리 {len(cats)}개 항목, {total}장")


if __name__ == "__main__":
    if not SRC.is_dir():
        sys.exit(f"사진 폴더가 없습니다: {SRC}")
    build()

"""네이버 블로그(thechessepa_bc) 새 글 목록(RSS)에서 공지에 해당하는 글만 골라 notices.json으로 저장한다.

GitHub Actions가 매일 실행한다(.github/workflows/update-events.yml). 표준 라이브러리만 쓴다.
읽기에 실패하면 기존 notices.json을 건드리지 않고 오류로 끝난다.
  python3 scripts/update_notices.py              # 블로그에서 읽어 저장
  python3 scripts/update_notices.py --file x.xml # 내려받아 둔 RSS로 저장(시험용)
  python3 scripts/update_notices.py --self-test  # 골라내기 규칙 확인
"""
import datetime as dt
import email.utils
import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

SOURCE = "https://rss.blog.naver.com/thechessepa_bc.xml"
OUT = Path(__file__).resolve().parent.parent / "notices.json"
# 공지로 보여 줄 블로그 분류(이름에 이 말이 들어가면 포함)와 홈페이지에 보일 짧은 이름.
# 읽을거리 분류(원장다이어리, 주간 체스 소식, 처음 배우는 체스 등)는 넣지 않는다.
CATEGORIES = {"학원공지": "학원 공지", "대회 안내": "대회", "체스클럽": "클럽데이", "마인드스포츠올림피아드": "올림피아드"}
MAX_NOTICES = 8
SUMMARY_LEN = 80
# 요약에서 뺄 인사·도입 문장
SKIP = re.compile(r"안녕하세요|^.{0,40}(센터|아카데미|원장\S*)입니다|오늘은 .{0,30}(왔습니다|드리겠습니다|드릴게요)|\?$")
KST = dt.timezone(dt.timedelta(hours=9))


def clean(s):
    s = html.unescape(s or "").replace("\xa0", " ")
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def summarize(text):
    """인사말·도입 질문을 건너뛰고 본문 첫 문장을 짧게 줄인다."""
    text = re.sub(r"[^\w\s.,·:()~\-–/%+'\"“”‘’!?]", " ", text)   # 이모지·장식 기호 제거
    text = re.sub(r"\^+|캡션|[①-⑳]", " ", text)
    text = re.sub(r"\s*\([A-Za-z][^)]*\)", "", text)                # 괄호 속 영문 이름
    text = re.sub(r"\s+([.,!?])", r"\1", text)
    text = re.sub(r"\s+", " ", text).strip()
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    body = [s for s in sentences if not SKIP.search(s)] or sentences
    pick = body[0] if body else ""
    if len(pick) > SUMMARY_LEN:
        pick = pick[:SUMMARY_LEN].rsplit(" ", 1)[0].rstrip(",·:") + "…"
    return pick


def parse(xml_text):
    root = ET.fromstring(xml_text)
    out = []
    for item in root.findall("./channel/item"):
        category = clean(item.findtext("category"))
        label = next((v for k, v in CATEGORIES.items() if k in category), None)
        if not label:
            continue
        link = (item.findtext("link") or "").split("?")[0]
        if not link.startswith("https://blog.naver.com/"):
            continue
        when = email.utils.parsedate_to_datetime(item.findtext("pubDate")).astimezone(KST)
        summary = summarize(clean(item.findtext("description")))
        out.append({
            "title": clean(item.findtext("title")),
            "date": when.date().isoformat(),
            "category": label,
            "summary": summary,
            "url": link,
        })
    out.sort(key=lambda n: n["date"], reverse=True)
    return out[:MAX_NOTICES]


def self_test():
    sample = """<rss><channel>
    <item><title>10월 수업 일정 &amp; 클럽데이</title><link>https://blog.naver.com/x/1?fromRss=true</link>
      <category>학원공지</category><pubDate>Thu, 01 Oct 2026 20:00:00 +0900</pubDate>
      <description>&lt;p&gt;10월 일정입니다.&lt;/p&gt;</description></item>
    <item><title>읽을거리</title><link>https://blog.naver.com/x/2</link>
      <category>원장다이어리</category><pubDate>Fri, 02 Oct 2026 10:00:00 +0900</pubDate></item>
    <item><title>대회</title><link>https://blog.naver.com/x/3</link>
      <category>대회 안내 , 대회 후기</category><pubDate>Mon, 05 Oct 2026 00:30:00 +0900</pubDate></item>
    <item><title>다른 사이트</title><link>https://evil.example/4</link>
      <category>학원공지</category><pubDate>Mon, 05 Oct 2026 00:30:00 +0900</pubDate></item>
    </channel></rss>"""
    got = parse(sample)
    assert [n["title"] for n in got] == ["대회", "10월 수업 일정 & 클럽데이"], got
    assert got[1]["url"] == "https://blog.naver.com/x/1" and got[1]["summary"] == "10월 일정입니다."
    assert got[0]["date"] == "2026-10-05" and got[0]["category"] == "대회" and got[1]["category"] == "학원 공지"
    s = summarize("안녕하세요~ 더체스EPA 부천아카데미입니다. ^^ 오늘은 좋은 소식을 들고 왔습니다. "
                  "체스 좋아하시나요? 9월 13일(일) 오후 1시에 클럽데이를 엽니다. 많이 오세요.")
    assert s == "9월 13일(일) 오후 1시에 클럽데이를 엽니다.", s
    assert summarize("안녕하세요. 센터입니다. ♟ 체스를 배워요.") == "체스를 배워요."
    print("update_notices self-test ok")


def main():
    if "--self-test" in sys.argv:
        return self_test()
    if "--file" in sys.argv:
        xml_text = Path(sys.argv[sys.argv.index("--file") + 1]).read_text(encoding="utf-8")
    else:
        req = urllib.request.Request(SOURCE, headers={"User-Agent": "Mozilla/5.0 (homepage notices updater)"})
        with urllib.request.urlopen(req, timeout=60) as r:
            xml_text = r.read().decode("utf-8")
    notices = parse(xml_text)
    if not notices:
        raise SystemExit("공지로 고를 블로그 글이 없습니다. 기존 notices.json을 그대로 둡니다")
    data = {"updated": dt.datetime.now(KST).date().isoformat(), "notices": notices}
    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    if old.get("notices") == notices:
        print("변경 없음")
        return
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"공지 {len(notices)}개 저장")


if __name__ == "__main__":
    main()

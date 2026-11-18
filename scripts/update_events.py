"""체스퀸(chessqueen.kr) 대회 일정에서 부천에서 가기 쉬운 접수 중 대회를 골라 events.json으로 저장한다.

GitHub Actions가 매일 실행한다(.github/workflows/update-events.yml). 표준 라이브러리만 쓴다.
읽기에 실패하면 기존 events.json을 건드리지 않고 오류로 끝난다.
"""
import datetime as dt
import json
import re
import sys
import urllib.request
from pathlib import Path

SOURCE = "https://www.chessqueen.kr/"
OUT = Path(__file__).resolve().parent.parent / "events.json"
REGIONS = ("서울", "경기", "인천")          # 부천에서 다니기 쉬운 지역
MAX_EVENTS = 9
KST = dt.timezone(dt.timedelta(hours=9))


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (homepage events updater)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8")


def text(prop):
    return "".join(part[0] for part in prop) if prop else ""


def date(prop):
    for part in prop or []:
        for fmt in part[1] if len(part) > 1 else []:
            if fmt[0] == "d":
                return fmt[1]
    return None


def parse(html, today):
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
    if not m:
        raise SystemExit("체스퀸 페이지에서 데이터 블록을 찾지 못했습니다")
    rm = json.loads(m.group(1))["props"]["pageProps"]["recordMap"]

    def val(rec):
        v = rec["value"]
        return v.get("value", v)

    cid, schema = None, None
    for k, c in rm.get("collection", {}).items():
        v = val(c)
        if "체스대회" in json.dumps(v.get("name"), ensure_ascii=False):
            cid, schema = k, v["schema"]
            break
    if not cid:
        raise SystemExit("체스퀸 대회 데이터베이스를 찾지 못했습니다")
    key = {p["name"]: k for k, p in schema.items()}

    def get(props, name, kind="text"):
        p = props.get(key.get(name, ""))
        return date(p) if kind == "date" else text(p)

    events = []
    for bid, b in rm.get("block", {}).items():
        v = val(b)
        if v.get("parent_id") != cid or not v.get("alive", True):
            continue
        P = v.get("properties", {})
        name = get(P, "이름").strip()
        tags = [t.strip() for t in get(P, "태그").split(",") if t.strip()]
        status = get(P, "상태")
        place = get(P, "대회 장소")
        when = get(P, "대회날짜", "date") or {}
        due = get(P, "접수마감일", "date") or {}
        start, end = when.get("start_date"), when.get("end_date") or when.get("start_date")
        if not name or not start:
            continue
        region = next((r for r in REGIONS if r in tags), None)
        if not region and re.search(r"인천|송도", place):
            region = "인천"
        open_now = any("접수중" in t for t in tags) or ("접수" in status and "마감" not in status)
        closed = "취소" in name or "취소" in tags or re.search(r"마감|종료|취소", status)
        if not region or not open_now or closed or end < today:
            continue
        if due.get("start_date") and due["start_date"] < today:
            continue
        kind = next((k for k in ("스탠다드", "래피드", "블리츠") if k in tags), "")
        events.append({
            "start": start, "end": end, "region": region, "kind": kind, "name": name,
            "target": get(P, "참가대상"), "deadline": due.get("start_date", ""),
            "url": SOURCE + bid,
        })
    events.sort(key=lambda e: (e["start"], e["name"]))
    return events[:MAX_EVENTS]


def main():
    today = dt.datetime.now(KST).date().isoformat()
    events = parse(fetch(SOURCE), today)
    if not events:
        raise SystemExit("조건에 맞는 대회가 0개입니다. 페이지 구조가 바뀌었을 수 있어 기존 파일을 유지합니다")
    data = {"updated": today, "source": SOURCE, "events": events}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(events)}개 저장: " + ", ".join(e["name"] for e in events))


if __name__ == "__main__":
    if sys.argv[1:] == ["--self-test"]:
        sample = ('<script id="__NEXT_DATA__" type="application/json">' + json.dumps({"props": {"pageProps": {"recordMap": {
            "collection": {"c": {"value": {"name": [["체스대회 스케줄DB"]], "schema": {
                "t": {"name": "이름"}, "g": {"name": "태그"}, "s": {"name": "상태"}, "d": {"name": "대회날짜"}}}}},
            "block": {
                "a": {"value": {"parent_id": "c", "properties": {"t": [["열린 대회"]], "g": [["경기,래피드접수중,래피드"]],
                      "d": [["‣", [["d", {"start_date": "2030-01-01"}]]]]}}},
                "b": {"value": {"parent_id": "c", "properties": {"t": [["지난 대회"]], "g": [["서울,래피드접수중"]],
                      "d": [["‣", [["d", {"start_date": "2020-01-01"}]]]]}}},
                "x": {"value": {"parent_id": "c", "properties": {"t": [["부산 대회"]], "g": [["부산,래피드접수중"]],
                      "d": [["‣", [["d", {"start_date": "2030-01-01"}]]]]}}}}}}}}) + "</script>")
        got = parse(sample, "2026-11-19")
        assert [e["name"] for e in got] == ["열린 대회"], got
        assert got[0]["region"] == "경기" and got[0]["kind"] == "래피드"
        print("self-test ok")
    else:
        main()

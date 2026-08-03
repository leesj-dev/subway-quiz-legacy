#!/usr/bin/env python3
"""노선도 SVG와 노선 심볼 SVG로부터 앱이 쓰는 정적 데이터를 생성한다.

출력: src/lib/data/generated.ts

  - 호선 목록(표시 순서, 브랜드 색, 역 개수)
  - 역별 호선 비트마스크 → 호선을 켜고 끌 때 총 문제 수를 정확히 계산하는 용도
  - 노선 심볼(동그라미) 인라인 SVG 마크업

심볼 SVG는 `<style>`의 .cls-N 규칙에 색이 들어 있어 한 페이지에 여러 개를 인라인하면
class 이름이 충돌한다. 그래서 style 규칙을 각 요소의 fill 속성으로 펼쳐서 내보낸다.

한 번만 돌리면 되고 결과물은 저장소에 커밋된다:

    python3 scripts/gen_map_data.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAPS = ROOT / "public" / "maps"
CIRCLE_SRC = {
    "seoul": ROOT / "assets" / "circles" / "seoul",
    "busan": ROOT / "assets" / "circles" / "busan",
}
OUT = ROOT / "src" / "lib" / "data" / "generated.ts"

# 노선도 위 순서와 무관하게, 화면에 보여줄 순서를 여기서 고정한다.
LINE_ORDER = {
    "seoul": [
        "1호선", "2호선", "3호선", "4호선", "5호선", "6호선", "7호선", "8호선", "9호선",
        "경강선", "경의·중앙선", "경춘선", "공항철도", "김포골드라인", "서해선",
        "수인·분당선", "신림선", "신분당선", "에버라인", "우이신설선", "의정부경전철",
        "인천1호선", "인천2호선", "GTX-A",
    ],
    "busan": ["1호선", "2호선", "3호선", "4호선", "부산김해경전철", "동해선"],
}

# 가운뎃점(·)이 든 역명은 온점이나 생략 입력도 정답으로 인정한다.
def cdot_aliases(station_ids: list[str]) -> dict[str, str]:
    aliases: dict[str, str] = {}
    for name in station_ids:
        if "·" not in name:
            continue
        aliases[name.replace("·", ".")] = name
        aliases[name.replace("·", "")] = name
    return aliases


def parse_stations(svg: str) -> list[tuple[str, list[str]]]:
    """`class="station 1호선 4호선"` 텍스트에서 (역 id, 호선 목록)을 뽑는다."""
    out: list[tuple[str, list[str]]] = []
    for tag in re.finditer(r"<text\b[^>]*>", svg):
        attrs = tag.group(0)
        cls = re.search(r'class="([^"]*)"', attrs)
        sid = re.search(r'id="([^"]*)"', attrs)
        if not cls or not sid or "station" not in cls.group(1).split():
            continue
        lines = [c for c in cls.group(1).split() if c != "station"]
        out.append((sid.group(1), lines))
    return out


def flatten_circle(path: Path) -> tuple[str, str, str]:
    """심볼 SVG를 (viewBox, 브랜드 색, style 없는 inner 마크업)으로 바꾼다."""
    svg = path.read_text(encoding="utf-8")

    view_box = re.search(r'viewBox="([^"]*)"', svg)
    view_box = view_box.group(1) if view_box else "0 0 25.7 25.7"

    # .cls-N { fill: #xxx } 규칙 수집
    fills: dict[str, str] = {}
    style_block = re.search(r"<style>(.*?)</style>", svg, re.S)
    if style_block:
        body = style_block.group(1)
        for rule in re.finditer(r"([^{}]+)\{([^}]*)\}", body):
            selectors = [s.strip() for s in rule.group(1).split(",")]
            fill = re.search(r"fill:\s*([^;]+);", rule.group(2))
            if not fill:
                continue
            for sel in selectors:
                if sel.startswith("."):
                    fills[sel[1:]] = fill.group(1).strip()

    inner = re.sub(r"<defs>.*?</defs>", "", svg, flags=re.S)
    inner = re.sub(r"^.*?<svg[^>]*>", "", inner, flags=re.S)
    inner = re.sub(r"</svg>\s*$", "", inner, flags=re.S)

    # class="cls-N" → fill="#xxx" (인라인 시 class 충돌 방지)
    def swap(m: re.Match[str]) -> str:
        names = m.group(1).split()
        color = next((fills[n] for n in names if n in fills), None)
        return f'fill="{color}"' if color else ""

    inner = re.sub(r'class="([^"]*)"', swap, inner)
    inner = re.sub(r"\s+", " ", inner).strip()

    # 첫 번째로 칠해지는 도형이 동그라미 배경 = 그 호선의 브랜드 색.
    brand = re.search(r'fill="([^"]*)"', inner)
    return view_box, (brand.group(1) if brand else "#888888"), inner


def ts_literal(value) -> str:
    return json.dumps(value, ensure_ascii=False)


def build_region(region: str) -> str:
    svg = (MAPS / f"{region}.svg").read_text(encoding="utf-8")
    stations = parse_stations(svg)
    order = LINE_ORDER[region]

    found = {ln for _, lines in stations for ln in lines}
    if found != set(order):
        raise SystemExit(
            f"[{region}] 호선 목록 불일치\n  SVG에만: {sorted(found - set(order))}\n"
            f"  목록에만: {sorted(set(order) - found)}"
        )

    index = {name: i for i, name in enumerate(order)}
    masks = [sum(1 << index[ln] for ln in lines) for _, lines in stations]
    counts = [sum(1 for m in masks if m & (1 << i)) for i in range(len(order))]

    lines_ts = []
    for i, name in enumerate(order):
        view_box, color, inner = flatten_circle(CIRCLE_SRC[region] / f"{name}.svg")
        lines_ts.append(
            "  {\n"
            f"    id: {ts_literal(name)},\n"
            f"    color: {ts_literal(color)},\n"
            f"    stationCount: {counts[i]},\n"
            f"    viewBox: {ts_literal(view_box)},\n"
            f"    symbol: {ts_literal(inner)},\n"
            "  },"
        )

    ids = [sid for sid, _ in stations]
    upper = region.upper()
    return "\n".join(
        [
            f"export const {upper}_LINES: LineMeta[] = [",
            *lines_ts,
            "];",
            "",
            f"/** {upper}_LINES 순서의 비트마스크. 켠 호선 조합의 총 역 수를 셀 때 쓴다. */",
            f"export const {upper}_STATION_MASKS: number[] = {ts_literal(masks)};",
            "",
            f"/** 가운뎃점 생략/온점 입력 허용. */",
            f"export const {upper}_ALIASES: Record<string, string> = "
            f"{ts_literal(cdot_aliases(ids))};",
        ]
    )


def main() -> None:
    body = "\n\n".join(build_region(r) for r in ("seoul", "busan"))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "// 이 파일은 scripts/gen_map_data.py 가 생성합니다. 직접 고치지 마세요.\n"
        "// 노선도 SVG나 심볼이 바뀌면 스크립트를 다시 실행하세요.\n\n"
        "export type LineMeta = {\n"
        "  /** SVG 안의 호선 class 이름이자 화면 표시 이름. */\n"
        "  id: string;\n"
        "  /** 노선 심볼 배경색. 진행도·플레이어 강조색으로도 쓴다. */\n"
        "  color: string;\n"
        "  stationCount: number;\n"
        "  viewBox: string;\n"
        "  /** <svg> 안에 그대로 넣는 마크업. class 없이 fill 속성만 남아 있다. */\n"
        "  symbol: string;\n"
        "};\n\n" + body + "\n",
        encoding="utf-8",
    )
    print(f"{OUT.relative_to(ROOT)} 생성 완료")


if __name__ == "__main__":
    main()

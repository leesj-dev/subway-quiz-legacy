#!/usr/bin/env python3
"""부산 노선도 SVG를 수도권 노선도와 같은 class 구조로 정규화한다.

수도권 SVG(seoul.svg)는 이미 아래 규약을 따른다:

    .line <호선>          노선 전체를 감싸는 그룹 (확대 시 bbox 기준)
    .mark                 역 위치를 나타내는 눈금 (on/off 대상)
    .transfer             환승역 심볼 그룹
    .fill <호선>          환승역 심볼 안의 호선별 색 조각
    .transferFill         환승역 심볼의 흰 배경
    .transferBorder       환승역 심볼의 테두리
    .station <호선...>    역명 텍스트 (id = 역명, visibility=hidden)

부산 SVG는 id 기반(`라인_1호선`, `역_1호선`, `환승역_동래`, `라벨_1호선`)이라
게임 엔진이 그대로 쓸 수 없다. 이 스크립트가 그 간극을 메운다.

한 번만 돌리면 되고 결과물은 저장소에 커밋된다:

    python3 scripts/normalize_busan_svg.py
"""

from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SVG_NS = "http://www.w3.org/2000/svg"
NS = f"{{{SVG_NS}}}"

TARGET = Path(__file__).resolve().parent.parent / "public" / "maps" / "busan.svg"

# 환승역 심볼은 class 없이 fill 색만 가지고 있어서 색 → 호선으로 되짚는다.
COLOR_TO_LINE = {
    "#F0602F": "1호선",
    "#3CB44A": "2호선",
    "#D4A556": "3호선",
    "#426FB5": "4호선",
    "#80499C": "부산김해경전철",
    "#80A8D8": "동해선",
}
TRANSFER_BORDER = "#1D1D1B"
TRANSFER_FILL = "#FFFFFF"


def add_class(el: ET.Element, *names: str) -> None:
    existing = (el.get("class") or "").split()
    for name in names:
        if name not in existing:
            existing.append(name)
    el.set("class", " ".join(existing))


def main() -> int:
    ET.register_namespace("", SVG_NS)
    ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")

    tree = ET.parse(TARGET)
    root = tree.getroot()

    stats = {"line": 0, "mark": 0, "transfer": 0, "fill": 0, "station": 0}

    # 흰 배경 사각형이 viewBox보다 훨씬 커서(4081×3318 vs 3081×2718) 그려진 내용의
    # bounding box를 부풀린다. 확대/맞춤 계산이 어긋나므로 없앤다.
    # 노선도가 앉는 면은 어차피 페이지 쪽에서 칠한다.
    for bg in [g for g in root if (g.get("id") or "") == "bg_color"]:
        root.remove(bg)
        stats["bg_removed"] = True

    for group in root.iter(NS + "g"):
        gid = group.get("id") or ""

        # 1) 노선 그룹: 노선 path + 역 눈금 + 노선 번호 데코레이션을 모두 품는다.
        if gid.startswith("라인_"):
            add_class(group, "line", gid[len("라인_") :])
            stats["line"] += 1

        # 2) 역 눈금: 노선 위의 작은 원. '역 눈금 표시' 토글 대상.
        elif gid.startswith("역_"):
            for circle in group:
                add_class(circle, "mark")
                stats["mark"] += 1

        # 3) 환승역 심볼: 테두리 / 흰 배경 / 호선별 색 조각.
        elif gid.startswith("환승역_"):
            add_class(group, "transfer")
            stats["transfer"] += 1
            for path in group:
                fill = (path.get("fill") or "").upper()
                if fill == TRANSFER_BORDER:
                    add_class(path, "transferBorder")
                elif fill == TRANSFER_FILL:
                    add_class(path, "transferFill")
                elif fill in COLOR_TO_LINE:
                    add_class(path, "fill", COLOR_TO_LINE[fill])
                    stats["fill"] += 1
                else:
                    print(f"  ! 알 수 없는 환승역 색 {fill} ({gid})", file=sys.stderr)

        # 4) 역명 텍스트: 이미 호선 class를 가지고 있으므로 'station'만 얹는다.
        elif gid.startswith("라벨_"):
            for text in group:
                if text.tag == NS + "text":
                    add_class(text, "station")
                    stats["station"] += 1

    tree.write(TARGET, encoding="utf-8", xml_declaration=True)
    print(f"{TARGET.relative_to(Path.cwd())} 정규화 완료: {stats}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

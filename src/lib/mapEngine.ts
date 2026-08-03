import type { Region } from "@/lib/regions";

const FULL = "1";
/** 게임에서 빠진 호선. 지도에 남겨두되 확실히 뒤로 물린다. */
const EXCLUDED_OPACITY = "0.07";
const GIVE_UP_FILL = "#dc2626";

export type MapEngineHandle = Awaited<ReturnType<typeof createMapEngine>>;

export type StationHit = {
  /** SVG 안의 실제 element id. `역명_호선` 형태일 수 있다. */
  id: string;
  /** 그 역이 지나는 모든 호선. 환승역이면 여러 개. */
  lines: string[];
};

/**
 * 슬라이더 값(0~100)을 비선택 호선의 투명도로. 낮은 쪽 해상도를 넓게 쓰려고 비선형.
 * 기존 버전과 같은 곡선을 유지했다.
 */
export function sliderToOpacity(sliderValue: number) {
  return Math.min(1, sliderValue ** 1.5 / 1000);
}

function isRevealed(el: Element) {
  return el.getAttribute("visibility") === "visible";
}

/**
 * 노선도 SVG를 조작하는 얇은 레이어. React를 모르고, DOM만 안다.
 *
 * 두 노선도(수도권/부산)는 scripts/normalize_busan_svg.py 로 같은 class 규약을 쓴다:
 * `.line <호선>` / `.mark` / `.transfer` / `.fill <호선>` / `.station <호선...>`
 */
export async function createMapEngine(
  svg: SVGSVGElement,
  region: Region,
  enabledLines: readonly string[],
) {
  // svg-pan-zoom은 불러오는 순간 window를 만진다. 서버 렌더에 걸리지 않게 여기서 가져온다.
  const { default: svgPanZoom } = await import("svg-pan-zoom");

  const doc = svg.ownerDocument;
  const enabled = new Set(enabledLines);

  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.maxWidth = "100%";

  const stations = Array.from(
    doc.getElementsByClassName("station"),
  ) as SVGElement[];
  const marks = Array.from(doc.getElementsByClassName("mark")) as SVGElement[];
  const transfers = Array.from(
    doc.getElementsByClassName("transfer"),
  ) as SVGElement[];

  const linesOf = (el: Element) =>
    Array.from(el.classList).filter((c) => c !== "station");

  /** 켠 호선이 하나도 안 지나는 역 = 이번 판에서 출제되지 않는 역. */
  const inPlay = new Map<string, boolean>();
  for (const el of stations) {
    inPlay.set(el.id, linesOf(el).some((l) => enabled.has(l)));
  }

  /**
   * 호선별 "투명도를 건드릴 최상위 요소"들.
   *
   * 같은 class가 조상과 자손에 동시에 붙어 있으면(부산은 노선 그룹 안에 색 조각이 들어 있다)
   * 양쪽에 opacity를 주는 순간 값이 곱해져 슬라이더 값과 실제 농도가 어긋난다.
   * 그래서 조상이 이미 목록에 있는 요소는 뺀다.
   *
   * 역명 텍스트는 여기서 제외한다 — 한 번 맞힌 답은 어느 호선을 보고 있든 또렷해야 한다.
   */
  const lineRoots = new Map<string, SVGElement[]>();
  for (const { id } of region.lines) {
    const all = (Array.from(doc.getElementsByClassName(id)) as SVGElement[])
      .filter((el) => !el.classList.contains("station"));
    const set = new Set<Element>(all);
    lineRoots.set(
      id,
      all.filter((el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          if (set.has(p)) return false;
        }
        return true;
      }),
    );
  }

  const excludedLines = region.lines
    .map((l) => l.id)
    .filter((id) => !enabled.has(id));

  let selected: string | null = null;
  let dimOpacity = sliderToOpacity(30);
  let showTransferColors = true;
  let zoomOnSelect = true;

  const setOpacity = (els: readonly SVGElement[], value: string) => {
    for (const el of els) el.style.opacity = value;
  };

  const opacityFor = (lineId: string) =>
    !enabled.has(lineId)
      ? EXCLUDED_OPACITY
      : selected === null || selected === lineId
        ? FULL
        : String(dimOpacity);

  /**
   * 환승역 심볼은 조각마다 호선이 달라서 따로 계산한다.
   * - 선택한 호선이 지나는 환승역이면 심볼 전체를 살린다.
   * - '환승역 타 노선 색 표시'가 꺼져 있으면 그 안의 다른 호선 조각만 다시 죽인다.
   */
  const applyTransfers = () => {
    for (const station of transfers) {
      const children = Array.from(station.children) as SVGElement[];
      const onSelected =
        selected !== null && station.getElementsByClassName(selected).length > 0;
      setOpacity(
        children,
        selected === null || onSelected ? FULL : String(dimOpacity),
      );

      if (selected !== null && onSelected && !showTransferColors) {
        setOpacity(
          children.filter(
            (c) => c.classList.contains("fill") && !c.classList.contains(selected!),
          ),
          String(dimOpacity),
        );
      }

      // 빠진 호선 조각은 선택과 무관하게 계속 뒤에 있어야 한다.
      for (const line of excludedLines) {
        setOpacity(
          children.filter((c) => c.classList.contains(line)),
          EXCLUDED_OPACITY,
        );
      }
    }
  };

  const applyLines = () => {
    for (const { id } of region.lines) {
      setOpacity(lineRoots.get(id) ?? [], opacityFor(id));
    }
    applyTransfers();
  };

  // ── pan & zoom ──────────────────────────────────────────────────────────
  let pz: SvgPanZoom.Instance | null = null;

  /** 노선도가 화면 밖으로 완전히 빠져나가지 않게 패닝 범위를 묶는다. */
  const clampPan = (_old: SvgPanZoom.Point, next: SvgPanZoom.Point) => {
    if (!pz) return next;
    const sizes = pz.getSizes();
    const gutterX = sizes.width / 4;
    const gutterY = sizes.height / 4;
    const left = gutterX - (sizes.viewBox.x + sizes.viewBox.width) * sizes.realZoom;
    const right = sizes.width - gutterX - sizes.viewBox.x * sizes.realZoom;
    const top = gutterY - (sizes.viewBox.y + sizes.viewBox.height) * sizes.realZoom;
    const bottom = sizes.height - gutterY - sizes.viewBox.y * sizes.realZoom;
    return {
      x:
        left < 0
          ? Math.max(left, Math.min(right, next.x))
          : Math.min(left, Math.max(right, next.x)),
      y:
        top < 0
          ? Math.max(top, Math.min(bottom, next.y))
          : Math.min(top, Math.max(bottom, next.y)),
    };
  };

  const panZoom = svgPanZoom(svg, {
    panEnabled: true,
    zoomEnabled: true,
    dblClickZoomEnabled: false,
    mouseWheelZoomEnabled: true,
    controlIconsEnabled: false,
    fit: true,
    center: true,
    minZoom: 1,
    maxZoom: 8,
    zoomScaleSensitivity: 0.25,
    beforePan: clampPan,
  });
  pz = panZoom;

  /** 선택한 호선이 화면을 꽉 채우도록 이동 + 확대. */
  const focusLine = (lineId: string) => {
    const node = doc.getElementsByClassName(`line ${lineId}`)[0] as
      | SVGGraphicsElement
      | undefined;
    if (!node) return;

    let bbox: DOMRect;
    try {
      bbox = node.getBBox();
    } catch {
      return;
    }
    if (!bbox.width || !bbox.height) return;

    // clampPan이 중간 상태를 막아버리므로 잠시 풀어둔다.
    // (라이브러리는 null을 받아 해제하지만 타입 선언에 빠져 있다.)
    panZoom.setBeforePan(null as unknown as typeof clampPan);
    const { width, height, realZoom } = panZoom.getSizes();
    panZoom.pan({
      x: -realZoom * (bbox.x - width / (realZoom * 2) + bbox.width / 2),
      y: -realZoom * (bbox.y - height / (realZoom * 2) + bbox.height / 2),
    });
    const padding = 200; // 노선 양옆 여유
    panZoom.zoom(
      panZoom.getZoom() *
        Math.min(
          width / ((bbox.width + padding) * realZoom),
          height / ((bbox.height + padding) * realZoom),
        ),
    );
    panZoom.setBeforePan(clampPan);
  };

  applyLines();

  return {
    destroy() {
      try {
        panZoom.destroy();
      } catch {
        /* 문서가 이미 사라진 경우 */
      }
    },

    resize() {
      panZoom.resize();
      panZoom.updateBBox();
      panZoom.fit();
      panZoom.center();
    },

    zoomIn: () => panZoom.zoomIn(),
    zoomOut: () => panZoom.zoomOut(),
    resetZoom: () => {
      panZoom.reset();
      panZoom.fit();
      panZoom.center();
    },

    setMarksVisible(visible: boolean) {
      for (const m of marks) m.style.display = visible ? "" : "none";
    },

    setDimOpacity(slider: number) {
      dimOpacity = sliderToOpacity(slider);
      applyLines();
    },

    setTransferColors(on: boolean) {
      showTransferColors = on;
      applyTransfers();
    },

    setZoomOnSelect(on: boolean) {
      zoomOnSelect = on;
    },

    selectLine(lineId: string | null) {
      selected = lineId && enabled.has(lineId) ? lineId : null;
      applyLines();
      if (selected && zoomOnSelect) focusLine(selected);
    },

    focusSelected() {
      if (selected && zoomOnSelect) focusLine(selected);
    },

    /** 입력 후보들 중 해당 호선에 실제로 존재하고 아직 안 맞힌 역을 찾는다. */
    findStation(candidateIds: readonly string[], line: string) {
      for (const id of candidateIds) {
        const el = doc.getElementById(id);
        if (!el || !el.classList.contains(line)) continue;
        if (!inPlay.get(id)) continue;
        return { id, lines: linesOf(el), revealed: isRevealed(el) };
      }
      return null;
    },

    /** 정답 처리. color를 주면 그 색으로 칠한다(땅따먹기에서 차지한 사람 색). */
    reveal(id: string, color?: string) {
      const el = doc.getElementById(id) as SVGElement | null;
      if (!el) return;
      el.setAttribute("visibility", "visible");
      el.style.opacity = FULL;
      if (color) el.setAttribute("fill", color);
      else el.removeAttribute("fill");
    },

    /** 게임 종료 — 못 맞힌 역을 빨갛게 드러낸다. 빠진 호선의 역은 건드리지 않는다. */
    revealMissed() {
      for (const el of stations) {
        if (isRevealed(el) || !inPlay.get(el.id)) continue;
        el.setAttribute("fill", GIVE_UP_FILL);
        el.setAttribute("visibility", "visible");
        el.style.opacity = FULL;
      }
    },

    resetAnswers() {
      for (const el of stations) {
        el.setAttribute("visibility", "hidden");
        el.removeAttribute("fill");
        el.style.opacity = "";
      }
    },
  };
}

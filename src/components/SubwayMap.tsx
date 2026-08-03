"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";

import { createMapEngine, type MapEngineHandle } from "@/lib/mapEngine";
import type { Region } from "@/lib/regions";
import { cn } from "@/lib/utils";

/**
 * 노선도는 <object>로 따로 문서에 띄운다.
 * 큰 SVG를 페이지 HTML에 인라인하지 않아도 되고, 브라우저 캐시도 그대로 탄다.
 */
export function SubwayMap({
  region,
  enabledLines,
  onReady,
  className,
}: {
  region: Region;
  enabledLines: readonly string[];
  onReady: (engine: MapEngineHandle) => void;
  className?: string;
}) {
  const objectRef = useRef<HTMLObjectElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngineHandle | null>(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const object = objectRef.current;
    if (!object) return;

    let disposed = false;

    const boot = async () => {
      const svg = object.contentDocument?.querySelector("svg");
      if (disposed || !svg) return;
      const engine = await createMapEngine(svg as SVGSVGElement, region, enabledLines);
      if (disposed) {
        engine.destroy();
        return;
      }
      engineRef.current = engine;
      setLoaded(true);
      onReadyRef.current(engine);
    };

    const onLoad = () => void boot();

    // 캐시에서 즉시 올라오면 load 이벤트를 이미 놓쳤을 수 있다.
    if (object.contentDocument?.querySelector("svg")) void boot();
    else object.addEventListener("load", onLoad);

    return () => {
      disposed = true;
      object.removeEventListener("load", onLoad);
      engineRef.current?.destroy();
      engineRef.current = null;
    };
    // enabledLines는 판이 시작될 때 확정된다. 바뀌면 key로 통째 remount된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  // 패널이 열리고 닫히거나 창이 바뀌면 노선도를 다시 맞춘다.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => engineRef.current?.resize());
    });
    observer.observe(wrap);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative overflow-hidden rounded-lg border border-paper-border bg-paper",
        className,
      )}
    >
      <object
        ref={objectRef}
        data={region.mapUrl}
        type="image/svg+xml"
        aria-label={`${region.label} 도시철도 노선도`}
        className="block size-full"
      />

      {!loaded ? (
        <div className="absolute inset-0 grid place-items-center text-sm text-neutral-500">
          노선도를 불러오는 중…
        </div>
      ) : null}

      <div className="absolute right-2 bottom-2 flex flex-col gap-1">
        <ZoomButton label="확대" onClick={() => engineRef.current?.zoomIn()}>
          <Plus className="size-4" />
        </ZoomButton>
        <ZoomButton label="축소" onClick={() => engineRef.current?.zoomOut()}>
          <Minus className="size-4" />
        </ZoomButton>
        <ZoomButton
          label="원래 크기"
          onClick={() => engineRef.current?.resetZoom()}
        >
          <Maximize2 className="size-3.5" />
        </ZoomButton>
      </div>
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid size-8 place-items-center rounded-md border border-neutral-300/70 bg-white/85",
        "text-neutral-700 shadow-xs backdrop-blur transition-colors hover:bg-white active:translate-y-px",
      )}
    >
      {children}
    </button>
  );
}

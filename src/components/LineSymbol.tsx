import type { LineMeta } from "@/lib/data/generated";
import { cn } from "@/lib/utils";

/**
 * 노선 동그라미. 원본 심볼 아트워크를 그대로 인라인한다.
 * (호선 이름을 따로 라벨로 달지 않는 게 이 게임의 규칙이다 — 심볼만 보고 골라야 한다.)
 */
export function LineSymbol({
  line,
  className,
}: {
  line: LineMeta;
  className?: string;
}) {
  return (
    <svg
      viewBox={line.viewBox}
      role="img"
      aria-label={line.id}
      className={cn("block size-full", className)}
      dangerouslySetInnerHTML={{ __html: line.symbol }}
    />
  );
}

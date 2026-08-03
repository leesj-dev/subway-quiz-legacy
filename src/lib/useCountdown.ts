"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 끝나는 시각(에폭 ms) 기준으로 남은 초를 센다.
 *
 * setInterval로 1초씩 빼면 탭이 백그라운드로 갔다 오는 순간 시간이 어긋난다.
 * 항상 현재 시각과의 차이를 다시 계산해서 그 문제를 피한다.
 */
export function useCountdown(endsAt: number | null, onEnd?: () => void) {
  const [remaining, setRemaining] = useState(() =>
    endsAt === null ? 0 : Math.max(0, (endsAt - Date.now()) / 1000),
  );
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  });

  useEffect(() => {
    if (endsAt === null) return;

    let fired = false;
    const tick = () => {
      const left = Math.max(0, (endsAt - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0 && !fired) {
        fired = true;
        onEndRef.current?.();
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [endsAt]);

  return remaining;
}

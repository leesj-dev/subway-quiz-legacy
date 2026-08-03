"use client";

import { Moon, Sun } from "lucide-react";

/**
 * 현재 테마를 리액트 상태로 들고 있지 않는다.
 * 아이콘은 CSS(dark:)로 갈리고 버튼은 html 클래스만 뒤집는다 —
 * 그래야 서버 렌더와 어긋날 여지가 없다.
 */
export function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="테마 전환"
      onClick={() => {
        const dark = document.documentElement.classList.toggle("dark");
        localStorage.setItem("sq:theme", dark ? "dark" : "light");
      }}
      className="fixed top-2.5 right-2.5 z-30 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </button>
  );
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

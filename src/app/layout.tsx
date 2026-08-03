import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";

import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

/** 시계·점수·방 코드처럼 자리가 흔들리면 안 되는 숫자와 코드 전용. */
const monoDigits = JetBrains_Mono({
  variable: "--font-mono-digits",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "지하철 노선도 퀴즈",
  description:
    "수도권·부산 도시철도 노선도를 보고 역 이름을 맞히는 퀴즈. 혼자서도, 둘이서도.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%2210 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚇</text></svg>",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1c20" },
  ],
};

/**
 * 테마는 첫 페인트 전에 정해져야 깜빡이지 않는다.
 * 리액트가 붙기 전에 돌도록 head에 인라인으로 넣는다.
 */
const THEME_BOOTSTRAP = `
(function(){try{
  var saved = localStorage.getItem('sq:theme');
  var dark = saved ? saved === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={monoDigits.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="antialiased">
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}

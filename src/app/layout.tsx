import type { Metadata, Viewport } from "next";
import { Jua } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";
import { Providers } from "./providers";

// Pretendard 가변 폰트를 자체 호스팅한다 (홈 LAN에서도 외부 요청 없음).
const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  weight: "45 920",
  display: "swap",
  variable: "--font-pretendard",
});

// 제목·타일 이름용 둥근 디스플레이 서체 (빌드 때 내려받아 자체 호스팅된다).
const jua = Jua({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jua",
});

// 하단 탭이 홈 인디케이터 영역(safe-area)을 쓰도록 화면 끝까지 채운다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Matter Home",
  description: "Raspberry Pi Matter/Thread 홈 IoT 기기 관리",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${jua.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

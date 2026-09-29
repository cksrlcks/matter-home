import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 배포용 최소 런타임 번들
  output: "standalone",
  // 네이티브/동적 require가 있는 패키지는 번들하지 않고 런타임 node_modules에서 로드한다.
  serverExternalPackages: ["ws", "postgres"],
  // SmartThings 화면이 기기관리 하위로 이동 (기존 북마크 호환)
  async redirects() {
    return [
      {
        source: "/smartthings/:path*",
        destination: "/devices/smartthings/:path*",
        permanent: true,
      },
    ];
  },
  // 운영에서는 Traefik이 /go2rtc/* 를 go2rtc로 보낸다. 로컬 dev에서는 Next가 대신 프록시한다(WebSocket 포함).
  // go2rtc는 base_path가 /go2rtc 이므로 경로를 그대로 넘긴다.
  async rewrites() {
    const go2rtc = process.env.GO2RTC_DEV_URL;
    if (process.env.NODE_ENV !== "development" || !go2rtc) return [];
    return [{ source: "/go2rtc/:path*", destination: `${go2rtc}/go2rtc/:path*` }];
  },
};

export default nextConfig;

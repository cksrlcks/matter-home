import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 배포용 최소 런타임 번들
  output: "standalone",
  // 네이티브/동적 require가 있는 패키지는 번들하지 않고 런타임 node_modules에서 로드한다.
  serverExternalPackages: ["ws", "postgres"],
};

export default nextConfig;

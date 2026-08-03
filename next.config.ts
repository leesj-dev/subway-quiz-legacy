import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 폴더에도 lockfile이 있어서 워크스페이스 루트를 잘못 잡는 걸 막는다.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;

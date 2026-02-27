import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 将 build 时的环境变量传入 SSR runtime（Amplify WEB_COMPUTE 需要）
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    SITE_PASSCODE: process.env.SITE_PASSCODE,
  },
};

export default nextConfig;

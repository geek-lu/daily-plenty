/** [INPUT]: Next.js 运行阶段、ECS 小内存构建开关。[OUTPUT]: 独立输出目录、可选单构建 worker 与响应头。[POS]: 应用构建边界。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
const config: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  ...(process.env.DAILY_PLENTY_LOW_MEMORY_BUILD === 'true' ? { experimental: { cpus: 1 } } : {}),
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingIncludes: { '/*': ['./migrations/*.sql'] },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
// 开发服务与生产验证使用不同目录，避免 build 覆盖正在使用的开发路由。
export default (phase: string): NextConfig => ({
  ...config,
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next' : '.next-build',
});

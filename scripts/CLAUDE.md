# scripts/

> L2 | 父级: ../CLAUDE.md

成员清单

- configure.mjs：可选补充服务端初始化密钥与数据库路径，保留已有配置；会话使用独立随机令牌和数据库摘要；用户不直接接触初始化密钥，应用启动不依赖此脚本。
- configure.test.mjs：临时目录验证配置补全、重复执行、已有路径与密钥保留。
- migrate.ts：执行已校验迁移。
- backup.ts：生成 SQLite 一致性备份。
- check-architecture.mjs：使用 TypeScript AST 检查导入边界、循环依赖、文件契约和 if/else 花括号。
- check-routes.mjs：生产构建的 Next 路由冒烟检查，覆盖登录、分类、模板、邀请和账单；根据 DAILY_PLENTY_ALLOW_HTTP 检查 HTTP/HTTPS 的会话与退出 Cookie，不监听端口，只用内存数据库。

check-routes 包含删除原因遗漏、其他说明空白的 400 响应及成功删除后的原因字段校验。

check-routes 同时验证 /records 页面 200、高级查询与 CSV 路径、精确金额汇总、空结果、非法区间 400、删除后刷新及未登录 401。

check-routes 验证 /、/reports、/records、/together 均返回 200，认证完成前的 HTML 加载占位不含业务底栏；功能 API 继续在内存库验证。

check-routes 验证未认证的初始 HTML 不包含「记一笔」按钮；认证就绪后的四入口和唯一记账按钮由 frontend/navigation.test.ts 检查。
check-routes 验证 reports 日/月/年真实接口的整数金额、补零和全量汇总，非法维度/日期 400、跨账本 403、未登录 401，以及删除后的趋势刷新。

check-routes 额外检查安装清单、四个 PNG、Apple 元数据、离线页及 /sw.js 禁缓存响应头；捕获断言失败并设置非零退出码，避免 Next 异常处理掩盖检查失败。
四页 HTML 同时验证 maximum-scale=1 与 user-scalable=no 的 viewport 输出。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

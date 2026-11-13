# 日日有余 · Daily Plenty

两人共享记账网页。Next.js 15.5.3 + React 19.1 + TypeScript 5.9 + Tailwind CSS 4 + Zod + Drizzle + SQLite。Node.js 单实例，人民币金额按整数分保存。

## 目录与职责

```text
daily-plenty/
├── src/
│   ├── app/          四个业务路由、初始化/邀请入口、布局、薄 API 适配
│   ├── features/     home / reports / records / together 独立页面
│   │                 shell 共享会话导航，entry 全局抽屉，ledger 共用录入和数据能力
│   ├── server/       http 路由表 → flows 跨域协调 → user/auth/ledger 服务 → db
│   ├── shared/       类型、金额、日期、分类图标、删除原因及输入校验
│   └── ui/           声明式动效、触摸手势与浏览器下载适配
├── migrations/       0001–0006 已发布迁移，禁止改动已应用 SQL 内容
├── tests/            服务/HTTP 回归，frontend/ 表单重试与导航回归
├── scripts/          迁移/备份/可选配置、架构和生产路由检查
├── deploy/           Alibaba Cloud Linux 3 发布、访问模式配置、systemd、备份
└── docs/             DESIGN、REFACTOR、HISTORY 与离线 HTML 评审
```

关键配置：package.json 定义命令与固定依赖；pnpm-lock.yaml 锁定版本；pnpm-workspace.yaml 许可 SQLite 原生构建；next.config.ts 分离开发/生产输出；tsconfig.json 开启严格类型与未使用声明检查；.prettierrc.json/.prettierignore 管理维护文件格式，排除生成物和 SQL 迁移。

## 边界

- 四页固定为 `/`、`/reports`、`/records`、`/together`。底栏属于共享布局，“记一笔”打开全局抽屉，不切页。MUJI 简约风格、手机安全区和键盘适配继续由现有样式负责。
- UI → runtime → commands/api；金额、表单映射等纯规则不依赖 React。`ledger/editor` 共用表单、提交锁和请求身份，页面只协调开关、提示与刷新。
- App API → http/router → account/ledger 路由表 → flows/service → repo → SQLite。HTTP 统一解析 JSON 和会话；服务重新校验权限与数据；跨 user/auth/ledger 的账号创建和邀请加入由 flows 协调事务。
- User / Ledger / Membership 多对多；Category 属于账本，Template 属于用户和账本。查询不得泄露另一位成员的个人模板；历史关联与软删除保留财务数据。
- 账单写入使用 requestId 幂等、version 防覆盖。失败的同内容请求重用编号，成功后开启新操作。删除必须记录原因，其他原因要求说明。
- 日/月/年统计完整聚合，明细分页不截断汇总和导出；两种 CSV 共用编码与公式注入防护。
- 页面由 React 状态与 CSS 渲染，禁止手工创建/移除界面节点及修改 innerHTML/classList/style。焦点、滚动、下载为必要浏览器适配；离线原型脚本仅作历史评审。

## 运行与检查

`pnpm install --frozen-lockfile && pnpm dev`，打开 `/setup` 创建首个账号。初始化密钥服务端自动管理，密码至少 6 位；会话使用独立随机令牌，不依赖 SESSION_SECRET。可选 `pnpm configure` 只补缺项，不覆盖已有数据库路径。

```bash
pnpm format:check
pnpm check:architecture
pnpm check
pnpm test
pnpm test:scripts
DAILY_PLENTY_LOW_MEMORY_BUILD=true NODE_OPTIONS=--max-old-space-size=1280 pnpm build
pnpm check:routes
```

开发输出 `.next/`，生产 `.next-build/`。ECS 为 2 核/2 GiB、无域名，按用户选择默认通过公网 HTTP 0.0.0.0:3000 访问；部署显式启用 DAILY_PLENTY_ALLOW_HTTP，应用未配置时仍默认 Secure Cookie。ACCESS_MODE=tunnel/https 可切回本机监听；真实部署步骤见 deploy/README.md。

## 维护与验证

文件新增/移动同步模块 CLAUDE.md，业务文件保留 INPUT/OUTPUT/POS/PROTOCOL。按职责拆分组件和函数，避免压缩控制流、重复校验与无必要的通用抽象。格式、类型和架构检查属于维护入口。

2026-11-12 整改：统一格式和显式 if/else 块，抽取公共录入与 CSV，拆分 API 路由/账号流程、筛选面板/结果区、模板组件和邀请视图/runtime；配置脚本保留已有设置；更新地图和离线 HTML。33 项应用测试、3 项脚本测试、严格类型、生产构建与真实 Next 路由检查通过；具体证据与未完成验证见 docs/REFACTOR.md。

历史变更记录迁入 docs/HISTORY.md。未触碰用户数据库或执行远程部署。

新增 public/ 桌面图标、Service Worker 与断网提示；src/ui/pwa 提供全局安装事件和「我们」页安装入口，app/manifest.ts 输出安装清单。缓存仅含公共离线说明，财务数据不缓存；手机完整安装需可访问的 HTTPS 地址。本轮 36 项应用测试、3 项脚本测试、类型/架构/格式、生产构建与路由检查通过；实机边界见 docs/PWA.md。

Makefile 为本机部署入口：make deploy 串联打包/上传/准备/发布，make update 跳过准备，make tunnel/status/logs/backup 提供日常操作；默认 help 不连接服务器。SSH_KEY 默认使用当前用户的 ~/.ssh/daily-plenty-ecs，仍可通过环境变量或命令行覆盖。

ACCESS_MODE 默认 http，传给 release 的 deploy/config/access.mjs；发布前备份并迁移已有 app.env 的监听、端口和 Cookie 字段，保留数据路径与其他设置。HTTP 不注册 Service Worker，桌面快捷方式由浏览器支持情况决定。

公网 HTTP 验证：37 项应用测试、9 项脚本测试、类型/架构/格式与 Shell 语法检查、生产构建通过；HTTP 和 HTTPS 两种配置均通过真实 Next 路由检查，覆盖初始化、登录、邀请、记账和退出。未执行远端部署或验证手机实机。

Makefile 验证：7 项脚本测试通过，覆盖真实打包/解压、模拟 SSH、参数引用和各阶段失败中止；部署 Shell 语法检查通过。未连接真实 ECS，尚未验证服务器安装与发布。

ECS 原生编译修复：bootstrap 安装独立 Python 3.11；release 显式使用该 Python 和 Node 安装包自带头文件，避免 node-gyp 重复联网下载。新增编译环境传递与缺失工具链预检回归；远端安装与真实 Linux 编译仍需重新执行 make deploy 验证。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

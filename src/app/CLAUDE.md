# src/app/

> L2 | 父级: ../CLAUDE.md

成员清单

- layout.tsx：全局 Metadata、固定缩放 viewport 和 CSS 外壳，挂载 TouchGestures 处理 Safari 双指缩放。
- (main)/：四个独立业务路由 /、/reports、/records、/together 及共用 layout。
- globals.css：Tailwind v4 主题令牌和移动端基础控件。
- setup/page.tsx：首次初始化的稳定入口，转交根页面状态判断。
- join/page.tsx：邀请路由装配；JoinView 展示，runtime 处理加入流程。
- api/[...path]/route.ts：薄 HTTP 入口，转交 server/http/router；Cookie 在 http/context，初始化事务在 server/flows/accounts。

页面不直接访问数据库；API 只转换请求，业务规则归 server。
分类新增使用 POST /api/ledgers/:id/categories；个人模板使用 GET/POST /api/ledgers/:id/templates、PATCH/DELETE /api/ledgers/:id/templates/:templateId。用户归属取登录会话，不接收前端传入身份。

POST /api/ledgers/:id/categories 支持 icon 白名单标识，省略时使用 tag；账本数据中的分类、账单和分类统计携带图标。

DELETE /api/ledgers/:id/entries/:entryId 必须传 reason（duplicate / wrong_amount / wrong_category / not_needed / other）；reasonNote 选填，other 时必填，最多 200 字。

- (main)/records/page.tsx：独立全部账单入口，支持地址保存筛选。
  GET /api/ledgers/:id/entries 为高级分页查询；GET /api/ledgers/:id/entries/export 导出全部匹配项；两者共享 start/end、kind、categoryIds（逗号分隔）、memberId、creatorId、minAmount/maxAmount（整数分）、search、sort、page。旧首页月度接口保留。

globals.css 提供键盘自适应弹层、移动账单行、16px 原生表单与 Safari 日期控件；records 页面样式集中于 features/records/records.css。
根元素 touch-action 仅允许横向/纵向平移，配合 viewport 与 TouchGestures 禁用页面双指缩放；不拦截单指移动、点击或桌面滚轮。

globals.css 提供 BottomDrawer 的底部开关动画与 reduced-motion 回退；取消按钮按下的 translateY 位移。共用主 layout 的加载占位不渲染底栏与记账按钮，避免认证前闪现业务导航。
globals.css 导入 ui/motion.css；CSS :has 根据弹层存在性锁住背景，scrollbar-gutter 预留滚动条，视口变量由 React style 输入。join 账号字段通过 Collapse 展开，成功状态淡入。

- manifest.ts：生成 /manifest.webmanifest，中文名称、独立窗口、根启动地址与标准/遮罩图标；layout.tsx 提供 Apple 图标、通用/旧 Safari 独立窗口标记和安装 Provider。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

# 2026-11-12 项目整改

本轮保留现有四页路由、共享底栏、记账抽屉、移动端样式和数据库模型，整改可读性、重复业务流程、接口分派及模块边界。没有执行用户数据库迁移或连接 ECS。

## 已落地

| 原问题                                             | 现在的实现                                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| JSX/HTML、函数调用、对象与 CSS 挤成一行            | Prettier 3.7.4 固定版本；TSX 单属性换行，HTML 按结构与行宽展开；维护源文件统一格式，SQL 迁移不变         |
| 多声明挤在一起、裸 if/else 与循环体                | 拆开声明并明确花括号；架构脚本持续检查生产源码的 if/else                                                 |
| 首页、明细、全局抽屉重复表单和请求                 | ledger/editor/form、commands、useEntryForm 共享纯规则、请求与提交状态                                    |
| 首页缺少同步提交锁，编辑/删除重试更换请求编号      | 三入口共用 ref 锁；相同失败操作保留 requestId，成功或开始新编辑会话后重置                                |
| 分类忙碌时静默返回，调用方误认为成功               | 返回明确错误，由分类表单保留草稿并反馈                                                                   |
| API catch-all 混杂身份、事务、业务、响应与长条件链 | route.ts 只导出方法；server/http 按账户/账本注册路由，统一错误/JSON/会话，业务归服务与 flows             |
| 无效 JSON 对象形态可能触发 500                     | JSON 边界拒绝 null、数组、字符串及解析错误，统一返回 400                                                 |
| 邀请页面内联 HTTP 客户端和账号流程                 | JoinView 负责呈现，runtime 复用公共 api，阻止重复提交                                                    |
| 单个页面承担过多 JSX                               | 首页拆标题/结余/最近记录；统计拆趋势/收支/分类/成员；明细拆筛选面板/runtime/结果区；抽屉拆容器/动作/字段 |
| 分类创建、模板保存与列表挤在一个 Preferences 文件  | preferences/ 下三个独立组件，各自管理输入和确认状态                                                      |
| 两个 CSV 入口复制列定义和转义                      | server/ledger/csv.ts 统一列、精确金额、引号转义与公式注入防护                                            |
| configure 覆盖已设置的数据库路径并生成未使用密钥   | 只补缺项，保留已有配置；移除 SESSION_SECRET 默认项，文件权限保持 0600                                    |
| 超长离线设计文件                                   | 数据模型独立 schema.html，styles 按基础/组件/响应式拆分，保持离线与原级联顺序                            |
| 空目录和过时地图                                   | 清理未实现的前端 auth/user 空目录，服务端 user/auth 保留；根历史记录迁入 HISTORY，更新 L1/L2/L3          |

## 分层检查

| 逻辑职责         | 实际路径                                                           |
| ---------------- | ------------------------------------------------------------------ |
| Types / rules    | shared、ledger/editor/form、records/filters、reports/filters       |
| API / repository | features/common/api、server 各域 repo                              |
| 业务流程         | ledger/editor/commands、server 各域 service、server/flows/accounts |
| Runtime          | features 的 hooks/Provider、join/runtime、server/http              |
| UI               | 四页组件、ledger/ui、ui 与 App 路由装配                            |

依照 frontend-layered-arch 审查：生产源码没有浏览器层导入 server、shared/公共 UI 反向导入业务、服务端导入 React，运行时依赖图无循环。页面不直接请求 API；公用规则不读取 Provider。ledger/editor 和 ledger/records 是同域实现目录，不新增独立业务域。

新增 `pnpm check:architecture` 检查以上核心导入方向、静态导入循环、源码文件 800 行上限、契约注释、同目录地图与 if/else 花括号。类型检查启用 noUnusedLocals/noUnusedParameters。检查范围不等价于全部代码质量或安全审计；业务授权仍由测试与代码审查验证。

## 验证证据

- 应用测试：33 项通过。新增真实内存 SQLite 与模拟丢包的组合回归，覆盖新建、编辑、删除已成功但响应丢失后的重试，以及连续录入相同内容。
- 脚本测试：3 项通过。覆盖 WAL 一致性备份、缺失源库拒绝，以及配置重复执行不覆盖路径/密钥。
- 严格 TypeScript 检查通过；78 个生产源码文件通过架构检查。
- 使用 1280 MiB 堆限制和单 worker 的生产构建通过。
- 实际 Next 请求处理器检查通过：四页 200、初始化/登录/退出、分类、个人模板隔离、邀请、账单 CRUD、删除原因、高级查询/导出、日/月/年统计及 400/401/403/404 权限/输入边界。不监听端口，数据库为内存合成数据。
- 原有 SQL 迁移保持字节不变；真实账单库与环境文件未参与测试。

## 尚未验证与依赖限制

- 浏览器连接此前未提供可用实例；没有宣称验证 iPhone/鸿蒙实机、触摸、键盘与退出动画。SSR 和路由检查不能代替这些交互验证。
- 未连接 ECS，未实跑 Alibaba Cloud Linux 的 systemd、Swap 或远程 SSH。
- 安装工具对当前 Next.js 15.5.3 发出了已知安全版本警告（链接到 CVE-2025-66478 公告）。本环境 npm registry DNS 不可用，本轮未升级或验证修复版本；依赖安全升级仍需在可联网环境执行并重跑构建/接口检查。格式工具使用本机已有同版本包，package.json 与锁文件均固定 3.7.4，不依赖本机绝对路径。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

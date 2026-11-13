# tests/

> L2 | 父级: ../CLAUDE.md

成员清单

- server.test.ts：内存 SQLite 服务层回归测试，覆盖金额、幂等、账本隔离、版本、删除、密码和邀请。
- setup.test.ts：直接调用真实 API，验证无配置初始化、6 位密码、有效会话、并发及重复初始化保护。
  同时验证生产 Cookie 的显式 HTTP、本机预览及 HTTPS 模式，登录/退出一致保留 HttpOnly、SameSite 与 Path；仅公网监听不自动放宽 Secure。
- preferences.test.ts：分类共享、模板用户/账本隔离、伪造身份、权限、历史账单保护及旧库升级持久化测试；默认分类补齐不覆盖归档/自定义分类，重复迁移不重复添加。

测试不依赖公网、浏览器或生产数据库。
分类调整回归同时验证保留原分类 ID 的重命名，以及目标已存在时账单/模板关联的合并。

- category-icons.test.ts：验证内置映射、图标白名单、分类/账单/统计返回值及旧库升级和重新打开后图标持久化。

- deletion-reasons.test.ts：删除原因必填、非法/空白说明、权限、版本、原因幂等冲突、恢复与重启持久化回归。

- records.test.ts：高级维度交集、跨月日期、金额边界、四种排序和分页、全量汇总/CSV、历史分类成员、只读查询、URL 往返及输入校验。全部使用内存合成记录。
  同时验证支出统计超过 50 笔仍完整聚合、闰日/月末/跨年、空白日期/年份补零、汇总与折线一致、软删除/权限隔离及日月年 URL 校验。

- frontend/：录入重试、表单规则与导航/动效回归。原 navigation.test.ts：四个真实页面路径、同账本各页查询条件恢复与跨账本条件隔离。

navigation.test.ts 同时用真实 JSX runtime 遍历明细页已加载状态的兄弟元素，验证 key 唯一；还原旧写法确认回归测试能捕捉用户报告的重复 key。
navigation.test.ts 验证 Collapse 的 inert/aria-hidden 与草稿保留、Presence 初始显隐，并扫描正式 features/ui 禁止手工增删节点、写 innerHTML/classList/style。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

# tests/frontend/

> L2 | 父级: ../CLAUDE.md

- navigation.test.ts：认证前/退出后隐藏业务底栏，就绪后保留四入口和记账按钮；四页路由隔离、重复 key 回归、声明式动效的 SSR 状态与 DOM 写入约束。
- editor.test.ts：表单映射和精确金额；模拟服务已提交但响应丢失，验证新建/编辑/删除重试幂等及连续录入；验证 HTTP 浏览器缺少 randomUUID 时的请求编号生成。

不使用真实数据；SSR 不等价于真实浏览器交互验证。

- pwa.test.ts：安装清单和 PNG 规格；真实 Worker 的缓存隔离、更新清理、网络优先和断网回退。
- viewport.test.ts：真实触摸适配组件的双指/Safari 手势拦截、单指滚动放行及卸载清理。

navigation.test.ts 同时验证业务页挂起时仅内容区显示占位，主导航和记账按钮仍保留。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

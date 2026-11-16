# src/server/http/

> L2 | 父级: ../CLAUDE.md

- context.ts：可选/必需会话与响应 Cookie；生产默认 Secure，显式 DAILY_PLENTY_ALLOW_HTTP=true 或 loopback 预览可关闭，登录与退出遵循相同策略。
- request.ts：handler 契约、JSON 对象解析、认证包装与错误响应。
- router.ts：按方法与路径模板精确匹配，统一捕获错误；未知路径不初始化数据库。
- account-routes.ts：账户路由表，调用跨域流程并设置 Cookie。
- ledger-routes.ts：账本路由表；会话解析一次，权限由各服务统一校验。

App Route → router → 路由表 → flows/service → repo。禁止在路由表复制权限和业务规则。

评论路由 GET/POST ledgers/:ledgerId/entries/:id/comments：GET 200 {comments}，POST 201 返回 comment（含幂等重试）；400 输入/回复关联错误、401 未登录、403 权限不足、404 账单不存在或已删除、409 请求标识冲突。

- api-key-routes.ts：GET/POST /auth/api-keys、DELETE /auth/api-keys/:id，仅网页登录的可记账成员可共同管理所属账本密钥；列表无秘密，生成必须指定 ledgerId，201 一次返回 token 和绑定账本元数据。

request.authenticated 仅网页登录；ledgerAuthenticated 接受会话用户或账本共享 Bearer。开放 GET ledgers、ledgers/:id/recorders、data、reports、entries 、entries/:id，POST entries 及 PATCH entries/:id（仅 AI 来源）；Bearer 只允许绑定账本，跨账本 403 LEDGER_SCOPE_MISMATCH。无效 Bearer 返回 401，不回退 Cookie，账户和其他受保护操作拒绝 API Key（403 SESSION_REQUIRED）。GET recorders 返回 {recorders:[{memberId,userId,displayName}]}，仅含未离开、未禁用的 editor。Bearer 新增必须包含 recordedByMemberId，400 INVALID_RECORDER 表示候选失效；Cookie 新增不接受此字段。Bearer 修改要求 updatedByMemberId（400 INVALID_UPDATER）、版本与完整业务字段；403 AI_ENTRY_REQUIRED 拒绝人工记录，409 VERSION_CONFLICT 拒绝过期版本，GET 单条不存在/已删除为 404；Cookie 编辑使用登录身份。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

# src/server/ledger/

> L2 | 父级: ../CLAUDE.md

- repo.ts：账本、分类、模板、成员及账单的数据访问；keyLedger 检查密钥/账本，recorders 筛选有效 editor，apiMutation/saveApiMutation 记录账本级请求；模板查询和写入始终限定用户及账本。
- service.ts：账本初始化、关联校验、查询与导出，listRecorders 提供候选、getEntry 按 ID 查询未删除账单；会话查询只含本人模板，密钥查询模板为空。
- repo.ts / service.ts 的统计路径：reportPoints 按账单日期 SQL 分组，summaryBetween 使用同一范围汇总；queryReport 在只读快照中鉴权、补零和校验整数金额，不受明细分页限制。年维度覆盖最早账单至当前/最后账单所在年，收入不计入支出折线，软删除排除。
- 新建账本内置 12 个支出分类和 6 个收入分类；旧账本由 0003 迁移补齐，保留自定义分类。
- 0004 迁移同步支出分类调整：房租 → 房贷，其他 → 服饰；普通重命名保留分类 ID，同名冲突合并关联。
- preferences.ts：同账本共享分类新增和个人模板增改删查，校验名称、角色及有效关联。
- entries.ts：账单幂等写入、修改与软删除。
- invitations.ts：一次性邀请与双人成员规则。

分类新增校验并保存 icon；账单查询、分类统计返回分类图标，模板通过分类 ID 引用图标。

删除账单时原因与软删除状态同事务写入，并纳入幂等指纹；恢复清空当前删除原因，历史幂等响应仍保留当时原因。

- records/repo.ts：高级筛选 SQL、四种排序、分页及全量聚合，列表与汇总共用过滤条件。
- records/index.ts：授权查询及全量筛选 CSV；快照事务保持列表、总数与汇总一致，页码越界自动收敛。

- csv.ts：两个导出入口共用列顺序、金额字符串、CSV 引号转义和公式注入防护。

- comments.ts：评论服务；活跃 editor 写、viewer 读，已删除账单禁止访问；trim 1–1000，回复永远归主评论，复用账本/用户/requestId 幂等事务。
- comments-repo.ts：同账本/账单评论仓储，实时关联作者与回复对象姓名，createdAt + rowid 升序全量读取。

- access.ts：区分会话用户与账本共享密钥，读取前校验账本范围/撤销状态；共享密钥不获取个人模板。
- api-entries.ts：共享密钥显式 recordedByMemberId 录入、updatedByMemberId 修改；服务端仅允许编辑 source=ai，保留来源/创建人并检查版本；活跃 editor 候选来自 recorders，账本/requestId 统一幂等并审计 keyId；修改指纹含操作/目标 ID/版本/内容，创建指纹兼容已发布旧请求。
  GET /ledgers/:ledgerId/recorders 返回未离开、未禁用的可记账成员 memberId/userId/displayName，供 agent 推断录入人。

账单来源：entries.createEntry 固定 manual，api-entries.createApiEntry 固定 ai；严格输入拒绝客户端伪造 source，编辑/删除/恢复保留原始来源。CSV 末列输出数据来源。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

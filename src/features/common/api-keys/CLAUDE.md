# src/features/common/api-keys/

> L2 | 父级: ../CLAUDE.md

```text
api-keys/
├── api.ts             同源密钥请求（L2）
├── runtime.ts         账本选择、提交锁与一次性秘密状态（L4）
├── ApiKeysPage.tsx    两端共享二级设置页（L5）
├── KeyList.tsx        绑定账本/元数据列表、空状态与撤销确认（L5）
└── api-keys.css       MUJI 一体式面板、成功视图与折叠教程
```

类型复用 shared/types；业务校验与密钥生命周期在 server/auth。UI → runtime → api，UI 不直接发请求。完整密钥只保留于当前页面 React 状态，关闭/卸载后消失，不进入 localStorage；生成默认选当前可编辑账本，否则选首个可编辑账本；仅 editor 可选择生成，列表显示共同管理的账本密钥及生成者，每枚密钥只属于一个账本。普通 HTTP 下剪贴板不可用时允许手动选择。

设置视觉：单个主面板内 PC 左生成、右管理，手机顺序排列；生成成功替换左侧表单，完整密钥仍一次性显示。列表含可使用数量、紧凑元数据、空状态和就地撤销；接入步骤默认折叠，权限文案明确可查询/新增、仅 AI 可修改、不可删除。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

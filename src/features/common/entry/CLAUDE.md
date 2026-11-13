# src/features/entry/

> L2 | 父级: ../CLAUDE.md

- EntryComposer.tsx：布局级记账上下文、权限入口与全局单个 EntryDrawer；固定在当前用户/账本，切页/切账本关闭。
- runtime.ts：加载分类与成员、新账单/个人模板保存、动态分类；写入成功通知共享数据刷新，失败保留表单，同内容重试沿用请求 ID。

入口：四页底栏中央按钮与首页记账按钮 → 同一 EntryComposer → EntryDrawer → BottomDrawer。不切换 URL，不借用某个页面作为隐藏编辑器。
状态流：未打开 → 加载 → 编辑 → 保存 → 原页数据刷新；保存再记保持抽屉。加载失败可关闭重开；只读成员无法打开。
Presence 保留当前抽屉到退出动画完成；保存成功和取消均走同一路径，退出期间 inert，切换用户/账本/页面则立即卸载旧作用域。

- runtime.ts 通过 ledger/editor 共用表单、分类/模板写入、同步提交锁及幂等身份；本模块只处理数据加载和成功后继续录入。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

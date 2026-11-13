# src/features/together/

> L2 | 父级: ../CLAUDE.md

- TogetherPage.tsx：/together 姓名末字头像（按 Unicode 码点取字）、成员关系、共同账本、一次性邀请、账号与退出。
- runtime.ts：共用查询上组合邀请、复制及退出；仅所有者且未满两人时可邀请。
- together.css：人物居中布局、头像文字水平/垂直居中、独立账号行，无金额统计区。

邀请链接复制失败时展示可手动选择的链接；不自动向任何联系人发送消息。
邀请结果和反馈使用公共 Presence 渐入/退出，不重建整个成员页。

- TogetherPage.tsx 嵌入 ui/pwa/InstallCard，提供添加到桌面入口与 iPhone/其他浏览器指引。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

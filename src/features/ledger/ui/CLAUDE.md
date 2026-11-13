# src/features/ledger/ui/

> L2 | 父级: ../CLAUDE.md

- preferences/：分类创建、模板保存、模板列表各自独立组件，保留展开、确认和失败反馈。

- CategoryIcon.tsx：统一 SVG 分类图标，未知标识显示通用图标；preferences/CategoryCreator 提供带中文标签和选中态的图标选择器。

- DeleteEntryDialog.tsx：替代原生 confirm 的原因必选确认表单，无默认选中，其他原因必填说明；取消不发送请求，失败保留输入。

- InterfaceIcon.tsx：导航/操作专用 SVG 图标；账本、统计、明细、成员与日历语义分开，名称受类型约束。
- 图标按用途分级：导航和分类选择 24px、账单 22px、模板/常规操作 20px、辅助 16px、主记账 28px；分类与界面统一 1.75px 笔画。

- EntryDrawer.tsx：首页与全部账单共用的录入/编辑弹层，组合分类、个人模板和删除原因确认；内部按容器、底部动作、表单字段拆分，收支选项由数据生成。
- EntryRow.tsx：共用账单行，显示分类图标、收款/付款及录入人；通过回调打开详情。

EntryDrawer 编辑时只显示保存修改；已退出的原付款人仍可显示并保留，符合历史账单关联规则。

手机弹层共用 useDialogViewport 和 mobile-dialog 样式：固定头部及底部操作区、表单内部滚动、四边安全区；编辑旧账单时不自动弹出数字键盘。EntryRow 金额独立，付款/录入身份占下一行。

原 Dashboard 页面已迁出；home/HomePage 组合本目录的模板/账单组件。统计与成员页分别属于 reports、together，本目录不负责页面导航。

- BottomDrawer.tsx：React Portal 与声明式视口样式；消费 Presence 退出状态，不用定时器或手工写 style 驱动动画；ref 仅用于焦点和表单滚动，焦点循环排除 inert 折叠控件。
  EntryDrawer 为业务表单，BottomDrawer 为抽屉容器；DeleteEntryDialog 也使用该容器。新建时不自动聚焦金额，避免打开动画与软键盘同时改变视口。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

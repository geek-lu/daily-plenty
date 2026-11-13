# src/app/config/

> L2 | 父级: ../CLAUDE.md

成员清单

- page.tsx：Server Component，经 http/context optionalActor 校验登录（未登录 notFound 404），从 getStore() 读取表清单、PRAGMA table_info 与前 200 行；password_hash / token_hash 打码后传给 ConfigView。
- ConfigView.tsx：Client Component，DataGrip 风格 + MUJI 配色的数据库行数据浏览器；左侧表列表，右侧列与行数据，?table= 切换；仅渲染桌面端（<1024px 展示提示）。

此路由不在导航菜单内，供调试使用；生产环境同样要求登录，凭据哈希永不展示。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

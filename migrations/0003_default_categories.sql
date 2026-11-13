-- [INPUT]: 已有账本与分类。
-- [OUTPUT]: 为已有账本补齐常用分类，仅插入缺失项。[POS]: 增量种子迁移，保留分类身份、排序与归档状态。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
WITH defaults(kind, name, position) AS (VALUES
 ('expense','餐饮',0), ('expense','买菜',1), ('expense','交通',2),
 ('expense','购物',3), ('expense','居家',4), ('expense','娱乐',5),
 ('expense','健康',6), ('expense','其他',7), ('expense','房租',8),
 ('expense','水电',9), ('expense','通讯',10), ('expense','学习',11),
 ('income','工资',0), ('income','奖金',1), ('income','其他收入',2),
 ('income','兼职',3), ('income','理财',4), ('income','红包',5)
)
INSERT INTO categories (id, ledger_id, kind, name, sort_order)
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
 substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
 l.id, d.kind, d.name,
 COALESCE((SELECT MAX(c.sort_order) FROM categories c WHERE c.ledger_id = l.id AND c.kind = d.kind), -1) + 1 + d.position
FROM ledgers l CROSS JOIN defaults d
WHERE NOT EXISTS (
 SELECT 1 FROM categories c WHERE c.ledger_id = l.id AND c.kind = d.kind AND c.name = d.name
);

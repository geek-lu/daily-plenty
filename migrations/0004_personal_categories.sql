-- [INPUT]: 既有支出分类、账单与个人模板。
-- [OUTPUT]: 房租改为房贷、其他改为服饰。[POS]: 增量分类调整；同名目标已存在时合并关联，收入分类不变。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
CREATE TEMP TABLE category_replacements AS
SELECT old.id AS old_id, old.ledger_id, target.id AS target_id,
 CASE old.name WHEN '房租' THEN '房贷' ELSE '服饰' END AS new_name
FROM categories old
LEFT JOIN categories target ON target.ledger_id = old.ledger_id AND target.kind = 'expense'
 AND target.name = CASE old.name WHEN '房租' THEN '房贷' ELSE '服饰' END
WHERE old.kind = 'expense' AND old.name IN ('房租', '其他');

UPDATE entries SET
 category_id = (SELECT target_id FROM category_replacements WHERE old_id = entries.category_id),
 version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE category_id IN (SELECT old_id FROM category_replacements WHERE target_id IS NOT NULL);
UPDATE entry_templates SET
 category_id = (SELECT target_id FROM category_replacements WHERE old_id = entry_templates.category_id),
 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE category_id IN (SELECT old_id FROM category_replacements WHERE target_id IS NOT NULL);
DELETE FROM categories WHERE id IN (SELECT old_id FROM category_replacements WHERE target_id IS NOT NULL);
UPDATE categories SET name = (SELECT new_name FROM category_replacements WHERE old_id = categories.id)
WHERE id IN (SELECT old_id FROM category_replacements WHERE target_id IS NULL);
DROP TABLE category_replacements;

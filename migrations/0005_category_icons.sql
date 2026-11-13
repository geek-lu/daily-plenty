-- [INPUT]: 既有分类表。
-- [OUTPUT]: 分类 icon 字段与内置分类图标回填。[POS]: 增量迁移，保留分类 ID 及所有关联。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
ALTER TABLE categories ADD COLUMN icon TEXT NOT NULL DEFAULT 'tag';
UPDATE categories SET icon = CASE name
 WHEN '餐饮' THEN 'food'
 WHEN '买菜' THEN 'leaf'
 WHEN '交通' THEN 'bus'
 WHEN '购物' THEN 'bag'
 WHEN '居家' THEN 'home'
 WHEN '娱乐' THEN 'game'
 WHEN '健康' THEN 'health'
 WHEN '服饰' THEN 'shirt'
 WHEN '房贷' THEN 'mortgage'
 WHEN '水电' THEN 'bolt'
 WHEN '通讯' THEN 'phone'
 WHEN '学习' THEN 'book'
 WHEN '工资' THEN 'salary'
 WHEN '奖金' THEN 'award'
 WHEN '其他收入' THEN 'wallet'
 WHEN '兼职' THEN 'laptop'
 WHEN '理财' THEN 'chart'
 WHEN '红包' THEN 'envelope'
 ELSE 'tag' END;

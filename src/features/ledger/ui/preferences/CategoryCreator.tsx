'use client';
/**
 * [INPUT]: 分类/模板契约、公共动效与上层操作回调。
 * [OUTPUT]: 分类名称及图标选择表单。
 * [POS]: ledger/ui/preferences 展示组件，不访问 HTTP 或数据库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useId, useState } from 'react';
import { Collapse } from '@/ui/motion';
import type { Kind } from '@/shared/types';
import { categoryIcons, categoryIconIds, type CategoryIconId } from '@/shared/category-icons';
import { CategoryIcon } from '../CategoryIcon';
export function CategoryCreator({
  kind,
  onAdd,
}: {
  kind: Kind;
  onAdd: (name: string, kind: Kind, icon: CategoryIconId) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const optionsId = useId();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIconId>('tag');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const add = async () => {
    if (!name.trim()) {
      setError('请填写分类名称');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onAdd(name.trim(), kind, icon);
      setName('');
      setIcon('tag');
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加失败，请重试');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-2">
      <button
        type="button"
        className="min-h-11 text-sm text-accent"
        onClick={() => setOpen(!open)}
        disabled={busy}
        aria-expanded={open}
        aria-controls={optionsId}
      >
        {open ? '取消添加' : '+ 添加分类'}
      </button>
      <Collapse
        id={optionsId}
        open={open}
      >
        <div className="rounded border border-line bg-paper p-3">
          <label>
            <span className="label">{kind === 'expense' ? '支出' : '收入'}分类名称</span>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder={kind === 'expense' ? '比如：宠物、停车' : '比如：兼职、理财收益'}
              disabled={busy}
            />
          </label>
          <fieldset
            className="mt-4 min-w-0"
            disabled={busy}
          >
            <legend className="label">选择图标 · 已选：{categoryIcons[icon].label}</legend>
            <div
              className="grid grid-cols-4 gap-2 min-[380px]:grid-cols-5"
              role="group"
              aria-label="分类图标"
            >
              {categoryIconIds.map((id) => (
                <button
                  type="button"
                  key={id}
                  aria-label={`${categoryIcons[id].label}图标`}
                  aria-pressed={icon === id}
                  onClick={() => setIcon(id)}
                  className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded border p-2 text-xs ${icon === id ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface muted'}`}
                >
                  <CategoryIcon name={id} />
                  <span>{categoryIcons[id].label}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <p className="mt-2 text-xs muted">添加后，两个人都可以使用。</p>
          {error && (
            <p
              className="mt-2 text-sm text-accent"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            className="btn mt-3 w-full"
            onClick={add}
            disabled={busy}
          >
            {busy ? '添加中…' : '添加并选中'}
          </button>
        </div>
      </Collapse>
    </div>
  );
}

'use client';
/**
 * [INPUT]: 分类/模板契约、公共动效与上层操作回调。
 * [OUTPUT]: 个人模板列表及删除确认。
 * [POS]: ledger/ui/preferences 展示组件，不访问 HTTP 或数据库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState } from 'react';
import { Collapse, Presence } from '@/ui/motion';
import { BottomDrawer } from '../BottomDrawer';
import { CategoryIcon } from '../CategoryIcon';
import type { Category, EntryTemplate, Member } from '@/shared/types';
import { money } from '@/shared/money';
export function TemplateList({
  templates,
  categories,
  members,
  busy,
  onUse,
  onEdit,
  onDelete,
  onNew,
}: {
  templates: EntryTemplate[];
  categories: Category[];
  members: Member[];
  busy: boolean;
  onUse: (template: EntryTemplate) => void;
  onEdit: (template: EntryTemplate) => void;
  onDelete: (template: EntryTemplate) => Promise<void>;
  onNew: () => void;
}) {
  const [manage, setManage] = useState(false);
  const [deleting, setDeleting] = useState<EntryTemplate | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const remove = async () => {
    if (!deleting || busy) {
      return;
    }
    setDeleteError('');
    try {
      await onDelete(deleting);
      setDeleting(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : '删除失败，请重试');
    }
  };
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base">我的常用模板</h2>
        <button
          className="min-h-11 text-xs text-accent"
          aria-expanded={manage}
          onClick={() => setManage(!manage)}
        >
          {manage ? '完成' : '管理'}
        </button>
      </div>
      <p className="mb-4 text-xs muted">只属于你，点一下填好，再确认记账。</p>
      <div className="grid gap-3">
        {templates.map((template) => {
          const category = categories.find((item) => item.id === template.categoryId);
          const member = members.find((item) => item.id === template.paidByMemberId);
          const available = category && !category.archivedAt && member && !member.leftAt;
          return (
            <div
              key={template.id}
              className="rounded border border-line p-3"
            >
              <button
                className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
                disabled={busy || !available}
                onClick={() => onUse(template)}
              >
                <CategoryIcon
                  name={category?.icon}
                  size={20}
                />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm">{template.name}</span>
                  <span className="mt-1 block text-xs muted">
                    {template.kind === 'expense' ? '支出' : '收入'} ·{' '}
                    {category?.name || '分类不可用'}
                  </span>
                </span>
                <span className="num shrink-0 text-sm">¥ {money(template.amountMinor)}</span>
              </button>
              {!available && (
                <p className="mt-2 text-xs text-accent">分类或付款人已停用，请编辑后使用。</p>
              )}
              <Collapse open={manage}>
                <div className="mt-2 flex gap-3 border-t border-line pt-2">
                  <button
                    className="min-h-11 flex-1 text-sm"
                    disabled={busy}
                    onClick={() => onEdit(template)}
                  >
                    编辑
                  </button>
                  <button
                    className="min-h-11 flex-1 text-sm text-accent"
                    disabled={busy}
                    onClick={() => {
                      setDeleteError('');
                      setDeleting(template);
                    }}
                  >
                    删除
                  </button>
                </div>
              </Collapse>
            </div>
          );
        })}
      </div>
      {!templates.length && (
        <p className="py-4 text-sm leading-7 muted">
          还没有模板。填好一笔常用收支，展开“存为我的常用模板”即可保存。
        </p>
      )}
      <button
        className="btn mt-4 w-full"
        onClick={onNew}
        disabled={busy}
      >
        + 新建模板
      </button>
      <Presence show={Boolean(deleting)}>
        {deleting && (
          <BottomDrawer
            title="删除这个模板？"
            busy={busy}
            onClose={() => setDeleting(null)}
            actions={(close) => (
              <>
                <button
                  className="btn flex-1"
                  disabled={busy}
                  onClick={close}
                >
                  取消
                </button>
                <button
                  className="btn btn-primary flex-1"
                  disabled={busy}
                  onClick={remove}
                >
                  {busy ? '正在删除…' : '确认删除'}
                </button>
              </>
            )}
          >
            <p className="text-lg">{deleting.name}</p>
            <p className="mt-3 text-sm muted">
              删除后，这个模板将从你的常用模板中移除，已经记录的账单会保留。
            </p>
            {deleteError && (
              <p
                className="mt-4 text-sm text-accent"
                role="alert"
              >
                {deleteError}
              </p>
            )}
          </BottomDrawer>
        )}
      </Presence>
    </section>
  );
}

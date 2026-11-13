'use client';
/** [INPUT]: 共享账单契约、BottomDrawer 与分类/模板/删除组件。[OUTPUT]: EntryDrawer，收支切换由 React 状态触发分类淡入。
 * [POS]: 账本和独立明细复用的手机编辑弹层，固定操作区与键盘内滚动表单。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useState } from 'react';
import { BottomDrawer } from './BottomDrawer';
import type { Category, Member, Kind, FormState } from '@/shared/types';
import type { CategoryIconId } from '@/shared/category-icons';
import type { DeletionReason } from '@/shared/deletion-reasons';
import { CategoryIcon } from './CategoryIcon';
import { DeleteEntryDialog } from './DeleteEntryDialog';
import { CategoryCreator } from './preferences/CategoryCreator';
import { TemplateSaver } from './preferences/TemplateSaver';

type EntryDrawerProps = {
  open: boolean;
  form: FormState;
  categories: Category[];
  members: Member[];
  templateName: string;
  editingTemplate: boolean;
  templateOnly: boolean;
  onTemplateName: (name: string) => void;
  onAddCategory: (name: string, kind: Kind, icon: CategoryIconId) => Promise<void>;
  onSaveTemplate: () => void;
  onChange: (next: FormState) => void;
  onClose: () => void;
  onSave: (continueAdd: boolean) => void;
  onDelete?: (reason: DeletionReason, note: string) => void;
  deleteSummary: string;
  busy: boolean;
  error: string;
  loading?: boolean;
  unavailable?: boolean;
  notice?: string;
};

function drawerTitle({ templateOnly, editingTemplate, form }: EntryDrawerProps) {
  if (templateOnly) {
    return editingTemplate ? '编辑我的模板' : '新建我的模板';
  }
  return form.id ? '看看这笔日常' : '记一笔小日子';
}

export function EntryDrawer(props: EntryDrawerProps) {
  const [deleting, setDeleting] = useState(false);
  const { open, onDelete, deleteSummary, busy, error, onClose, loading, notice } = props;
  if (!open) {
    return null;
  }
  if (deleting && onDelete) {
    return (
      <DeleteEntryDialog
        summary={deleteSummary}
        busy={busy}
        error={error}
        onCancel={() => setDeleting(false)}
        onDelete={onDelete}
      />
    );
  }
  return (
    <BottomDrawer
      title={drawerTitle(props)}
      onClose={onClose}
      busy={busy}
      actions={(close) => (
        <EntryActions
          {...props}
          onClose={close}
          onStartDelete={() => setDeleting(true)}
        />
      )}
    >
      {loading && (
        <p
          className="py-8 text-sm muted"
          role="status"
        >
          正在打开记账表单…
        </p>
      )}
      {notice && (
        <p
          className="mb-3 rounded bg-sage p-3 text-sm text-positive"
          role="status"
        >
          {notice}
        </p>
      )}
      <EntryFields {...props} />
    </BottomDrawer>
  );
}

function EntryActions({
  templateOnly,
  form,
  busy,
  loading,
  unavailable,
  onClose,
  onSave,
  onDelete,
  onStartDelete,
}: EntryDrawerProps & { onStartDelete: () => void }) {
  const disabled = busy || loading || unavailable;
  if (templateOnly) {
    return (
      <button
        className="btn flex-1"
        onClick={onClose}
        disabled={disabled}
      >
        关闭
      </button>
    );
  }
  const readyLabel = form.id ? '保存修改' : '保存账单';
  const saveLabel = loading ? '加载中…' : busy ? '保存中…' : readyLabel;
  return (
    <>
      {onDelete && (
        <button
          className="btn text-accent"
          onClick={onStartDelete}
          disabled={disabled}
        >
          删除账单
        </button>
      )}
      {!form.id && (
        <button
          className="btn min-w-0 flex-1"
          onClick={() => onSave(true)}
          disabled={disabled}
        >
          保存，再记一笔
        </button>
      )}
      <button
        className="btn btn-primary min-w-0 flex-1"
        onClick={() => onSave(false)}
        disabled={disabled}
      >
        {saveLabel}
      </button>
    </>
  );
}

function EntryFields({
  form,
  categories,
  members,
  busy,
  loading,
  unavailable,
  templateName,
  editingTemplate,
  templateOnly,
  onTemplateName,
  onAddCategory,
  onSaveTemplate,
  onChange,
  error,
}: EntryDrawerProps) {
  const disabled = busy || loading || unavailable;
  const visible = categories.filter(
    (category) =>
      category.kind === form.kind && (!category.archivedAt || category.id === form.categoryId),
  );
  return (
    <fieldset
      className="min-w-0"
      disabled={disabled}
    >
      <div className="grid grid-cols-2 gap-1 rounded bg-paper p-1">
        {(['expense', 'income'] as const).map((kind) => (
          <button
            key={kind}
            aria-pressed={form.kind === kind}
            className={`min-h-12 rounded ${form.kind === kind ? 'surface text-accent shadow-sm' : 'muted'}`}
            onClick={() => {
              if (form.kind !== kind) {
                onChange({ ...form, kind, categoryId: '' });
              }
            }}
          >
            {kind === 'expense' ? '支出' : '收入'}
          </button>
        ))}
      </div>
      <label className="mt-5 block">
        <span className="label">金额 / 人民币</span>
        <div className="flex items-center gap-3 border-b border-line py-2 text-3xl">
          <span>¥</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-4xl outline-none"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => onChange({ ...form, amount: e.target.value })}
            placeholder="0.00"
          />
        </div>
      </label>
      <div className="mt-5">
        <span className="label">分类</span>
        <div
          key={form.kind}
          className="entry-category-grid motion-enter"
        >
          {visible.map((category) => (
            <button
              key={category.id}
              className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-2 break-words rounded border px-1 py-2 text-xs ${form.categoryId === category.id ? 'border-accent bg-accent-soft text-accent' : 'border-line'}`}
              onClick={() => onChange({ ...form, categoryId: category.id })}
              aria-pressed={form.categoryId === category.id}
            >
              <CategoryIcon name={category.icon} />
              <span className="w-full break-words">{category.name}</span>
            </button>
          ))}
        </div>
        <CategoryCreator
          kind={form.kind}
          onAdd={onAddCategory}
        />
      </div>
      <div className="entry-detail-fields">
        <label>
          <span className="label">{form.kind === 'expense' ? '谁付款' : '谁收入'}</span>
          <select
            className="field"
            value={form.paidByMemberId}
            onChange={(e) => onChange({ ...form, paidByMemberId: e.target.value })}
          >
            <option
              value=""
              disabled
            >
              请选择付款人 / 收款人
            </option>
            {members
              .filter((m) => !m.leftAt || m.id === form.paidByMemberId)
              .map((member) => (
                <option
                  key={member.id}
                  value={member.id}
                >
                  {member.displayName}
                  {member.leftAt ? '（已退出）' : ''}
                </option>
              ))}
          </select>
        </label>
        {!templateOnly && (
          <label>
            <span className="label">日期</span>
            <input
              className="field"
              type="date"
              value={form.occurredOn}
              onChange={(e) => onChange({ ...form, occurredOn: e.target.value })}
            />
          </label>
        )}
      </div>
      <label className="mt-4 block">
        <span className="label">
          留一句备注 <small>/ 选填</small>
        </span>
        <input
          className="field"
          value={form.note}
          onChange={(e) => onChange({ ...form, note: e.target.value })}
          placeholder="比如，一起吃的晚饭"
          maxLength={120}
        />
      </label>
      <TemplateSaver
        name={templateName}
        editing={editingTemplate}
        expanded={templateOnly}
        busy={busy}
        onName={onTemplateName}
        onSave={onSaveTemplate}
      />
      {error && (
        <p
          className="mt-3 rounded bg-accent-soft p-3 text-sm text-accent"
          role="alert"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}

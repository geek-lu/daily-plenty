'use client';
/** [INPUT]: 账单摘要、BottomDrawer、忙碌/错误状态和操作回调。[OUTPUT]: 键盘自适应的必填删除原因面板。
 * [POS]: ledger UI，原因白名单与服务端共用，失败保留选择和说明。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useId, useState } from 'react';
import { BottomDrawer } from './BottomDrawer';
import {
  deletionReasonIds,
  deletionReasons,
  deletionNoteLimit,
  type DeletionReason,
} from '@/shared/deletion-reasons';

export function DeleteEntryDialog({
  summary,
  busy,
  error,
  onCancel,
  onDelete,
}: {
  summary: string;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onDelete: (reason: DeletionReason, note: string) => void;
}) {
  const [reason, setReason] = useState<DeletionReason | ''>('');
  const [note, setNote] = useState('');
  const formId = useId();
  const valid = reason !== '' && (reason !== 'other' || note.trim().length > 0);
  return (
    <BottomDrawer
      title="删除这笔账单？"
      busy={busy}
      onClose={onCancel}
      actions={(close) => (
        <>
          <button
            type="button"
            className="btn flex-1"
            disabled={busy}
            onClick={close}
          >
            取消
          </button>
          <button
            type="submit"
            form={formId}
            className="btn btn-primary flex-1"
            disabled={busy || !valid}
          >
            {busy ? '正在删除…' : '确认删除'}
          </button>
        </>
      )}
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && !busy) {
            onDelete(reason, note.trim());
          }
        }}
      >
        <p className="mt-3 break-words rounded bg-paper p-3 text-sm">{summary}</p>
        <p className="mt-3 text-sm leading-7 muted">
          删除后，这笔账单将不再计入收支统计。请留下原因，方便以后核对。
        </p>
        <fieldset
          className="mt-4 min-w-0"
          disabled={busy}
        >
          <legend className="label">删除原因 · 必选</legend>
          <div className="grid gap-2">
            {deletionReasonIds.map((id) => (
              <label
                key={id}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded border p-3 text-sm ${reason === id ? 'border-accent bg-accent-soft text-accent' : 'border-line'}`}
              >
                <input
                  className="h-4 w-4 accent-accent"
                  type="radio"
                  name="delete-reason"
                  value={id}
                  checked={reason === id}
                  required
                  onChange={() => setReason(id)}
                />
                {deletionReasons[id]}
              </label>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="label">原因说明 · {reason === 'other' ? '必填' : '选填'}</span>
            <textarea
              className="field min-h-24 resize-y"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={deletionNoteLimit}
              required={reason === 'other'}
              placeholder="比如：同一笔晚餐记了两次，保留另一笔"
              aria-describedby="delete-note-count"
            />
          </label>
          <p
            id="delete-note-count"
            className="mt-1 text-right text-xs muted"
          >
            {note.length}/{deletionNoteLimit}
          </p>
        </fieldset>
        {error && (
          <p
            className="mt-3 rounded bg-accent-soft p-3 text-sm text-accent"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>
    </BottomDrawer>
  );
}

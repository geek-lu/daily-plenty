'use client';
/**
 * [INPUT]: 分类/模板契约、公共动效与上层操作回调。
 * [OUTPUT]: 个人模板名称及保存面板。
 * [POS]: ledger/ui/preferences 展示组件，不访问 HTTP 或数据库。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useId, useState } from 'react';
import { Collapse } from '@/ui/motion';
export function TemplateSaver({
  name,
  editing,
  expanded,
  busy,
  onName,
  onSave,
}: {
  name: string;
  editing: boolean;
  expanded: boolean;
  busy: boolean;
  onName: (name: string) => void;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(expanded);
  const contentId = useId();
  return (
    <div className="mt-4 rounded border border-line p-3">
      <button
        type="button"
        className="min-h-11 w-full py-2 text-left text-sm"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen(!open)}
      >
        {editing ? '修改我的模板' : '存为我的常用模板'}
      </button>
      <Collapse
        id={contentId}
        open={open}
      >
        <label>
          <span className="label">模板名称</span>
          <input
            className="field"
            value={name}
            onChange={(e) => onName(e.target.value)}
            maxLength={30}
            placeholder="比如：工作日午餐"
            disabled={busy}
          />
        </label>
        <p className="mt-2 text-xs leading-6 muted">
          仅你在这个账本中可见。保存金额、分类、付款人和备注；使用时日期默认今天。保存模板不会新增账单。
        </p>
        <button
          type="button"
          className="btn mt-3 w-full"
          onClick={onSave}
          disabled={busy || !name.trim()}
        >
          {busy ? '保存中…' : editing ? '保存模板修改' : '保存为模板'}
        </button>
      </Collapse>
    </div>
  );
}

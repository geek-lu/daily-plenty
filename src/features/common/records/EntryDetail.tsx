'use client';
/** [INPUT]: useEntryEditor 状态、明细数据与共用抽屉。[OUTPUT]: EntryDetail：可编辑成员打开 EntryDrawer，只读成员打开详情抽屉。
 * [POS]: common/records 详情入口；手机列表与 PC 列表点击同一行为，Presence 保留退出动画。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import type { RecordsData } from '@/shared/types';
import { money } from '@/shared/money';
import { Presence } from '@/ui/motion';
import { BottomDrawer } from '../ui/BottomDrawer';
import { EntryDrawer } from '../ui/EntryDrawer';
import type { useEntryEditor } from './useEntryEditor';

export function EntryDetail({
  editor,
  data,
}: {
  editor: ReturnType<typeof useEntryEditor>;
  data: RecordsData;
}) {
  const selected = editor.selected;
  return (
    <Presence show={Boolean(selected)}>
      {selected &&
        (data.ledger.role === 'editor' ? (
          <EntryDrawer
            key={selected.id}
            open
            form={editor.form}
            categories={data.categories}
            members={data.members}
            templateName={editor.templateName}
            editingTemplate={false}
            templateOnly={false}
            onTemplateName={editor.setTemplateName}
            onAddCategory={editor.addCategory}
            onSaveTemplate={editor.saveTemplate}
            onChange={editor.setForm}
            onClose={editor.close}
            onSave={editor.save}
            onDelete={editor.remove}
            deleteSummary={`${selected.occurredOn} · ${selected.categoryName} · ¥ ${money(selected.amountMinor)}`}
            busy={editor.busy}
            error={editor.error}
          />
        ) : (
          <BottomDrawer
            title="账单详情"
            onClose={editor.close}
            actions={(close) => (
              <button
                className="btn flex-1"
                onClick={close}
              >
                返回账单
              </button>
            )}
          >
            <p className="num break-words text-3xl">
              {selected.kind === 'expense' ? '−' : '+'} ¥ {money(selected.amountMinor)}
            </p>
            <p className="mt-3 text-sm">
              {selected.categoryName} · {selected.occurredOn}
            </p>
            <p className="mt-3 break-words text-sm muted">
              {selected.payerName}
              {selected.kind === 'expense' ? '付款' : '收款'} · {selected.creatorName}录入
            </p>
            <p className="mt-5 break-words text-sm">{selected.note || '没有备注'}</p>
            <p className="mt-5 text-xs muted">当前为只读成员，可查看和导出账单。</p>
          </BottomDrawer>
        ))}
    </Presence>
  );
}

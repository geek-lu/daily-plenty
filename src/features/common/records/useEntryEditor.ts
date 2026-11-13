'use client';
/**
 * [INPUT]: 当前账本、刷新/提示回调、共用录入 runtime。
 * [OUTPUT]: 明细页账单选择、编辑、原因删除与个人模板保存。
 * [POS]: records runtime；校验、请求与锁由 ledger/editor 管理。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState } from 'react';
import type { Entry, Kind } from '@/shared/types';
import type { CategoryIconId } from '@/shared/category-icons';
import type { DeletionReason } from '@/shared/deletion-reasons';
import { useEntryForm } from '../editor/useEntryForm';
import { entryForm } from '../editor/form';

export function useEntryEditor(
  ledgerId: string,
  refresh: () => void,
  notify: (message: string) => void,
) {
  const editor = useEntryForm(ledgerId);
  const [selected, setSelected] = useState<Entry | null>(null);
  const { commands, mutate, form } = editor;

  function open(entry: Entry) {
    if (editor.isPending()) {
      return;
    }
    editor.reset(entryForm(entry));
    setSelected(entry);
  }

  const save = () =>
    mutate(async () => {
      if (!selected) {
        return;
      }
      await commands.save(form);
      setSelected(null);
      notify('账单已更新，筛选结果已刷新');
      refresh();
    });

  const remove = (reason: DeletionReason, reasonNote: string) =>
    mutate(async () => {
      if (!selected) {
        return;
      }
      await commands.remove(form, reason, reasonNote);
      setSelected(null);
      notify('账单已删除，原因已记录');
      refresh();
    });

  async function addCategory(name: string, kind: Kind, icon: CategoryIconId) {
    await editor.addCategory(name, kind, icon);
    refresh();
  }

  const saveTemplate = () =>
    mutate(async () => {
      await commands.saveTemplate(form, editor.templateName);
      editor.setTemplateName('');
      notify('已保存为你的常用模板');
    });

  return {
    ...editor,
    selected,
    open,
    close: () => {
      if (!editor.isPending()) {
        setSelected(null);
      }
    },
    save,
    remove,
    addCategory,
    saveTemplate,
  };
}

'use client';
/**
 * [INPUT]: 固定账本/用户、共用录入 runtime 与刷新回调。
 * [OUTPUT]: 全局记账抽屉的授权数据加载及保存/继续录入。
 * [POS]: entry runtime；保留失败草稿，共用校验、锁和幂等请求。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useState } from 'react';
import type { Kind, LedgerData } from '@/shared/types';
import type { CategoryIconId } from '@/shared/category-icons';
import { today } from '@/shared/money';
import { api } from '../api';
import { nextForm } from '../editor/form';
import { useEntryForm } from '../editor/useEntryForm';

export function useNewEntry(
  ledgerId: string,
  userId: string,
  onSaved: () => void,
  onClose: () => void,
) {
  const editor = useEntryForm(ledgerId);
  const { setForm, setError, commands, mutate, form } = editor;
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const abort = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await api<LedgerData>(
          `ledgers/${ledgerId}/data?month=${today().slice(0, 7)}`,
          { signal: abort.signal },
        );
        if (abort.signal.aborted) {
          return;
        }
        if (result.ledger.role !== 'editor') {
          throw new Error('当前账本仅可查看');
        }
        setData(result);
        const member = result.members.find((member) => member.userId === userId && !member.leftAt);
        setForm((value) => ({ ...value, paidByMemberId: member?.id || '' }));
      } catch (error) {
        if (!abort.signal.aborted) {
          setError(error instanceof Error ? error.message : '加载失败，请关闭后重试');
        }
      } finally {
        if (!abort.signal.aborted) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => abort.abort();
  }, [ledgerId, userId, setForm, setError]);

  function requireData() {
    if (!data || loading) {
      throw new Error('请等待账本加载完成后再试');
    }
    setNotice('');
  }

  const save = (continueAdd: boolean) =>
    mutate(async () => {
      requireData();
      await commands.save(form);
      onSaved();
      if (!continueAdd) {
        onClose();
        return;
      }
      setForm(nextForm(form));
      editor.setTemplateName('');
      setNotice('已记好这一笔，可以继续记录');
    });

  async function addCategory(name: string, kind: Kind, icon: CategoryIconId) {
    requireData();
    const category = await editor.addCategory(name, kind, icon);
    setData((value) => (value ? { ...value, categories: [...value.categories, category] } : value));
    onSaved();
  }

  const saveTemplate = () =>
    mutate(async () => {
      requireData();
      await commands.saveTemplate(form, editor.templateName);
      editor.setTemplateName('');
      setNotice('已保存为你的常用模板');
      onSaved();
    });

  return { ...editor, data, loading, notice, save, addCategory, saveTemplate };
}

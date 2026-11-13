'use client';
/**
 * [INPUT]: 固定账本、editor commands 与纯表单规则。
 * [OUTPUT]: 三个入口共用表单状态、提交锁、错误处理、分类/模板操作。
 * [POS]: ledger/editor runtime；页面只负责打开/关闭、提示及数据刷新。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useMemo, useRef, useState } from 'react';
import type { FormState, Kind } from '@/shared/types';
import type { CategoryIconId } from '@/shared/category-icons';
import { createEntryCommands } from './commands';
import { emptyForm } from './form';

export function useEntryForm(ledgerId: string) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const commands = useMemo(() => createEntryCommands(ledgerId), [ledgerId]);

  async function run<T>(action: () => Promise<T>): Promise<T> {
    if (pending.current) {
      throw new Error('上一项操作仍在处理中，请稍后再试');
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      return await action();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function mutate(action: () => Promise<void>) {
    if (pending.current) {
      return;
    }
    try {
      await run(action);
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败，请重试');
    }
  }

  function reset(value: FormState, name = '') {
    if (pending.current) {
      return;
    }
    commands.reset();
    setForm(value);
    setTemplateName(name);
    setError('');
  }

  async function addCategory(name: string, kind: Kind, icon: CategoryIconId) {
    return run(async () => {
      const category = await commands.addCategory(name, kind, icon);
      setForm((value) => (value.kind === kind ? { ...value, categoryId: category.id } : value));
      return category;
    });
  }

  return {
    form,
    setForm,
    templateName,
    setTemplateName,
    error,
    setError,
    busy,
    commands,
    mutate,
    run,
    reset,
    addCategory,
    isPending: () => pending.current,
  };
}

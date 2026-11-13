/**
 * [INPUT]: 公共账单/模板契约、金额与日期规则。
 * [OUTPUT]: 空表单、账单/模板映射、提交校验与连续录入重置。
 * [POS]: ledger/editor 纯规则，三个录入入口共用，不依赖 React 或 HTTP。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Entry, EntryInput, EntryTemplate, FormState, TemplateInput } from '@/shared/types';
import { parseAmount, today } from '@/shared/money';

export function emptyForm(paidByMemberId = ''): FormState {
  return {
    kind: 'expense',
    amount: '',
    categoryId: '',
    paidByMemberId,
    occurredOn: today(),
    note: '',
  };
}

export function entryForm(entry: Entry): FormState {
  return {
    ...templateForm(entry),
    id: entry.id,
    version: entry.version,
    occurredOn: entry.occurredOn,
  };
}

export function templateForm(
  template: Pick<EntryTemplate, 'kind' | 'amountMinor' | 'categoryId' | 'paidByMemberId' | 'note'>,
): FormState {
  return {
    kind: template.kind,
    amount: (template.amountMinor / 100).toFixed(2),
    categoryId: template.categoryId,
    paidByMemberId: template.paidByMemberId,
    occurredOn: today(),
    note: template.note,
  };
}

function commonInput(form: FormState): Omit<EntryInput, 'occurredOn'> {
  const amountMinor = parseAmount(form.amount);
  if (!amountMinor) {
    throw new Error('请输入大于 0 的金额，最多两位小数');
  }
  if (!form.categoryId || !form.paidByMemberId) {
    throw new Error('请选择分类和付款人');
  }
  return {
    kind: form.kind,
    amountMinor,
    categoryId: form.categoryId,
    paidByMemberId: form.paidByMemberId,
    note: form.note.trim(),
  };
}

export function entryInput(form: FormState) {
  return {
    ...commonInput(form),
    occurredOn: form.occurredOn,
    ...(form.id ? { version: form.version } : {}),
  };
}

export function templateInput(form: FormState, name: string): TemplateInput {
  if (!name.trim()) {
    throw new Error('请填写模板名称');
  }
  return { ...commonInput(form), name: name.trim() };
}

export function nextForm(form: FormState): FormState {
  return { ...emptyForm(form.paidByMemberId), occurredOn: form.occurredOn };
}

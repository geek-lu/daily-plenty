/**
 * [INPUT]: 账本 API、表单规则、删除原因与分类图标契约。
 * [OUTPUT]: 带请求身份保留的账单写入，以及分类和个人模板操作。
 * [POS]: ledger/editor 副作用边界；runtime 决定成功后的交互与刷新。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Category, FormState, Kind } from '@/shared/types';
import type { CategoryIconId } from '@/shared/category-icons';
import type { DeletionReason } from '@/shared/deletion-reasons';
import { api, uid } from '../api';
import { entryInput, templateInput } from './form';

export function createEntryCommands(ledgerId: string) {
  // 同一次编辑会话保留全部失败请求的编号，内容改回原值也不会重复记账。
  const requests = new Map<string, string>();
  const base = `ledgers/${ledgerId}`;

  async function writeEntry(path: string, method: string, payload: object) {
    const fingerprint = JSON.stringify({ path, method, payload });
    const requestId = requests.get(fingerprint) || uid();
    requests.set(fingerprint, requestId);
    await api(path, { method, body: JSON.stringify({ ...payload, requestId }) });
    requests.clear();
  }

  return {
    reset: () => requests.clear(),
    save(form: FormState) {
      const path = form.id ? `${base}/entries/${form.id}` : `${base}/entries`;
      return writeEntry(path, form.id ? 'PATCH' : 'POST', entryInput(form));
    },
    remove(form: FormState, reason: DeletionReason, reasonNote: string) {
      if (!form.id || !form.version) {
        throw new Error('请重新打开要删除的账单');
      }
      return writeEntry(`${base}/entries/${form.id}`, 'DELETE', {
        version: form.version,
        reason,
        reasonNote,
      });
    },
    saveTemplate(form: FormState, name: string, id?: string) {
      return api(id ? `${base}/templates/${id}` : `${base}/templates`, {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(templateInput(form, name)),
      });
    },
    deleteTemplate(id: string) {
      return api(`${base}/templates/${id}`, { method: 'DELETE' });
    },
    addCategory(name: string, kind: Kind, icon: CategoryIconId) {
      return api<Category>(`${base}/categories`, {
        method: 'POST',
        body: JSON.stringify({ name, kind, icon }),
      });
    },
  };
}

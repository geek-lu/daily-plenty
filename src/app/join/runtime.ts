'use client';
/**
 * [INPUT]: 邀请 URL、公共 HTTP 客户端。
 * [OUTPUT]: 邀请加入状态与单次提交动作。
 * [POS]: join runtime；UI 不重复实现 API 或业务流程。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/features/ledger/api';

export function useJoin() {
  const token = useSearchParams().get('token') || '';
  const [newAccount, setNewAccount] = useState(false);
  const [form, setForm] = useState({ loginName: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  async function submit() {
    if (pending.current || !token) {
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      if (!newAccount) {
        await api('auth/session', {
          method: 'POST',
          body: JSON.stringify({ loginName: form.loginName, password: form.password }),
        });
      }
      await api('invites/accept', {
        method: 'POST',
        body: JSON.stringify({ token, ...(newAccount ? { account: form } : {}) }),
      });
      setDone(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : '加入失败，请重试');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return {
    token,
    newAccount,
    setNewAccount,
    form,
    setForm,
    done,
    busy,
    submit,
    error: token ? error : '邀请链接不完整，请让对方重新发送',
  };
}

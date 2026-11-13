'use client';
/** [INPUT]: 会话、账本概览及邀请 API。[OUTPUT]: 成员页邀请、复制、退出状态。
 * [POS]: together runtime；复制失败显示可选取链接，退出失败保持会话。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useState } from 'react';
import { useOverview } from '../ledger/useOverview';
import { api } from '../api';
export function useTogether() {
  const overview = useOverview();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [invitation, setInvitation] = useState<{ url: string; expiresAt: number } | null>(null);
  const members = overview.data?.members.filter((member) => !member.leftAt) || [];
  const canInvite =
    overview.data?.ledger.ownerUserId === overview.user?.id &&
    overview.data?.ledger.role === 'editor' &&
    members.length < 2;
  const copy = async (url = invitation?.url) => {
    if (!url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice('邀请链接已复制，可以发给对方了');
    } catch {
      setNotice('请长按下方链接复制，再发给对方');
    }
  };
  const invite = async () => {
    if (busy || !canInvite) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const value = await api<{ token: string; expiresAt: number }>(
        `ledgers/${overview.ledgerId}/invites`,
        { method: 'POST', body: '{}' },
      );
      const url = `${location.origin}/join?token=${value.token}`;
      setInvitation({ url, expiresAt: value.expiresAt });
      await copy(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : '邀请失败');
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    setBusy(true);
    setError('');
    try {
      await overview.logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : '退出失败，请重试');
    } finally {
      setBusy(false);
    }
  };
  return {
    ...overview,
    members,
    busy,
    error: error || overview.error,
    notice,
    invitation,
    canInvite,
    invite,
    copy,
    logout,
  };
}

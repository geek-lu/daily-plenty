'use client';
/** [INPUT]: 会话 API 与当前 URL。[OUTPUT]: 四页共享用户、账本、认证表单、退出及业务数据刷新版本。
 * [POS]: 横切会话 Provider；加载/登录/失败与业务页面分开。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Ledger, User } from '@/shared/types';
import { api, ApiError } from '../api';

function useSessionState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [mode, setMode] = useState<'loading' | 'setup' | 'login' | 'ready' | 'error'>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const invalidateData = useCallback(() => setDataVersion((value) => value + 1), []);
  const boot = useCallback(() => setRevision((value) => value + 1), []);
  const requireLogin = useCallback(() => {
    setMode('login');
    setUser(null);
    setLedgers([]);
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setMode('loading');
    setError('');
    const load = async () => {
      try {
        const status = await api<{ initialized: boolean }>('setup/status', {
          signal: abort.signal,
        });
        if (!status.initialized) {
          if (!abort.signal.aborted) {
            setMode('setup');
          }
          return;
        }
        const [me, homes] = await Promise.all([
          api<{ user: User }>('users/me', { signal: abort.signal }),
          api<{ ledgers: Ledger[] }>('ledgers', { signal: abort.signal }),
        ]);
        if (abort.signal.aborted) {
          return;
        }
        setUser(me.user);
        setLedgers(homes.ledgers);
        setMode('ready');
      } catch (e) {
        if (abort.signal.aborted) {
          return;
        }
        setUser(null);
        setLedgers([]);
        setMode(e instanceof ApiError && e.status === 401 ? 'login' : 'error');
        setError(e instanceof Error ? e.message : '加载失败，请重试');
      }
    };
    void load();
    return () => abort.abort();
  }, [revision]);
  const ledgerId = params.get('ledger') || ledgers[0]?.id || '';
  const selectLedger = (id: string) =>
    router.push(`${pathname}?${new URLSearchParams({ ledger: id })}`, { scroll: false });
  const logout = async () => {
    await api('auth/session', { method: 'DELETE' });
    requireLogin();
    router.replace('/');
  };
  return {
    mode,
    user,
    ledgers,
    ledgerId,
    error,
    boot,
    requireLogin,
    selectLedger,
    logout,
    dataVersion,
    invalidateData,
  };
}
const SessionContext = createContext<ReturnType<typeof useSessionState> | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const session = useSessionState();
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('页面需要共享会话布局');
  }
  return session;
}

export function useAuthForm(setup: boolean, onDone: () => void) {
  const [form, setForm] = useState({
    loginName: '',
    password: '',
    displayName: '',
    ledgerName: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(setup ? 'setup' : 'auth/session', {
        method: 'POST',
        body: JSON.stringify(setup ? form : { loginName: form.loginName, password: form.password }),
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };
  return { form, setForm, error, busy, submit };
}

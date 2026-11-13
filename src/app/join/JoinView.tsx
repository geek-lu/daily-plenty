'use client';
/**
 * [INPUT]: 邀请 runtime 与 Collapse 动效。
 * [OUTPUT]: 登录/创建账号并加入账本的表单及完成视图。
 * [POS]: join UI；仅渲染状态和转交动作，不直接发起请求。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Collapse } from '@/ui/motion';
import { useJoin } from './runtime';

export function JoinView() {
  const { token, newAccount, setNewAccount, form, setForm, error, done, busy, submit } = useJoin();
  return (
    <main className="motion-enter min-h-dvh paper grid place-items-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-11 w-10 place-items-center rounded-sm bg-accent text-3xl text-surface serif">
            余
          </span>
          <div className="serif text-xl tracking-[.16em]">日日有余</div>
        </div>
        <section
          key={done ? 'done' : 'join'}
          className="card motion-enter p-6 sm:p-8"
        >
          {done ? (
            <>
              <h1 className="serif text-3xl">已经加入小家。</h1>
              <p className="mt-3 text-sm leading-7 muted">返回首页，就能看到共同账本。</p>
              <a
                className="btn btn-primary mt-7 w-full"
                href="/"
              >
                打开账本
              </a>
            </>
          ) : (
            <>
              <span className="text-[11px] uppercase tracking-[.16em] muted">
                JOIN HOME / 加入小家
              </span>
              <h1 className="serif mt-3 text-3xl">一起记下好日子。</h1>
              <p className="mt-2 text-sm leading-7 muted">
                请登录或创建账号后确认加入。邀请链接只使用一次，过期后需要重新生成。
              </p>
              <button
                className="mt-5 text-xs text-accent underline underline-offset-4"
                disabled={busy}
                onClick={() => setNewAccount(!newAccount)}
              >
                {newAccount ? '已有账号？直接登录' : '还没有账号？创建账号'}
              </button>
              <form
                className="mt-4 grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <Collapse open={newAccount}>
                  <label className="block">
                    <span className="label">你的称呼</span>
                    <input
                      className="field"
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                      placeholder="比如：小满"
                      required={newAccount}
                      disabled={!newAccount || busy}
                    />
                  </label>
                </Collapse>
                <label>
                  <span className="label">登录账号</span>
                  <input
                    className="field"
                    value={form.loginName}
                    onChange={(e) => setForm({ ...form, loginName: e.target.value })}
                    disabled={busy}
                    autoComplete="username"
                    placeholder="比如：xiaoyu_02"
                    required
                  />
                </label>
                <label>
                  <span className="label">登录密码</span>
                  <input
                    className="field"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    autoComplete={newAccount ? 'new-password' : 'current-password'}
                    disabled={busy}
                    minLength={6}
                    placeholder="请输入至少 6 位密码"
                    required
                  />
                </label>
                {error && <p className="rounded bg-accent-soft p-3 text-sm text-accent">{error}</p>}
                <button
                  className="btn btn-primary mt-2 w-full"
                  disabled={busy || !token}
                >
                  {busy ? '正在加入…' : newAccount ? '创建账号并加入' : '登录并加入'}
                </button>
              </form>
              <a
                className="mt-5 block text-center text-xs muted underline underline-offset-4"
                href="/"
              >
                回到登录页
              </a>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

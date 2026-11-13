'use client';
/** [INPUT]: 登录/初始化 runtime 与公共淡入样式。[OUTPUT]: AuthView 认证表单。
 * [POS]: 共享会话入口；四个业务页面通过 Shell 统一鉴权。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useAuthForm } from './runtime';
export function AuthView({ setup, onDone }: { setup: boolean; onDone: () => void }) {
  const { form, setForm, error, busy, submit } = useAuthForm(setup, onDone);
  return (
    <main className="motion-enter min-h-dvh paper grid place-items-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-10 flex items-center gap-3">
          <span className="grid h-11 w-10 place-items-center rounded-sm bg-accent text-3xl text-surface serif">
            余
          </span>
          <div>
            <div className="serif text-xl tracking-[.16em]">日日有余</div>
            <div className="text-[10px] tracking-[.2em] muted">DAILY PLENTY</div>
          </div>
        </div>
        <section className="card p-6 sm:p-8">
          <span className="text-[11px] uppercase tracking-[.16em] muted">
            {setup ? 'FIRST DAY / 初次设置' : 'WELCOME BACK / 欢迎回来'}
          </span>
          <h1 className="serif mt-3 text-3xl">{setup ? '先把小家安顿好。' : '回来看看日子。'}</h1>
          <p className="mt-2 text-sm leading-7 muted">
            {setup
              ? '设置第一个账号和共同账本，之后邀请另一位成员加入。'
              : '两个人，一本账。每一笔日常都被好好记住。'}
          </p>
          <form
            className="mt-7 grid gap-4"
            onSubmit={submit}
          >
            {setup && (
              <>
                <label>
                  <span className="label">你的称呼</span>
                  <input
                    className="field"
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    placeholder="比如：小余"
                    required
                  />
                </label>
                <label>
                  <span className="label">账本名称</span>
                  <input
                    className="field"
                    value={form.ledgerName}
                    onChange={(e) => setForm({ ...form, ledgerName: e.target.value })}
                    placeholder="比如：我们的小家"
                    required
                  />
                </label>
              </>
            )}
            <label>
              <span className="label">登录账号</span>
              <input
                className="field"
                value={form.loginName}
                onChange={(e) => setForm({ ...form, loginName: e.target.value })}
                autoComplete="username"
                placeholder="比如：xiaoyu_01"
                required
              />
            </label>
            <label>
              <span className="label">
                登录密码 <small className="muted">/ 至少 6 位</small>
              </span>
              <input
                className="field"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                type="password"
                autoComplete={setup ? 'new-password' : 'current-password'}
                minLength={6}
                placeholder="请输入至少 6 位密码"
                required
              />
            </label>
            {error && (
              <p
                className="rounded bg-accent-soft p-3 text-sm text-accent"
                role="alert"
              >
                {error}
              </p>
            )}
            <button
              className="btn btn-primary mt-2 w-full"
              disabled={busy}
            >
              {busy ? '正在保存…' : setup ? '创建我的账本' : '登录账本'}
            </button>
          </form>
          {!setup && (
            <p className="mt-5 text-center text-xs muted">
              还没有账号？请让另一位成员发送邀请链接。
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

'use client';
/** [INPUT]: together runtime、当前会话、Presence 与桌面安装入口。[OUTPUT]: 姓名末字头像、成员关系、可渐入/退出的邀请、账号与 API 密钥设置入口。
 * [POS]: together 独立页面，不展示月度金额或账单筛选。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import Link from 'next/link';
import { InterfaceIcon } from '@/features/common/ui/InterfaceIcon';
import { useSession } from '@/features/common/session/runtime';
import { InstallCard } from '@/ui/pwa/InstallCard';
import { Presence } from '@/ui/motion';
import { useTogether } from '@/features/common/together/runtime';
import '@/features/common/together/avatar.css';
import './together.css';
export default function TogetherPage() {
  const { ledgerId } = useSession();
  return <TogetherContent key={ledgerId} />;
}
function TogetherContent() {
  const state = useTogether();
  return (
    <main className="main-page together-page">
      <header className="together-heading">
        <p className="page-eyebrow">A LITTLE HOME FOR TWO</p>
        <h1 className="serif text-3xl">我们的小家</h1>
        <p className="mt-3 text-sm muted">两个人，一本账，一起把日子过好。</p>
      </header>
      <p
        className="page-loading-status"
        role="status"
      >
        {state.loading ? '正在打开我们的小家…' : '\u00a0'}
      </p>
      {state.error && (
        <div
          className="page-error"
          role="alert"
        >
          {state.error}
          <button
            className="btn ml-3"
            onClick={state.reload}
          >
            重新加载
          </button>
        </div>
      )}
      <section
        className="together-home"
        aria-label="账本成员"
      >
        <label>
          <span className="label">共同账本</span>
          <select
            className="field"
            value={state.ledgerId}
            onChange={(e) => state.selectLedger(e.target.value)}
          >
            {state.ledgers.map((ledger) => (
              <option
                key={ledger.id}
                value={ledger.id}
              >
                {ledger.name}
              </option>
            ))}
          </select>
        </label>
        <div className="together-people">
          {state.members.map((member) => (
            <div
              className="together-person"
              key={member.id}
            >
              <span className="together-avatar serif">
                {Array.from(member.displayName.trim()).at(-1)}
              </span>
              <h2 className="mt-3 break-words">
                {member.displayName}
                {member.userId === state.user?.id && (
                  <span className="ml-1 text-xs muted">· 我</span>
                )}
              </h2>
              <p className="mt-1 text-xs muted">
                {member.role === 'editor' ? '可记账' : '只读成员'}
                {member.userId === state.data?.ledger.ownerUserId ? ' · 创建者' : ''}
              </p>
            </div>
          ))}
          {state.data && state.members.length < 2 && (
            <div className="together-person">
              <span className="together-avatar together-avatar-empty serif">待</span>
              <p className="mt-3 text-sm muted">留给另一位</p>
              <p className="mt-1 text-xs muted">一起记录生活</p>
            </div>
          )}
        </div>
        {state.canInvite && (
          <button
            className="btn btn-primary w-full"
            onClick={state.invite}
            disabled={state.busy || state.loading}
          >
            {state.busy ? '正在准备…' : '邀请另一位加入'}
          </button>
        )}
        <Presence show={Boolean(state.invitation)}>
          {state.invitation && (
            <div className="mt-4 rounded border border-line p-3">
              <label>
                <span className="label">邀请链接 · 仅可使用一次</span>
                <input
                  className="field text-sm"
                  readOnly
                  value={state.invitation.url}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <p className="mt-2 text-xs muted">
                有效至 {new Date(state.invitation.expiresAt).toLocaleString('zh-CN')}
              </p>
              <button
                className="btn mt-3 w-full"
                onClick={() => state.copy()}
              >
                复制邀请链接
              </button>
            </div>
          )}
        </Presence>
        <Presence show={Boolean(state.notice)}>
          {state.notice && (
            <p
              className="mt-3 text-sm text-positive"
              role="status"
            >
              {state.notice}
            </p>
          )}
        </Presence>
      </section>
      <section
        className="together-account"
        aria-label="我的账号"
      >
        <h2 className="mb-1 text-lg">我的账号</h2>
        <dl>
          <div>
            <dt>称呼</dt>
            <dd>{state.user?.displayName}</dd>
          </div>
          <div>
            <dt>登录账号</dt>
            <dd>{state.user?.loginName}</dd>
          </div>
          <div>
            <dt>当前权限</dt>
            <dd>
              {state.data
                ? state.data.ledger.role === 'editor'
                  ? '可查看、记账和修改'
                  : '可查看和导出'
                : '正在读取…'}
            </dd>
          </div>
        </dl>
        <Link
          className="btn mt-5 w-full justify-between"
          href={`/together/api-keys?${new URLSearchParams({ ledger: state.ledgerId })}`}
        >
          <span>API 密钥 · 连接 AI 助手</span>
          <InterfaceIcon
            name="arrow"
            size={16}
          />
        </Link>
        <button
          className="btn mt-5 w-full"
          onClick={state.logout}
          disabled={state.busy}
        >
          退出登录
        </button>
      </section>
      <InstallCard />
      <p className="together-note">
        账单共同可见，常用模板只属于自己。
        <br />
        每笔记录都保留付款人和录入人。
      </p>
    </main>
  );
}

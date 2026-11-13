'use client';
/** [INPUT]: common/together runtime、会话、Presence、桌面安装入口与 pc/shell 版式原子。
 * [OUTPUT]: PC 我们页整屏两栏：左栏成员与邀请，右栏账号与安装入口；内容超高时各自卡内滚动。
 * [POS]: pc/together 桌面视图；邀请/复制/退出逻辑与手机版共用。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useSession } from '@/features/common/session/runtime';
import { useTogether } from '@/features/common/together/runtime';
import '@/features/common/together/avatar.css';
import { InstallCard } from '@/ui/pwa/InstallCard';
import { Presence } from '@/ui/motion';
import { PcPage, PcPanel } from '../shell/PcPage';
import './together.css';

export default function TogetherPage() {
  const { ledgerId } = useSession();
  return <TogetherContent key={ledgerId} />;
}

function TogetherContent() {
  const state = useTogether();
  return (
    <PcPage
      eyebrow="A LITTLE HOME FOR TWO"
      title="我们的小家"
      subtitle="两个人，一本账，一起把日子过好。"
      status={state.loading ? '正在打开我们的小家…' : ''}
    >
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
      <div className="pc-together">
        <PcPanel
          fill
          title={state.data ? `共同账本 · ${state.data.ledger.name}` : '共同账本'}
        >
          <div className="pc-together-people">
            {state.members.map((member) => (
              <div
                className="pc-together-person"
                key={member.id}
              >
                <span className="together-avatar serif">
                  {Array.from(member.displayName.trim()).at(-1)}
                </span>
                <div className="min-w-0">
                  <h3 className="break-words">
                    {member.displayName}
                    {member.userId === state.user?.id && (
                      <span className="ml-1 text-xs muted">· 我</span>
                    )}
                  </h3>
                  <p className="mt-1 text-xs muted">
                    {member.role === 'editor' ? '可记账' : '只读成员'}
                    {member.userId === state.data?.ledger.ownerUserId ? ' · 创建者' : ''}
                  </p>
                </div>
              </div>
            ))}
            {state.data && state.members.length < 2 && (
              <div className="pc-together-person">
                <span className="together-avatar together-avatar-empty serif">待</span>
                <div>
                  <h3 className="muted">留给另一位</h3>
                  <p className="mt-1 text-xs muted">一起记录生活</p>
                </div>
              </div>
            )}
          </div>
          {state.canInvite && (
            <button
              className="btn btn-primary mt-6"
              onClick={state.invite}
              disabled={state.busy || state.loading}
            >
              {state.busy ? '正在准备…' : '邀请另一位加入'}
            </button>
          )}
          <Presence show={Boolean(state.invitation)}>
            {state.invitation && (
              <div className="pc-together-invite">
                <label>
                  <span className="label">邀请链接 · 仅可使用一次</span>
                  <input
                    className="field"
                    readOnly
                    value={state.invitation.url}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <button
                  className="btn"
                  onClick={() => state.copy()}
                >
                  复制链接
                </button>
                <p className="text-xs muted">
                  有效至 {new Date(state.invitation.expiresAt).toLocaleString('zh-CN')}
                </p>
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
          <p className="pc-together-note">
            账单共同可见，常用模板只属于自己；每笔记录都保留付款人和录入人。
          </p>
        </PcPanel>
        <div className="pc-together-side pc-scroll">
          <PcPanel title="我的账号">
            <dl className="pc-together-account">
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
            <button
              className="btn mt-5 w-full"
              onClick={state.logout}
              disabled={state.busy}
            >
              退出登录
            </button>
          </PcPanel>
          <InstallCard />
        </div>
      </div>
    </PcPage>
  );
}

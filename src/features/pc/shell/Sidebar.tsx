'use client';
/** [INPUT]: common/session 的会话、useTabLinks，记账上下文与界面图标。
 * [OUTPUT]: PC 左侧固定侧边栏：品牌、账本切换、记一笔、四页导航、当前用户与退出。
 * [POS]: pc/shell 桌面导航；与 m/shell/BottomBar 共用链接规则，内容区在右侧。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import Link from 'next/link';
import { InterfaceIcon } from '@/features/common/ui/InterfaceIcon';
import { useEntryComposer } from '@/features/common/entry/EntryComposer';
import { useSession } from '@/features/common/session/runtime';
import { stayOnActive, useTabLinks } from '@/features/common/session/useTabLinks';
import './sidebar.css';

export function Sidebar() {
  const composer = useEntryComposer();
  const links = useTabLinks();
  const session = useSession();
  return (
    <aside className="pc-sidebar">
      <div className="pc-brand">
        <span className="pc-brand-mark serif">余</span>
        <span>
          <span className="serif pc-brand-name">日日有余</span>
          <span className="pc-brand-en">DAILY PLENTY</span>
        </span>
      </div>
      {session.ledgers.length > 0 && (
        <label className="pc-ledger">
          <span className="label">当前账本</span>
          <span className="pc-ledger-control">
            <select
              className="field"
              value={session.ledgerId}
              onChange={(e) => session.selectLedger(e.target.value)}
            >
              {session.ledgers.map((ledger) => (
                <option
                  key={ledger.id}
                  value={ledger.id}
                >
                  {ledger.name}
                </option>
              ))}
            </select>
            <span
              className="pc-ledger-arrow"
              aria-hidden="true"
            >
              <InterfaceIcon
                name="arrow"
                size={16}
              />
            </span>
          </span>
        </label>
      )}
      <button
        type="button"
        className="btn btn-primary pc-create"
        onClick={composer.openEntry}
        disabled={!composer.canCreate}
        aria-label="记一笔"
        aria-haspopup="dialog"
        aria-expanded={composer.isOpen}
      >
        <InterfaceIcon
          name="plus"
          size={20}
        />
        记一笔
      </button>
      <nav
        className="pc-nav"
        aria-label="主导航"
      >
        {links.map((tab) => (
          <Link
            key={tab.path}
            href={tab.href}
            onClick={stayOnActive(tab.active)}
            className="pc-nav-item"
            aria-current={tab.active ? 'page' : undefined}
          >
            <InterfaceIcon
              name={tab.icon}
              size={20}
            />
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
      <div className="pc-user">
        <span className="pc-user-avatar serif">
          {Array.from(session.user?.displayName.trim() || '我').at(-1)}
        </span>
        <span className="pc-user-name">{session.user?.displayName}</span>
        <button
          type="button"
          className="pc-logout"
          onClick={() => void session.logout()}
        >
          退出
        </button>
      </div>
    </aside>
  );
}

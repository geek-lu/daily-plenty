/**
 * [INPUT]: 密钥元数据、加载/操作状态、撤销回调和共用图标。
 * [OUTPUT]: 紧凑的账本共享密钥列表、空状态、可使用数量与就地撤销确认。
 * [POS]: API 密钥纯展示组件，不接收或查询完整密钥。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ApiKey } from '@/shared/types';
import { InterfaceIcon } from '../ui/InterfaceIcon';

const date = (value: number) =>
  new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export function KeyList({
  keys,
  loading,
  busy,
  confirmId,
  onConfirm,
  onRevoke,
}: {
  keys: ApiKey[];
  loading: boolean;
  busy: boolean;
  confirmId: string | null;
  onConfirm: (id: string | null) => void;
  onRevoke: (id: string) => void;
}) {
  return (
    <section
      className="api-keys-list-panel"
      aria-labelledby="keys-list-heading"
      aria-busy={loading}
    >
      <header className="api-keys-list-header">
        <div>
          <h2 id="keys-list-heading">账本共享密钥</h2>
          <p>可记账成员共同管理，随时撤销连接。</p>
        </div>
        {!loading && (
          <span className="api-keys-count">
            {keys.filter((key) => !key.revokedAt).length} 枚可使用
          </span>
        )}
      </header>
      {loading && (
        <p
          className="api-keys-loading"
          role="status"
        >
          正在读取密钥…
        </p>
      )}
      {!loading && keys.length === 0 && (
        <div className="api-keys-empty">
          <span className="api-keys-empty-icon">
            <InterfaceIcon
              name="key"
              size={28}
            />
          </span>
          <h3>还没有连接的助手</h3>
          <p>生成第一枚密钥，开始用一句话记账。</p>
          <span>一枚密钥，为整个账本服务。</span>
        </div>
      )}
      <ul className="api-keys-list">
        {keys.map((key) => (
          <li
            key={key.id}
            data-revoked={Boolean(key.revokedAt)}
          >
            <div className="api-key-heading">
              <div className="api-key-name">
                <span className="api-key-icon">
                  <InterfaceIcon
                    name="key"
                    size={20}
                  />
                </span>
                <h3>{key.name}</h3>
              </div>
              <span className="api-key-status">{key.revokedAt ? '已撤销' : '可使用'}</span>
            </div>
            <div className="api-key-info">
              <p className="api-key-ledger">账本：{key.ledgerName}</p>
              <code className="api-key-prefix">{key.prefix}••••••••</code>
              <p className="api-key-meta">
                由 {key.creatorName} 生成 · {date(key.createdAt)}
              </p>
            </div>
            <div className="api-key-footer">
              <p>
                {key.revokedAt
                  ? `撤销于 ${date(key.revokedAt)}`
                  : key.lastUsedAt
                    ? `最近使用 ${date(key.lastUsedAt)}`
                    : '尚未使用'}
              </p>
              {!key.revokedAt && confirmId !== key.id && (
                <button
                  className="api-key-revoke"
                  disabled={busy}
                  onClick={() => onConfirm(key.id)}
                  aria-label={`撤销 ${key.name}`}
                >
                  撤销密钥
                </button>
              )}
            </div>
            {!key.revokedAt && confirmId === key.id && (
              <div
                className="api-key-confirm"
                role="group"
                aria-label={`撤销 ${key.name}`}
              >
                <p>撤销后，使用「{key.name}」的助手将无法继续连接。</p>
                <div className="api-keys-actions">
                  <button
                    className="btn"
                    disabled={busy}
                    onClick={() => onConfirm(null)}
                  >
                    取消
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => onRevoke(key.id)}
                  >
                    确认撤销
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

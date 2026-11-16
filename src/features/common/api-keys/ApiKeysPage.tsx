'use client';
/**
 * [INPUT]: 密钥 runtime、会话账本、KeyList 与共用 MUJI 图标/控件。
 * [OUTPUT]: 密钥设置主面板、一次性成功视图与按需展开的接入说明及仅 AI 可修改的权限范围。
 * [POS]: 两端共享设置视图；PC 左生成右列表，手机顺序阅读。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import Link from 'next/link';
import { useSession } from '../session/runtime';
import { InterfaceIcon } from '../ui/InterfaceIcon';
import { useApiKeys } from './runtime';
import { KeyList } from './KeyList';
import './api-keys.css';

export default function ApiKeysPage() {
  const { ledgerId } = useSession();
  const state = useApiKeys();
  const back = ledgerId ? `/together?${new URLSearchParams({ ledger: ledgerId })}` : '/together';
  return (
    <main className="main-page api-keys-page">
      <nav
        className="api-keys-breadcrumb"
        aria-label="页面位置"
      >
        <Link
          href={back}
          className="api-keys-back"
        >
          <span className="api-keys-back-icon">
            <InterfaceIcon
              name="arrow"
              size={16}
            />
          </span>
          我们
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">助手连接</span>
      </nav>
      <header className="api-keys-header">
        <div>
          <h1 className="serif">API 密钥</h1>
          <p>把日常的一句话，交给 AI 助手记下来。</p>
        </div>
        <span className="api-keys-shared">
          <InterfaceIcon
            name="people"
            size={16}
          />
          账本成员共享
        </span>
      </header>
      {state.error && (
        <div
          className="page-error"
          role="alert"
        >
          {state.error}
          <button
            className="btn ml-3"
            disabled={state.busy || state.loading}
            onClick={state.reload}
          >
            刷新列表
          </button>
        </div>
      )}
      {state.notice && (
        <p
          className="api-keys-notice"
          role="status"
        >
          {state.notice}
        </p>
      )}
      <div className="api-keys-workspace">
        <section
          className="api-keys-create"
          aria-labelledby="keys-create-heading"
        >
          <span className="api-keys-symbol">
            <InterfaceIcon
              name="key"
              size={24}
            />
          </span>
          <h2 id="keys-create-heading">{state.created ? '密钥已生成' : '连接一个助手'}</h2>
          <p className="api-keys-description">
            {state.created
              ? '完整密钥只显示这一次，请现在保存。'
              : '为账本生成密钥，在你的助手中配置一次。'}
          </p>
          {state.created ? (
            <div className="api-key-secret">
              <div className="api-key-secret-context">
                <strong>{state.created.key.name}</strong>
                <span>账本：{state.created.key.ledgerName}</span>
              </div>
              <label>
                <span className="label">完整密钥</span>
                <textarea
                  className="field"
                  readOnly
                  rows={3}
                  value={state.created.token}
                  onFocus={(event) => event.target.select()}
                  spellCheck={false}
                />
              </label>
              <p>关闭后无法再次查看。遗失时可撤销并重新生成。</p>
              <button
                className="btn btn-primary"
                onClick={() => void state.copy()}
              >
                复制密钥
              </button>
              <button
                className="btn"
                onClick={state.dismiss}
              >
                我已保存，关闭
              </button>
            </div>
          ) : (
            <form
              onSubmit={state.generate}
              className="api-keys-form"
            >
              <label>
                <span className="label">绑定账本</span>
                <select
                  className="field"
                  required
                  value={state.targetLedgerId}
                  onChange={(event) => state.setTargetLedgerId(event.target.value)}
                  disabled={state.busy}
                >
                  <option
                    value=""
                    disabled
                  >
                    请选择账本
                  </option>
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
              <label>
                <span className="label">给密钥起个名字</span>
                <input
                  className="field"
                  required
                  maxLength={30}
                  placeholder="例如：Work Buddy"
                  value={state.name}
                  onChange={(event) => state.setName(event.target.value)}
                  disabled={state.busy}
                  autoComplete="off"
                  aria-describedby="key-name-help"
                />
                <span
                  id="key-name-help"
                  className="api-keys-field-help"
                >
                  用助手的名字，方便以后辨认。
                </span>
              </label>
              {state.ledgers.length === 0 && (
                <p className="api-keys-description">只有可记账成员可以管理账本密钥。</p>
              )}
              <button
                className="btn btn-primary"
                type="submit"
                disabled={
                  state.busy ||
                  state.loading ||
                  !state.name.trim() ||
                  !state.ledgers.some((ledger) => ledger.id === state.targetLedgerId)
                }
              >
                <InterfaceIcon
                  name="plus"
                  size={16}
                />
                {state.busy ? '正在生成…' : '生成密钥'}
              </button>
            </form>
          )}
          <p className="api-keys-scope">可查询、新增账单，仅可修改 AI 创建的记录，不能删除。</p>
        </section>
        <KeyList
          keys={state.keys}
          loading={state.loading}
          busy={state.busy}
          confirmId={state.confirmId}
          onConfirm={state.setConfirmId}
          onRevoke={state.revoke}
        />
      </div>
      <details className="api-keys-help">
        <summary>
          <span>
            <strong>如何在助手中使用</strong>
            <span className="api-keys-help-caption">支持 Work Buddy 等 AI 助手</span>
          </span>
          <span className="api-keys-help-arrow">
            <InterfaceIcon
              name="arrow"
              size={16}
            />
          </span>
        </summary>
        <div className="api-keys-help-body">
          <ol>
            <li>
              <strong>导入记账 Skill</strong>
              <p>将日日有余记账 Skill 添加到你的 AI 助手。</p>
            </li>
            <li>
              <strong>填写私有配置</strong>
              <p>填入服务器地址和完整密钥，支持 HTTP。配置值保存在助手中，不写进 Skill 文件。</p>
            </li>
            <li>
              <strong>说一句，记一笔</strong>
              <p>
                例如“我午饭吃牛肉汤花了 28 元”。助手根据对话选择录入人；账单显示 AI
                来源，可随时人工修正。
              </p>
            </li>
          </ol>
          <dl>
            <div>
              <dt>服务器地址</dt>
              <dd>
                <code>DAILY_PLENTY_BASE_URL</code>
              </dd>
            </div>
            <div>
              <dt>账本密钥</dt>
              <dd>
                <code>DAILY_PLENTY_API_KEY</code>
              </dd>
            </div>
          </dl>
        </div>
      </details>
    </main>
  );
}

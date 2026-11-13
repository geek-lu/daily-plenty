'use client';
/** [INPUT]: 账本/账单身份、写权限与 useComments。[OUTPUT]: EntryComments 主评论和一级平铺的持续回复。
 * [POS]: 两端首页及明细列表项共用评论区；纯文本展示，不注入 HTML。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useEffect, useRef } from 'react';
import type { EntryComment } from '@/shared/types';
import { useComments } from './useComments';

export function EntryComments({
  ledgerId,
  entryId,
  canWrite = true,
  composing = false,
  onCompose,
  onCountChange,
}: {
  ledgerId: string;
  entryId: string;
  canWrite?: boolean;
  composing?: boolean;
  onCompose?: () => void;
  onCountChange?: (count: number) => void;
}) {
  const state = useComments(ledgerId, entryId);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (composing) {
      input.current?.focus();
    }
  }, [composing]);
  useEffect(() => {
    if (!state.loading && !state.error) {
      onCountChange?.(state.comments.length);
    }
  }, [state.loading, state.error, state.comments.length, onCountChange]);
  const replies = new Map<string, EntryComment[]>();
  for (const comment of state.comments) {
    if (comment.rootId) {
      const items = replies.get(comment.rootId) || [];
      items.push(comment);
      replies.set(comment.rootId, items);
    }
  }
  const renderComment = (comment: EntryComment) => (
    <article
      className="entry-discussion-message"
      key={comment.id}
    >
      <div className="entry-discussion-content">
        <div className="entry-discussion-byline">
          <span className="entry-discussion-author">{comment.authorName}</span>
          {comment.replyToName && (
            <span className="entry-discussion-target">回复 {comment.replyToName}</span>
          )}
        </div>
        <p className="entry-discussion-text">{comment.content}</p>
        <div className="entry-discussion-meta">
          <time dateTime={comment.createdAt}>
            {new Date(comment.createdAt).toLocaleString('zh-CN', { hour12: false })}
          </time>
          {canWrite && (
            <button
              type="button"
              className="entry-discussion-reply"
              disabled={state.busy}
              onClick={() => {
                state.setReplyTo(comment);
                onCompose?.();
                input.current?.focus();
              }}
            >
              回复
            </button>
          )}
        </div>
      </div>
    </article>
  );
  if (!state.comments.length && !composing && !state.error) {
    return null;
  }
  return (
    <section
      className="entry-discussion"
      aria-label="账单评论"
    >
      <div className="entry-discussion-header">
        <h2>账单评论</h2>
        <button
          type="button"
          className="text-xs muted"
          disabled={state.loading || state.busy}
          onClick={state.reload}
        >
          刷新评论
        </button>
      </div>
      {state.loading && (
        <p
          className="mt-3 text-sm muted"
          role="status"
        >
          正在加载评论…
        </p>
      )}
      {state.comments
        .filter((comment) => !comment.rootId)
        .map((comment) => (
          <div
            key={comment.id}
            className="entry-discussion-thread"
          >
            {renderComment(comment)}
            {replies.has(comment.id) && (
              <div className="entry-discussion-replies">
                {replies.get(comment.id)!.map(renderComment)}
              </div>
            )}
          </div>
        ))}
      {state.error && (
        <p
          className="mt-3 text-sm text-accent"
          role="alert"
        >
          {state.error}
        </p>
      )}
      {canWrite && composing && (
        <div className="entry-discussion-compose">
          {state.replyTo && (
            <div className="mb-2 flex items-center justify-between text-xs muted">
              <span>回复 {state.replyTo.authorName}</span>
              <button
                type="button"
                disabled={state.busy}
                onClick={() => state.setReplyTo(null)}
              >
                取消回复
              </button>
            </div>
          )}
          <label
            className="sr-only"
            htmlFor={`comment-${entryId}`}
          >
            {state.replyTo ? '回复内容' : '评论内容'}
          </label>
          <div className="entry-discussion-input">
            <textarea
              ref={input}
              id={`comment-${entryId}`}
              className="field"
              rows={1}
              maxLength={1000}
              value={state.content}
              disabled={state.busy}
              placeholder="说说这笔日常…"
              onChange={(event) => state.setContent(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={state.loading || state.busy || !state.content.trim()}
              onClick={() => void state.submit()}
            >
              {state.busy ? '发送中…' : state.replyTo ? '发送回复' : '发表评论'}
            </button>
          </div>
          {state.content.length > 0 && (
            <p className="mt-1 text-xs muted">{state.content.length} / 1000</p>
          )}
        </div>
      )}
    </section>
  );
}

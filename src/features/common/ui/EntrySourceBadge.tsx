/**
 * [INPUT]: 公共 EntrySource 与 MUJI 来源样式。
 * [OUTPUT]: 渐变色 AI 标签；人工及历史缺省来源不显示标签。
 * [POS]: 两端账单列表、详情和编辑抽屉共用的只读来源展示。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { EntrySource } from '@/shared/types';
import './entry-source.css';

export function EntrySourceBadge({ source = 'manual' }: { source?: EntrySource }) {
  if (source !== 'ai') {
    return null;
  }
  return (
    <span
      className="entry-source-badge"
      data-source={source}
      aria-label="AI 记录"
      title="AI 记录"
    >
      AI
    </span>
  );
}

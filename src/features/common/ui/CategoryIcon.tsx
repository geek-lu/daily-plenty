/** [INPUT]: 共享图标目录与图标标识。[OUTPUT]: 统一线条分类图标。[POS]: 纯展示组件，未知标识回退通用图标。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { categoryIcons, type CategoryIconId } from '@/shared/category-icons';
export function CategoryIcon({ name, size = 24 }: { name?: string; size?: number }) {
  const icon =
    name && Object.hasOwn(categoryIcons, name)
      ? categoryIcons[name as CategoryIconId]
      : categoryIcons.tag;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="block shrink-0"
    >
      <path d={icon.path} />
    </svg>
  );
}

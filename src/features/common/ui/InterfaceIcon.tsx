/** [INPUT]: 界面图标名称与尺寸。[OUTPUT]: 语义明确、统一笔画的导航及操作 SVG 图标。
 * [POS]: ledger 纯展示组件，与分类图标使用同一 24px 画布。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
const paths = {
  book: 'M6 3h14v18H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z M7 3v14 M3 18a3 3 0 0 1 3-3h14 M11 7h5 M11 10h5',
  chart: 'M4 3v18h17 M8 17v-5 M13 17V7 M18 17V4',
  list: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M8 7h.01 M11 7h5 M8 12h.01 M11 12h5 M8 17h.01 M11 17h5',
  people:
    'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M2 21v-2a6 6 0 0 1 12 0v2 M17 3a4 4 0 0 1 0 8 M18 14a5 5 0 0 1 4 5v2',
  calendar:
    'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z M7 3v4 M17 3v4 M3 11h18 M7 15h2 M13 15h2',
  plus: 'M12 5v14 M5 12h14',
  key: 'M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M10 11v10 M10 16h4 M10 20h3',
  close: 'm6 6 12 12 M18 6 6 18',
  arrow: 'm9 5 7 7-7 7',
} as const;
export type InterfaceIconName = keyof typeof paths;
export function InterfaceIcon({ name, size = 20 }: { name: InterfaceIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="block shrink-0"
    >
      <path d={paths[name]} />
    </svg>
  );
}

/** [INPUT]: 当前路由、查询参数与已访问地址。[OUTPUT]: 四个页面的稳定导航目标。
 * [POS]: shell 纯规则；按账本保存各页条件，不把明细筛选带入统计。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
export const tabs = [
  { path: '/', label: '账本', icon: 'book' },
  { path: '/reports', label: '统计', icon: 'chart' },
  { path: '/records', label: '明细', icon: 'list' },
  { path: '/together', label: '我们', icon: 'people' },
] as const;
export function tabHref(path: string, ledger: string, remembered: Record<string, string>) {
  return (
    remembered[`${ledger}:${path}`] ||
    (ledger ? `${path}?${new URLSearchParams({ ledger })}` : path)
  );
}

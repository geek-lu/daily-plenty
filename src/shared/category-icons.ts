/** [INPUT]: 无运行依赖。[OUTPUT]: 分类图标白名单、中文标签、SVG 路径和默认映射。
 * [POS]: 共享配置层，供界面、校验和初始化使用，不依赖 React。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
export const categoryIconIds = [
  'food',
  'leaf',
  'bus',
  'bag',
  'home',
  'game',
  'health',
  'shirt',
  'mortgage',
  'bolt',
  'phone',
  'book',
  'salary',
  'award',
  'wallet',
  'laptop',
  'chart',
  'envelope',
  'paw',
  'coffee',
  'gift',
  'travel',
  'tag',
] as const;
export type CategoryIconId = (typeof categoryIconIds)[number];
export const categoryIcons: Record<CategoryIconId, { label: string; path: string }> = {
  food: { label: '餐饮', path: 'M4 3v6a3 3 0 0 0 6 0V3 M7 3v18 M18 3c-3 3-3 7 0 9h2 M20 3v18' },
  leaf: { label: '买菜', path: 'M20 4C8 2 2 8 5 15s16 5 15-11Z M4 21 16 9' },
  bus: {
    label: '交通',
    path: 'M6 18v3 M18 18v3 M5 11h14 M5 16h.01 M19 16h.01 M7 3h10a3 3 0 0 1 3 3v12H4V6a3 3 0 0 1 3-3Z',
  },
  bag: { label: '购物', path: 'M5 8h14l2 13H3L5 8Z M8 8V6a4 4 0 0 1 8 0v2' },
  home: { label: '居家', path: 'm3 10 9-7 9 7 M5 9v12h14V9 M9 21v-8h6v8' },
  game: {
    label: '娱乐',
    path: 'M8 8h8c3 0 4 2 5 9s-4 3-6 0H9c-2 3-7 7-6 0s2-9 5-9Z M6 12h4 M8 10v4 M16 12h.01 M18 14h.01',
  },
  health: { label: '健康', path: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z' },
  shirt: { label: '服饰', path: 'm8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c0 4-8 4-8 0Z' },
  mortgage: {
    label: '房贷',
    path: 'm3 10 9-7 9 7 M5 10v11h14V10 M10 11l2 3 2-3 M9 15h6 M9 18h6 M12 14v6',
  },
  bolt: { label: '水电', path: 'm13 2-9 12h7l-1 8L21 9h-8l0-7Z' },
  phone: {
    label: '通讯',
    path: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z M10 5h4 M12 18h.01',
  },
  book: {
    label: '学习',
    path: 'M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Z M12 5v16',
  },
  salary: {
    label: '工资',
    path: 'M3 7h18v14H3V7Z M8 7V3h8v4 M3 12c6 4 12 4 18 0 M10 13h4v4h-4v-4Z',
  },
  award: {
    label: '奖金',
    path: 'M8 3h8v7a4 4 0 0 1-8 0V3Z M8 5H3v3a5 5 0 0 0 6 5 M16 5h5v3a5 5 0 0 1-6 5 M12 14v7 M7 21h10',
  },
  wallet: { label: '其他收入', path: 'M4 5h14V3L4 5Z M4 5h16v16H4V5Z M20 11h-6v5h6 M16 13.5h.01' },
  laptop: { label: '兼职', path: 'M5 3h14v13H5V3Z M5 16l-3 4h20l-3-4 M9 20h6' },
  chart: { label: '理财', path: 'M3 3v18h18 M6 15l5-5 4 3 6-7 M16 6h5v5' },
  envelope: { label: '红包', path: 'M5 3h14v18H5V3Z M5 6l7 5 7-5 M10 13l2 2 2-2 M9 16h6 M12 15v4' },
  paw: {
    label: '宠物',
    path: 'M8 13c2-4 6-4 8 0 6 6 2 9-4 6-6 3-10 0-4-6Z M6 5a2 3 0 1 0 0 6 2 3 0 0 0 0-6 M10 2a2 3 0 1 0 0 6 2 3 0 0 0 0-6 M16 3a2 3 0 1 0 0 6 2 3 0 0 0 0-6 M20 8a2 3 0 1 0 0 6 2 3 0 0 0 0-6',
  },
  coffee: {
    label: '咖啡',
    path: 'M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z M16 9h2a3 3 0 0 1 0 6h-2 M3 22h16 M7 2v3 M12 2v3',
  },
  gift: {
    label: '礼物',
    path: 'M3 8h18v4H3V8Z M5 12v9h14v-9 M12 8v13 M12 8C2 8 5-3 12 8c7-11 10 0 0 0Z',
  },
  travel: { label: '旅行', path: 'm2 12 8 2 2 8 3-7 7-12-12 7-8 2Z M10 14l12-11' },
  tag: { label: '通用', path: 'M3 3h8l10 10-8 8L3 11V3Z M7 7h.01' },
};
export const defaultCategoryIcons: Record<string, CategoryIconId> = {
  餐饮: 'food',
  买菜: 'leaf',
  交通: 'bus',
  购物: 'bag',
  居家: 'home',
  娱乐: 'game',
  健康: 'health',
  服饰: 'shirt',
  房贷: 'mortgage',
  水电: 'bolt',
  通讯: 'phone',
  学习: 'book',
  工资: 'salary',
  奖金: 'award',
  其他收入: 'wallet',
  兼职: 'laptop',
  理财: 'chart',
  红包: 'envelope',
};
export const defaultCategoryIcon = (name: string): CategoryIconId =>
  defaultCategoryIcons[name] || 'tag';

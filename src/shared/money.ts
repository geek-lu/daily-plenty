/** [INPUT]: 人民币文本或整数分。[OUTPUT]: 精确转换、格式化与业务日期。[POS]: L3 纯规则，无 UI / 存储依赖。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
export function parseAmount(value: string): number | null {
  if (!/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/.test(value.trim())) {
    return null;
  }
  const [whole, fraction = ''] = value.trim().split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return amount > 0 ? amount : null;
}
export const money = (amount: number) =>
  (amount / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function today(timezone = 'Asia/Shanghai') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** [INPUT]: 无运行依赖。[OUTPUT]: 删除原因标识、中文选项和说明长度限制。[POS]: 前后端共享配置。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
export const deletionReasonIds = [
  'duplicate',
  'wrong_amount',
  'wrong_category',
  'not_needed',
  'other',
] as const;
export type DeletionReason = (typeof deletionReasonIds)[number];
export const deletionReasons: Record<DeletionReason, string> = {
  duplicate: '重复记账',
  wrong_amount: '金额记错',
  wrong_category: '分类或付款人选错',
  not_needed: '不需要记录',
  other: '其他原因',
};
export const deletionNoteLimit = 200;

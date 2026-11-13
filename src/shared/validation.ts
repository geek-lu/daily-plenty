/** [INPUT]: Zod、分类图标与删除原因白名单。[OUTPUT]: 输入约束，含高级筛选及日/月/年统计范围。[POS]: 边界校验，不含权限判断。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { z } from 'zod';
import { categoryIconIds } from './category-icons';
import { deletionReasonIds, deletionNoteLimit } from './deletion-reasons';
export const uuid = z.string().uuid();
const name = z.string().trim().min(1, '请填写名称').max(30, '名称最多 30 字');
export const credentials = z.object({
  loginName: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,32}$/, '账号用 3–32 位字母、数字或下划线'),
  password: z.string().min(6, '密码至少 6 位').max(128, '密码最多 128 位'),
});
export const signup = credentials.extend({ displayName: name });
export const setupInput = signup.extend({
  setupToken: z.string().min(24).optional(),
  ledgerName: name,
});
export const profileInput = z.object({ displayName: name }).strict();
export const date = z
  .string()
  .regex(/^20\d{2}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, '日期无效');
export const entryInput = z.object({
  kind: z.enum(['expense', 'income']),
  amountMinor: z.number().int().positive().max(99_999_999),
  categoryId: uuid,
  paidByMemberId: uuid,
  note: z.string().trim().max(120).default(''),
  occurredOn: date,
});
export const createEntryInput = entryInput.extend({ requestId: uuid }).strict();
export const categoryInput = z
  .object({
    name,
    kind: z.enum(['expense', 'income']),
    icon: z.enum(categoryIconIds, { error: '请选择有效的分类图标' }).default('tag'),
  })
  .strict();
export const templateInput = entryInput.omit({ occurredOn: true }).extend({ name }).strict();
export const updateEntryInput = entryInput
  .extend({ version: z.number().int().positive(), requestId: uuid })
  .strict();
const mutationIdentity = { version: z.number().int().positive(), requestId: uuid };
export const deleteInput = z.discriminatedUnion('deleted', [
  z
    .object({
      ...mutationIdentity,
      deleted: z.literal(true),
      reason: z.enum(deletionReasonIds, { error: '请选择删除原因' }),
      reasonNote: z.string().trim().max(deletionNoteLimit, '原因说明最多 200 字').default(''),
    })
    .strict()
    .refine((value) => value.reason !== 'other' || value.reasonNote.length > 0, {
      message: '请填写其他原因的具体说明',
      path: ['reasonNote'],
    }),
  z.object({ ...mutationIdentity, deleted: z.literal(false) }).strict(),
]);
export const inviteInput = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/), account: signup.optional() })
  .strict();
export const filterInput = z.object({
  month: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/),
  kind: z.enum(['all', 'expense', 'income']).default('all'),
  memberId: z.union([uuid, z.literal('all')]).default('all'),
  search: z.string().trim().max(120).default(''),
  cursor: z.string().max(80).optional(),
});
export const reportInput = z.discriminatedUnion('granularity', [
  z
    .object({
      granularity: z.literal('day'),
      period: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/, '请选择有效的月份'),
    })
    .strict(),
  z
    .object({
      granularity: z.literal('month'),
      period: z.string().regex(/^20\d{2}$/, '请选择有效的年份'),
    })
    .strict(),
  z.object({ granularity: z.literal('year') }).strict(),
]);
const optionalDate = z.preprocess((value) => (value === '' ? undefined : value), date.optional());
const optionalAmount = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.coerce.number().int().min(0).max(99_999_999).optional(),
);
export const recordsInput = z
  .object({
    start: optionalDate,
    end: optionalDate,
    kind: z.enum(['all', 'expense', 'income']).default('all'),
    categoryIds: z.preprocess(
      (value) => (typeof value === 'string' ? (value ? value.split(',') : []) : value),
      z.array(uuid).max(100).default([]),
    ),
    memberId: z.union([uuid, z.literal('all')]).default('all'),
    creatorId: z.union([uuid, z.literal('all')]).default('all'),
    minAmount: optionalAmount,
    maxAmount: optionalAmount,
    search: z.string().trim().max(120).default(''),
    sort: z.enum(['newest', 'oldest', 'amount_desc', 'amount_asc']).default('newest'),
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  })
  .refine((value) => !value.start || !value.end || value.start <= value.end, {
    message: '开始日期不能晚于结束日期',
    path: ['end'],
  })
  .refine(
    (value) =>
      value.minAmount === undefined ||
      value.maxAmount === undefined ||
      value.minAmount <= value.maxAmount,
    { message: '最低金额不能大于最高金额', path: ['maxAmount'] },
  );

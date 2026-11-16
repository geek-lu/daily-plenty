/** [INPUT]: 无运行依赖。[OUTPUT]: 账本共享密钥、录入人候选、账单及原始来源、评论、日/月/年统计、筛选分页及共用录入表单契约。[POS]: L0 公共业务语言。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
export type Kind = 'expense' | 'income';
export type EntrySource = 'manual' | 'ai';
export type User = { id: string; displayName: string; loginName: string };
export type ApiKey = {
  id: string;
  createdBy: string;
  creatorName: string;
  ledgerId: string;
  ledgerName: string;
  name: string;
  prefix: string;
  createdAt: number;
  lastUsedAt: number | null;
  revokedAt: number | null;
};
export type CreatedApiKey = { key: ApiKey; token: string };
export type Recorder = { memberId: string; userId: string; displayName: string };
export type Ledger = {
  id: string;
  name: string;
  ownerUserId: string;
  timezone: string;
  baseCurrencyCode: string;
  role: 'editor' | 'viewer';
};
export type Member = {
  id: string;
  userId: string;
  displayName: string;
  role: 'editor' | 'viewer';
  leftAt: string | null;
};
export type Category = {
  id: string;
  name: string;
  icon: string;
  kind: Kind;
  sortOrder: number;
  archivedAt: string | null;
};
export type Entry = {
  id: string;
  ledgerId: string;
  source: EntrySource;
  kind: Kind;
  amountMinor: number;
  currencyCode: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  paidByMemberId: string;
  payerName: string;
  note: string;
  occurredOn: string;
  createdBy: string;
  creatorName: string;
  updatedBy: string;
  version: number;
  deletedAt: string | null;
  deleteReason: string | null;
  deleteReasonNote: string | null;
};
export type EntryComment = {
  id: string;
  entryId: string;
  authorId: string;
  authorName: string;
  rootId: string | null;
  replyToId: string | null;
  replyToName: string | null;
  content: string;
  createdAt: string;
};
export type EntryInput = {
  kind: Kind;
  amountMinor: number;
  categoryId: string;
  paidByMemberId: string;
  note: string;
  occurredOn: string;
};
export type EntryMutation = EntryInput & { requestId: string; version?: number };
export type TemplateInput = Omit<EntryInput, 'occurredOn'> & { name: string };
export type EntryTemplate = TemplateInput & {
  id: string;
  ledgerId: string;
  userId: string;
  currencyCode: string;
  createdAt: string;
  updatedAt: string;
};
export type Filters = { month: string; kind: 'all' | Kind; memberId: string; search: string };
export type Summary = {
  income: number;
  expense: number;
  count: number;
  categories: { name: string; icon: string; amount: number }[];
  members: { name: string; amount: number }[];
};
export type LedgerData = {
  ledger: Ledger;
  members: Member[];
  categories: Category[];
  templates: EntryTemplate[];
  entries: Entry[];
  nextCursor: string | null;
  summary: Summary;
};
export type ReportGranularity = 'day' | 'month' | 'year';
export type ReportFilters = { granularity: ReportGranularity; period?: string };
export type ReportPoint = { period: string; expense: number; count: number };
export type ReportData = {
  ledger: Ledger;
  granularity: ReportGranularity;
  start: string;
  end: string;
  points: ReportPoint[];
  summary: Summary;
};
export type Invite = {
  id: string;
  expiresAt: number;
  consumedAt: number | null;
  revokedAt: number | null;
};
export type RecordsFilters = {
  start?: string;
  end?: string;
  kind: 'all' | Kind;
  categoryIds: string[];
  memberId: string;
  creatorId: string;
  minAmount?: number;
  maxAmount?: number;
  search: string;
  sort: 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';
  page: number;
};
export type RecordsData = {
  ledger: Ledger;
  categories: Category[];
  members: Member[];
  entries: Entry[];
  totals: { income: number; expense: number; count: number };
  page: number;
  pageSize: number;
  totalPages: number;
};

export type FormState = {
  id?: string;
  source?: EntrySource;
  kind: 'expense' | 'income';
  amount: string;
  categoryId: string;
  paidByMemberId: string;
  occurredOn: string;
  note: string;
  version?: number;
};

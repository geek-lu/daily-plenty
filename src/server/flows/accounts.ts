/**
 * [INPUT]: user/auth/ledger 服务与数据库事务。
 * [OUTPUT]: 首次建家、凭据登录及邀请加入的跨域流程。
 * [POS]: server flows；账户与账本共同创建必须同事务，不依赖 Next 或 Cookie。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { randomBytes } from 'node:crypto';
import { atomic, type Store } from '../db/client';
import { AppError, ensure } from '@/shared/errors';
import { setupInput, credentials, inviteInput } from '@/shared/validation';
import * as users from '../user/service';
import * as auth from '../auth/service';
import * as ledgers from '../ledger/service';
import * as invites from '../ledger/invitations';

const runtime = globalThis as typeof globalThis & { dailyPlentySetupToken?: string };
function setupToken() {
  return (
    process.env.DAILY_PLENTY_SETUP_TOKEN ||
    (runtime.dailyPlentySetupToken ??= randomBytes(32).toString('hex'))
  );
}

export function setupStatus(store: Store) {
  return { initialized: users.initialized(store), configured: Boolean(setupToken()) };
}

export async function setup(store: Store, raw: unknown) {
  const input = setupInput.parse(raw);
  if (input.setupToken && !auth.equalSecret(input.setupToken, setupToken())) {
    throw new AppError(403, '初始化请求无效');
  }
  ensure(!users.initialized(store), 409, '系统已经完成初始化');
  const passwordHash = await auth.hashPassword(input.password);
  const result = atomic(store, () => {
    ensure(!users.initialized(store), 409, '系统已经完成初始化');
    const user = users.create(store, {
      loginName: input.loginName,
      displayName: input.displayName,
      passwordHash,
    });
    return { user, ledgerId: ledgers.createHome(store, user.id, input.ledgerName) };
  });
  return { data: result, sessionToken: auth.createSession(store, result.user.id) };
}

export async function login(store: Store, raw: unknown, address: string) {
  const input = credentials.parse(raw);
  auth.rateLimit(store, `${address}:${input.loginName}`);
  const found = users.credential(store, input.loginName);
  ensure(
    found && !found.disabledAt && (await auth.verifyPassword(input.password, found.passwordHash)),
    401,
    '账号或密码不正确',
  );
  return {
    data: { user: users.profile(store, found.id), ledgers: ledgers.listLedgers(store, found.id) },
    sessionToken: auth.createSession(store, found.id),
  };
}

export async function acceptInvite(store: Store, raw: unknown, signedIn: string | null) {
  const input = inviteInput.parse(raw);
  if (signedIn) {
    return { data: { ledgerId: atomic(store, () => invites.join(store, signedIn, input.token)) } };
  }
  const account = input.account;
  ensure(account, 401, '请先登录或创建账号后加入');
  const passwordHash = await auth.hashPassword(account.password);
  const result = atomic(store, () => {
    const user = users.create(store, {
      loginName: account.loginName,
      displayName: account.displayName,
      passwordHash,
    });
    return { user, ledgerId: invites.join(store, user.id, input.token) };
  });
  return { data: result, sessionToken: auth.createSession(store, result.user.id) };
}

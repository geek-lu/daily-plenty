/** [INPUT]: pnpm build 生成的生产路由及 Next 请求处理器。
 * [OUTPUT]: 无端口的页面/API/PWA 检查，含生产 HTTP/HTTPS Cookie 与完整记账流程。[POS]: 使用内存数据库和模拟 HTTP 响应，不修改用户账本。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import assert from 'node:assert/strict';
import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { randomUUID } from 'node:crypto';
import next from 'next';
import { MockedResponse } from 'next/dist/server/lib/mock-request.js';

process.env.DATABASE_PATH = ':memory:';
delete process.env.DAILY_PLENTY_SETUP_TOKEN;
process.env.NODE_ENV = 'production';
process.env.DAILY_PLENTY_LOCAL_PREVIEW = 'false';
const publicHttp = process.env.DAILY_PLENTY_ALLOW_HTTP === 'true';
const app = next({ dev: false, dir: process.cwd(), hostname: 'localhost', port: 3000 });
async function request(method, path, expected, body, cookie) {
  const req = new IncomingMessage(new Socket());
  req.url = path.startsWith('/') ? path : `/api/${path}`;
  req.method = method;
  req.headers = {
    host: publicHttp ? '203.0.113.10:3000' : 'localhost:3000',
    ...(cookie ? { cookie } : {}),
  };
  if (body !== undefined) {
    const payload = JSON.stringify(body);
    req.headers['content-type'] = 'application/json';
    req.headers['content-length'] = String(Buffer.byteLength(payload));
    req.push(payload);
  }
  req.push(null);
  const chunks = [];
  const res = new MockedResponse({
    socket: req.socket,
    resWriter: (chunk) => {
      chunks.push(Buffer.from(chunk));
      return true;
    },
  });
  await app.getRequestHandler()(req, res);
  await res.hasStreamed;
  const text = Buffer.concat(chunks).toString();
  assert.equal(res.statusCode, expected, `${method} ${req.url}: ${text.slice(0, 200)}`);
  const session = res.getHeader('set-cookie');
  if (session) {
    assert.equal(/;\s*Secure(?:;|$)/i.test(session), !publicHttp);
    assert.match(session, /;\s*HttpOnly/i);
    assert.match(session, /;\s*SameSite=Lax/i);
  }
  const data = res.getHeader('content-type')?.includes('application/json')
    ? JSON.parse(text)
    : text;
  console.log(`PASS ${method} ${req.url.split('?')[0]} → ${res.statusCode}`);
  return {
    data,
    bytes: Buffer.concat(chunks),
    headers: res.getHeaders(),
    cookie: res.getHeader('set-cookie')?.split(';')[0],
  };
}

try {
  await app.prepare();
  const manifest = await request('GET', '/manifest.webmanifest', 200);
  assert.match(String(manifest.headers['content-type']), /application\/manifest\+json/);
  const install = JSON.parse(manifest.data);
  assert.equal(install.name, '日日有余');
  assert.equal(install.display, 'standalone');
  assert.equal(install.start_url, '/');
  const worker = await request('GET', '/sw.js', 200);
  assert.match(String(worker.headers['content-type']), /javascript/);
  assert.match(String(worker.headers['cache-control']), /no-store/);
  assert.equal(worker.headers['service-worker-allowed'], '/');
  const offline = await request('GET', '/offline.html', 200);
  assert.ok(offline.data.includes('记账和查看账单需要联网'));
  for (const icon of [...install.icons, { src: '/icons/apple-touch-icon.png', sizes: '180x180' }]) {
    const response = await request('GET', icon.src, 200);
    assert.match(String(response.headers['content-type']), /image\/png/);
    assert.equal(
      `${response.bytes.readUInt32BE(16)}x${response.bytes.readUInt32BE(20)}`,
      icon.sizes,
    );
  }
  for (const path of ['/', '/reports?month=2026-10', '/records?kind=expense', '/together']) {
    const page = await request('GET', path, 200);
    assert.ok(page.data.includes('rel="manifest"'));
    assert.ok(page.data.includes('/icons/apple-touch-icon.png'));
    assert.ok(page.data.includes('apple-mobile-web-app-capable'));
    assert.ok(page.data.includes('name="mobile-web-app-capable"'));
    const viewport = page.data.match(/<meta name="viewport" content="([^"]+)"/)?.[1] || '';
    assert.match(viewport, /maximum-scale=1/);
    assert.match(viewport, /user-scalable=no/);
    assert.equal(
      (page.data.match(/<nav[^>]*aria-label="主导航"/g) || []).length,
      0,
      `${path}: no business navigation before authentication`,
    );
    assert.equal(
      (page.data.match(/<button[^>]*aria-label="记一笔"/g) || []).length,
      0,
      `${path}: no entry action before authentication`,
    );
  }
  await request('GET', 'setup/status', 200);
  await request('GET', 'users/me', 401);
  await request('GET', '/config', 404);
  const owner = await request('POST', 'setup', 200, {
    loginName: 'owner',
    password: '123456',
    displayName: '小余',
    ledgerName: '小家',
  });
  const cookie = owner.cookie;
  assert.ok(cookie);
  const config = await request('GET', '/config?table=users', 200, undefined, cookie);
  assert.ok(config.data.includes('••••••') && !config.data.includes('scrypt$'));
  const ledgerId = owner.data.ledgerId;
  const base = `ledgers/${ledgerId}`;
  const current = await request('GET', 'users/me', 200, undefined, cookie);
  assert.equal(current.data.user.id, owner.data.user.id);
  await request('GET', 'ledgers', 200, undefined, cookie);
  const home = await request('GET', `${base}/data?month=2026-11`, 200, undefined, cookie);
  const category = await request(
    'POST',
    `${base}/categories`,
    201,
    { name: '宠物', kind: 'expense', icon: 'paw' },
    cookie,
  );
  assert.equal(category.data.icon, 'paw');
  await request(
    'POST',
    `${base}/categories`,
    400,
    { name: '非法图标', kind: 'expense', icon: 'unknown' },
    cookie,
  );
  const payload = {
    name: '猫粮',
    kind: 'expense',
    amountMinor: 12900,
    categoryId: category.data.id,
    paidByMemberId: home.data.members[0].id,
    note: '每月采购',
  };
  const template = await request('POST', `${base}/templates`, 201, payload, cookie);
  const ownList = await request('GET', `${base}/templates`, 200, undefined, cookie);
  assert.equal(ownList.data.templates.length, 1);
  await request(
    'PATCH',
    `${base}/templates/${template.data.id}`,
    200,
    { ...payload, amountMinor: 9900 },
    cookie,
  );
  const invite = await request('POST', `${base}/invites`, 201, {}, cookie);
  const partner = await request('POST', 'invites/accept', 200, {
    token: invite.data.token,
    account: { loginName: 'partner', password: '123456', displayName: '小满' },
  });
  const partnerList = await request('GET', `${base}/templates`, 200, undefined, partner.cookie);
  assert.deepEqual(partnerList.data.templates, []);
  const partnerHome = await request(
    'GET',
    `${base}/data?month=2026-11`,
    200,
    undefined,
    partner.cookie,
  );
  assert.deepEqual(partnerHome.data.templates, []);
  assert.ok(
    partnerHome.data.categories.some((item) => item.id === category.data.id && item.icon === 'paw'),
  );
  await request('PATCH', `${base}/templates/${template.data.id}`, 404, payload, partner.cookie);
  await request('DELETE', `${base}/templates/${template.data.id}`, 404, undefined, partner.cookie);
  const { name, ...entryInput } = payload;
  const entry = await request(
    'POST',
    `${base}/entries`,
    201,
    { ...entryInput, occurredOn: '2026-11-10', requestId: randomUUID() },
    cookie,
  );
  assert.equal(entry.data.categoryIcon, 'paw');
  const report = await request('GET', `${base}/data?month=2026-11`, 200, undefined, cookie);
  assert.equal(report.data.summary.categories[0].icon, 'paw');
  await request(
    'PATCH',
    `${base}/entries/${entry.data.id}`,
    200,
    {
      ...entryInput,
      amountMinor: 9900,
      occurredOn: '2026-11-10',
      version: 1,
      requestId: randomUUID(),
    },
    cookie,
  );
  for (const [query, period, count] of [
    ['granularity=day&period=2026-11', '2026-11-10', 30],
    ['granularity=month&period=2026', '2026-11', 12],
    ['granularity=year', '2026', null],
  ]) {
    const trend = await request('GET', `${base}/reports?${query}`, 200, undefined, cookie);
    assert.equal(trend.data.summary.expense, 9900);
    assert.deepEqual(
      trend.data.points.find((point) => point.period === period),
      { period, expense: 9900, count: 1 },
    );
    assert.equal(
      trend.data.points.reduce((sum, point) => sum + point.expense, 0),
      9900,
    );
    if (count) {
      assert.equal(trend.data.points.length, count);
    }
  }
  await request('GET', `${base}/reports?granularity=day&period=2026-13`, 400, undefined, cookie);
  await request('GET', `${base}/reports?granularity=week`, 400, undefined, cookie);
  await request('GET', `ledgers/${randomUUID()}/reports?granularity=year`, 403, undefined, cookie);
  const recordsParams = new URLSearchParams({
    start: '2026-10-31',
    end: '2026-11-10',
    categoryIds: category.data.id,
    memberId: home.data.members[0].id,
    creatorId: owner.data.user.id,
    minAmount: '9900',
    maxAmount: '9900',
    search: '每月',
    sort: 'amount_desc',
  });
  const matching = await request('GET', `${base}/entries?${recordsParams}`, 200, undefined, cookie);
  assert.equal(matching.data.entries[0].id, entry.data.id);
  assert.deepEqual(matching.data.totals, { count: 1, expense: 9900, income: 0 });
  assert.equal(matching.data.pageSize, 30);
  const filteredCsv = await request(
    'GET',
    `${base}/entries/export?${recordsParams}`,
    200,
    undefined,
    cookie,
  );
  assert.ok(filteredCsv.data.includes('"99.00"'));
  const emptyRecords = await request('GET', `${base}/entries?kind=income`, 200, undefined, cookie);
  assert.equal(emptyRecords.data.totals.count, 0);
  await request('GET', `${base}/entries?start=2026-11-11&end=2026-11-10`, 400, undefined, cookie);
  await request('GET', `${base}/entries/export?minAmount=2&maxAmount=1`, 400, undefined, cookie);
  await request('DELETE', `${base}/templates/${template.data.id}`, 200, undefined, cookie);
  await request('GET', `${base}/export?month=2026-11`, 200, undefined, cookie);
  await request(
    'DELETE',
    `${base}/entries/${entry.data.id}`,
    400,
    { version: 2, requestId: randomUUID() },
    cookie,
  );
  await request(
    'DELETE',
    `${base}/entries/${entry.data.id}`,
    400,
    { version: 2, requestId: randomUUID(), reason: 'other', reasonNote: '   ' },
    cookie,
  );
  const removed = await request(
    'DELETE',
    `${base}/entries/${entry.data.id}`,
    200,
    { version: 2, requestId: randomUUID(), reason: 'duplicate', reasonNote: '重复录入' },
    cookie,
  );
  assert.equal(removed.data.deleteReason, 'duplicate');
  assert.equal(removed.data.deleteReasonNote, '重复录入');
  const afterDelete = await request('GET', `${base}/entries`, 200, undefined, cookie);
  assert.equal(afterDelete.data.totals.count, 0);
  const deletedTrend = await request(
    'GET',
    `${base}/reports?granularity=month&period=2026`,
    200,
    undefined,
    cookie,
  );
  assert.equal(deletedTrend.data.summary.expense, 0);
  assert.ok(deletedTrend.data.points.every((point) => point.expense === 0 && point.count === 0));
  await request('DELETE', 'auth/session', 200, undefined, cookie);
  await request('GET', 'users/me', 401, undefined, cookie);
  await request('GET', `${base}/entries`, 401, undefined, cookie);
  await request('GET', `${base}/entries/export`, 401, undefined, cookie);
  await request('GET', `${base}/reports?granularity=year`, 401, undefined, cookie);
  await request('POST', 'auth/session', 200, { loginName: 'owner', password: '123456' });
  console.log('生产路由检查通过；未监听端口，未写入用户数据库。');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await app.close();
}

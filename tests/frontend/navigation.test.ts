/** [INPUT]: 导航纯规则、共享布局、React SSR 与公共动效组件。[OUTPUT]: 认证前无底栏、导航隔离、唯一 key 和折叠可访问性回归。
 * [POS]: 导航状态验证，不依赖浏览器或用户数据。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import test from 'node:test';
import assert from 'node:assert/strict';
import { tabs, tabHref } from '@/features/shell/navigation';

test('login/setup/loading hide business navigation; authenticated pages keep one bottom bar', async () => {
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const ts = await import('typescript');
  const react = await import('react');
  const jsx = await import('react/jsx-runtime');
  const { renderToStaticMarkup } = await import('react-dom/server');
  let mode = 'loading';
  const exports: { default?: React.ComponentType<React.PropsWithChildren> } = {};
  const source = readFileSync(
    new URL('../../src/features/shell/AppShell.tsx', import.meta.url),
    'utf8',
  );
  const imports: Record<string, unknown> = {
    react,
    'react/jsx-runtime': jsx,
    'next/link': { default: (props: object) => react.createElement('a', props) },
    'next/navigation': { usePathname: () => '/', useSearchParams: () => new URLSearchParams() },
    '../ledger/ui/InterfaceIcon': { InterfaceIcon: () => null },
    '../entry/EntryComposer': {
      EntryComposerProvider: react.Fragment,
      useEntryComposer: () => ({ canCreate: true, isOpen: false, openEntry: () => {} }),
    },
    './AuthView': { AuthView: () => react.createElement('main', null, '认证表单') },
    './runtime': {
      SessionProvider: react.Fragment,
      useSession: () => ({
        mode,
        user: mode === 'ready' ? { id: 'user' } : null,
        ledgerId: 'ledger',
        error: '加载失败',
        boot: () => {},
      }),
    },
    './navigation': { tabs, tabHref },
    './shell.css': {},
  };
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports, require: (name: string) => imports[name] },
  );
  const render = (child: React.ReactNode = react.createElement('main', null, '业务内容')) =>
    renderToStaticMarkup(react.createElement(exports.default!, null, child));
  for (const state of ['loading', 'login', 'setup', 'error', 'ready', 'login']) {
    mode = state;
    const html = render();
    if (state === 'ready') {
      assert.equal((html.match(/aria-label="主导航"/g) || []).length, 1);
      assert.equal((html.match(/aria-label="记一笔"/g) || []).length, 1);
      for (const tab of tabs) {
        assert.ok(html.includes(tab.label));
      }
      assert.match(html, /data-ready="true"/);
      assert.match(html, /业务内容/);
    } else {
      assert.doesNotMatch(html, /aria-label="主导航"|aria-label="记一笔"|业务内容/);
      assert.match(html, /data-ready="false"/);
    }
  }
  mode = 'ready';
  const PendingPage = () => {
    throw new Promise(() => {});
  };
  const pending = render(react.createElement(PendingPage));
  assert.match(pending, /正在打开页面/);
  assert.equal((pending.match(/aria-label="主导航"/g) || []).length, 1);
  assert.equal((pending.match(/aria-label="记一笔"/g) || []).length, 1);
});

test('four independent destinations keep each ledger and page query separate', () => {
  assert.deepEqual(
    tabs.map((tab) => tab.path),
    ['/', '/reports', '/records', '/together'],
  );
  const remembered = {
    'home-a:/records': '/records?ledger=home-a&search=%E6%99%9A%E9%A5%AD&minAmount=1000&page=3',
    'home-a:/reports': '/reports?ledger=home-a&month=2026-10',
  };
  assert.equal(tabHref('/records', 'home-a', remembered), remembered['home-a:/records']);
  assert.equal(tabHref('/reports', 'home-a', remembered), remembered['home-a:/reports']);
  assert.equal(tabHref('/records', 'home-b', remembered), '/records?ledger=home-b');
  assert.equal(tabHref('/together', 'home-a', remembered), '/together?ledger=home-a');
  assert.equal(tabHref('/', 'home-a', remembered), '/?ledger=home-a');
  assert.equal(tabHref('/records', '', {}), '/records');
});

test('motion boundaries render accessible collapsed state without imperative DOM writes', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const ts = await import('typescript');
  const react = await import('react');
  const jsx = await import('react/jsx-runtime');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const exports: Record<string, React.ComponentType<any>> = {};
  const source = readFileSync(new URL('../../src/ui/motion.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(compiled, {
    exports,
    require: (name: string) => (name === 'react' ? react : jsx),
  });
  const child = react.createElement('button', null, '可操作内容');
  const closed = renderToStaticMarkup(
    react.createElement(exports.Collapse, { open: false, id: 'filters' }, child),
  );
  assert.ok(closed.includes('inert=""') && closed.includes('aria-hidden="true"'));
  assert.ok(closed.includes('可操作内容'), 'collapsed controls stay mounted to retain draft state');
  const open = renderToStaticMarkup(react.createElement(exports.Collapse, { open: true }, child));
  assert.ok(!open.includes('inert=') && open.includes('aria-hidden="false"'));
  assert.equal(
    renderToStaticMarkup(react.createElement(exports.Presence, { show: false }, child)),
    '',
  );
  assert.ok(
    renderToStaticMarkup(react.createElement(exports.Presence, { show: true }, child)).includes(
      'data-state="visible"',
    ),
  );
  for (const root of ['features', 'ui']) {
    const dir = new URL(`../../src/${root}/`, import.meta.url);
    for (const path of readdirSync(dir, { recursive: true }).filter((path) =>
      /\.tsx?$/.test(String(path)),
    )) {
      const content = readFileSync(new URL(String(path), dir), 'utf8');
      assert.doesNotMatch(
        content,
        /document\.createElement|appendChild\(|removeChild\(|\.innerHTML\s*=|\.classList\.|\.style\.(?:setProperty|\w+\s*=)|Object\.assign\([^,]*\.style/,
        `${root}/${path}: interface must be rendered by React`,
      );
    }
  }
});

// ---- 使用真实 JSX runtime 检查页面兄弟元素；注入查询状态，无需浏览器 ----
test('records page keeps filter and result identities distinct for the same query', async () => {
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const ts = await import('typescript');
  const jsx = await import('react/jsx-runtime');
  const { isValidElement } = await import('react');
  const source = readFileSync(
    new URL('../../src/features/records/RecordsPage.tsx', import.meta.url),
    'utf8',
  );
  let state = {
    query: 'ledger=7936fca0-9a89-4877-b0e1-2384495553ca',
    filters: {},
    ledgers: [],
    data: { categories: [], members: [] },
    loading: false,
    error: '',
    notice: '',
  };
  const render = (code: string) => {
    const exports: { default?: () => unknown } = {};
    const compiled = ts.transpileModule(code, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    runInNewContext(compiled, {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') {
          return jsx;
        }
        if (name === './runtime') {
          return { useRecords: () => state };
        }
        // 子组件在此检查中只作为 React 元素，副作用不执行。
        return new Proxy({}, { get: (_, key) => String(key) });
      },
    });
    return exports.default!();
  };
  let keyedGroups = 0;
  const check = (node: unknown): void => {
    if (!isValidElement<{ children?: unknown }>(node)) {
      return;
    }
    const children = Array.isArray(node.props.children)
      ? node.props.children.flat(Infinity)
      : [node.props.children];
    const keys = children
      .filter(isValidElement)
      .map((child) => child.key)
      .filter((key) => key !== null);
    if (keys.length > 1) {
      keyedGroups++;
    }
    assert.equal(new Set(keys).size, keys.length, `duplicate sibling keys: ${keys.join(', ')}`);
    children.forEach(check);
  };
  check(render(source));
  assert.ok(keyedGroups > 0, 'regression must exercise both filter and loaded results');
  state = { ...state, query: state.query + '&search=晚饭&page=2', loading: true };
  check(render(source));
  // 还原用户遇到的同 key 写法，证明该检查能捕捉原错误。
  const previous = source
    .replace('key={`filters:${state.query}`}', 'key={state.query}')
    .replace('key={`results:${state.query}`}', 'key={state.query}');
  assert.throws(() => check(render(previous)), /duplicate sibling keys/);
});

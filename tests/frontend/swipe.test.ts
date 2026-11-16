/**
 * [INPUT]: SwipeReveal、EntryRow、EntryDrawer 的真实组件与隔离 React/指针事件。
 * [OUTPUT]: 手势方向、误触隔离、键盘/禁用行为、权限和直接删除确认回归。
 * [POS]: 前端交互回归，不替代浏览器或手机实机验证。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function harness(file: string, imports: Record<string, unknown> = {}) {
  const slots: any[] = [];
  let cursor = 0;
  let effects: (() => void)[] = [];
  const hooks = {
    useState(initial: unknown) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        (value: unknown) => {
          slots[i] = value;
        },
      ];
    },
    useRef(initial: unknown) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: initial };
      return slots[i];
    },
    useEffect(effect: () => void, deps: unknown[]) {
      const i = cursor++;
      if (!slots[i] || deps.some((value, index) => value !== slots[i][index])) {
        slots[i] = deps;
        effects.push(effect);
      }
    },
    useId: () => 'test-id',
  };
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const exports: Record<string, any> = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(`../../src/${file}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name: string) =>
        ({ react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx }, ...imports })[name] || {},
    },
  );
  return (name: string, props: unknown) => {
    cursor = 0;
    const result = exports[name](props);
    effects.forEach((effect) => effect());
    effects = [];
    return result;
  };
}

function swipe() {
  const render = harness('ui/SwipeReveal.tsx');
  let calls = 0;
  let captured = false;
  const props = { enabled: true, actionLabel: '删除', children: '账单', onAction: () => calls++ };
  const tree = () => render('SwipeReveal', props);
  const content = () => tree().props.children[0].props;
  const action = () => tree().props.children[1].props.children.props;
  const pointer = (x: number, y = 0) => ({
    pointerType: 'touch',
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
    target: {
      setPointerCapture: () => {
        captured = true;
      },
    },
    currentTarget: {
      setPointerCapture: () => {
        captured = true;
      },
      hasPointerCapture: () => captured,
      releasePointerCapture: () => {
        captured = false;
      },
    },
  });
  const drag = (x: number, y = 0) => {
    content().onPointerDown(pointer(0));
    content().onPointerMove(pointer(x, y));
    content().onPointerUp(pointer(x, y));
  };
  const click = (detail = 1) => {
    let stopped = false;
    content().onClickCapture({
      detail,
      preventDefault() {},
      stopPropagation: () => {
        stopped = true;
      },
    });
    return stopped;
  };
  const key = (key: string) => tree().props.onKeyDown({ key, preventDefault() {} });
  return {
    props,
    tree,
    content,
    action,
    pointer,
    drag,
    click,
    key,
    calls: () => calls,
    captured: () => captured,
  };
}

test('left swipe only reveals delete; post-drag click cannot edit or close the revealed action', () => {
  const ui = swipe();
  assert.equal(ui.action().disabled, true);
  assert.equal(ui.tree().props.children[1].props.hidden, true);
  assert.equal(ui.tree().props.children[1].props.inert, true);
  ui.drag(70);
  assert.equal(ui.tree().props['data-open'], false);
  ui.click();
  ui.drag(-70);
  assert.equal(ui.content().style.transform, 'translateX(-88px)');
  assert.equal(ui.tree().props['data-open'], true);
  assert.equal(ui.tree().props.children[1].props.hidden, false);
  assert.equal(ui.captured(), false);
  assert.equal(ui.click(), true);
  assert.equal(ui.tree().props['data-open'], true);
  assert.equal(ui.calls(), 0);
  ui.action().onClick();
  assert.equal(ui.calls(), 1);
  assert.equal(ui.tree().props['data-open'], false);
  assert.equal(ui.tree().props.children[1].props.hidden, true);
});

test('tap remains editable, small horizontal drag snaps closed, vertical scrolling never captures', () => {
  const ui = swipe();
  ui.drag(4, 3);
  assert.equal(ui.click(), false);
  ui.drag(-25);
  assert.equal(ui.tree().props['data-open'], false);
  assert.equal(ui.tree().props.children[1].props.hidden, true);
  assert.equal(ui.click(), true);
  ui.content().onPointerDown(ui.pointer(0));
  ui.content().onPointerMove(ui.pointer(12, 80));
  assert.equal(ui.captured(), false);
  assert.equal(ui.content().style.transform, 'translateX(0px)');
  ui.content().onPointerUp(ui.pointer(12, 80));
  assert.equal(ui.click(), true);
  assert.equal(ui.calls(), 0);
});

test('right swipe, tapping opened content and cancelled pointer close without deleting', () => {
  const ui = swipe();
  ui.drag(-80);
  ui.click();
  ui.drag(60);
  assert.equal(ui.tree().props['data-open'], false);
  ui.click();
  ui.drag(-80);
  ui.click();
  ui.content().onPointerDown(ui.pointer(0));
  ui.content().onPointerUp(ui.pointer(0));
  assert.equal(ui.click(), true);
  assert.equal(ui.tree().props['data-open'], false);
  ui.content().onPointerDown(ui.pointer(0));
  ui.content().onPointerMove(ui.pointer(-70));
  assert.equal(ui.tree().props.children[1].props.hidden, false);
  assert.equal(ui.action().disabled, true);
  ui.content().onPointerCancel(ui.pointer(-70));
  assert.equal(ui.content().style.transform, 'translateX(0px)');
  assert.equal(ui.tree().props.children[1].props.hidden, true);
  assert.equal(ui.click(), true);
  assert.equal(ui.calls(), 0);
});

test('keyboard opens/closes; losing permission resets and removes action', () => {
  const ui = swipe();
  ui.key('ArrowLeft');
  assert.equal(ui.action().disabled, false);
  ui.key('Escape');
  assert.equal(ui.action().disabled, true);
  ui.key('ArrowLeft');
  ui.key('ArrowRight');
  assert.equal(ui.action().disabled, true);
  ui.key('ArrowLeft');
  ui.props.enabled = false;
  assert.equal(ui.tree().props.children[1], false);
  ui.key('ArrowLeft');
  ui.drag(-90);
  assert.equal(ui.content().style.transform, 'translateX(0px)');
  ui.props.enabled = true;
  assert.equal(ui.tree().props['data-open'], false);
  assert.equal(ui.calls(), 0);
});

test('mouse captures at press so moving beyond the row still completes a short swipe', () => {
  const ui = swipe();
  const down = { ...ui.pointer(0), pointerType: 'mouse' };
  let containerCaptures = 0;
  down.currentTarget.setPointerCapture = () => {
    containerCaptures++;
  };
  ui.content().onPointerDown(down);
  assert.equal(ui.captured(), true);
  assert.equal(containerCaptures, 0, 'ordinary click keeps its original button target');
  ui.content().onPointerMove(ui.pointer(-7));
  assert.equal(ui.content().style.transform, 'translateX(-7px)');
  ui.content().onPointerMove(ui.pointer(-30));
  ui.content().onPointerUp(ui.pointer(-30));
  assert.equal(ui.tree().props['data-open'], true);
  assert.equal(ui.captured(), false);
  assert.equal(ui.click(), true);
  assert.equal(ui.calls(), 0);
  ui.drag(30);
  assert.equal(ui.tree().props['data-open'], false);
});

test('ambiguous diagonal start can become horizontal instead of locking scrolling immediately', () => {
  const ui = swipe();
  ui.content().onPointerDown(ui.pointer(0));
  ui.content().onPointerMove(ui.pointer(-11, 10));
  assert.equal(ui.captured(), false);
  ui.content().onPointerMove(ui.pointer(-32, 12));
  ui.content().onPointerUp(ui.pointer(-32, 12));
  assert.equal(ui.tree().props['data-open'], true);
  assert.equal(ui.calls(), 0);
});

test('capture transfer from child does not cancel the drag; losing own capture does', () => {
  const ui = swipe();
  ui.content().onPointerDown(ui.pointer(0));
  ui.content().onPointerMove(ui.pointer(-15));
  ui.content().onLostPointerCapture({ ...ui.pointer(-15), target: {} });
  ui.content().onPointerMove(ui.pointer(-65));
  ui.content().onPointerUp(ui.pointer(-65));
  assert.equal(ui.tree().props['data-open'], true);
  ui.content().onPointerDown(ui.pointer(0));
  ui.content().onPointerMove(ui.pointer(10));
  const lost = ui.pointer(10);
  ui.content().onLostPointerCapture({ ...lost, target: lost.currentTarget });
  assert.equal(ui.content().style.transform, 'translateX(0px)');
  assert.equal(ui.calls(), 0);
});

test('row exposes deletion only to writable idle entries, independently of AI/manual source', () => {
  const render = harness('features/common/ui/EntryRow.tsx', {
    '@/shared/money': { money: () => '1.00' },
  });
  let selected: unknown;
  const entry = { id: 'entry', source: 'ai', note: '' };
  const props = {
    entry,
    canWrite: true,
    disabled: false,
    onEdit() {},
    onDelete: (value: unknown) => {
      selected = value;
    },
  };
  const reveal = () => render('EntryRow', props).props.children[0].props.children.props;
  assert.equal(reveal().enabled, true);
  reveal().onAction();
  assert.equal(selected, entry);
  entry.source = 'manual';
  assert.equal(reveal().enabled, true);
  props.canWrite = false;
  assert.equal(reveal().enabled, false);
  props.canWrite = true;
  props.disabled = true;
  assert.equal(reveal().enabled, false);
});

test('swipe entry point opens existing reason confirmation; cancel closes without deleting', () => {
  const DeleteEntryDialog = () => null;
  const render = harness('features/common/ui/EntryDrawer.tsx', {
    './DeleteEntryDialog': { DeleteEntryDialog },
  });
  let closed = 0;
  let deleted = 0;
  const onDelete = () => {
    deleted++;
  };
  const tree = render('EntryDrawer', {
    initialDeleting: true,
    open: true,
    onDelete,
    deleteSummary: '午饭 ¥20',
    busy: false,
    error: '',
    onClose: () => {
      closed++;
    },
  });
  assert.equal(tree.type, DeleteEntryDialog);
  assert.equal(tree.props.summary, '午饭 ¥20');
  assert.equal(tree.props.onDelete, onDelete);
  assert.equal(deleted, 0);
  tree.props.onCancel();
  assert.equal(closed, 1);
  assert.equal(deleted, 0);
});

/**
 * [INPUT]: TouchGestures 真实组件与可取消的模拟触摸事件。
 * [OUTPUT]: 双指/Safari 缩放拦截、单指滚动放行、非取消事件和卸载清理回归。
 * [POS]: 浏览器适配单元测试，不等同于 iOS 实机验证。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('pinch is prevented without blocking single-finger movement; listeners clean up', () => {
  const document = new EventTarget();
  let cleanup: (() => void) | undefined;
  const exports: { TouchGestures?: () => null } = {};
  const source = readFileSync(new URL('../../src/ui/TouchGestures.tsx', import.meta.url), 'utf8');
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      document,
      require: () => ({
        useEffect: (setup: () => () => void) => {
          cleanup = setup();
        },
      }),
    },
  );
  assert.equal(exports.TouchGestures!(), null);
  const dispatch = (type: string, fingers = 0, cancelable = true) => {
    const event = new Event(type, { cancelable });
    Object.defineProperty(event, 'touches', { value: Array.from({ length: fingers }) });
    document.dispatchEvent(event);
    return event.defaultPrevented;
  };
  assert.equal(dispatch('touchmove', 1), false);
  assert.equal(dispatch('touchmove', 2), true);
  assert.equal(dispatch('touchmove', 3), true);
  assert.equal(dispatch('gesturestart'), true);
  assert.equal(dispatch('gesturechange'), true);
  assert.equal(dispatch('gesturechange', 0, false), false);
  assert.equal(dispatch('click'), false);
  assert.equal(dispatch('wheel'), false);
  cleanup!();
  assert.equal(dispatch('touchmove', 2), false);
  assert.equal(dispatch('gesturestart'), false);
  assert.equal(dispatch('gesturechange'), false);
});

'use client';
/**
 * [INPUT]: 浏览器触摸事件、Safari 手势事件与 React 生命周期。
 * [OUTPUT]: 阻止页面双指缩放，保留单指滚动；卸载时移除监听。
 * [POS]: 根布局的浏览器适配，无业务依赖，不增删 DOM 或修改节点样式。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect } from 'react';

export function TouchGestures() {
  useEffect(() => {
    const preventGesture = (event: Event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };
    const preventPinch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        preventGesture(event);
      }
    };
    const options = { passive: false, capture: true };
    document.addEventListener('gesturestart', preventGesture, options);
    document.addEventListener('gesturechange', preventGesture, options);
    document.addEventListener('touchmove', preventPinch, options);
    return () => {
      document.removeEventListener('gesturestart', preventGesture, options);
      document.removeEventListener('gesturechange', preventGesture, options);
      document.removeEventListener('touchmove', preventPinch, options);
    };
  }, []);
  return null;
}

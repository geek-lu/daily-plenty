'use client';
/**
 * [INPUT]: 安装 runtime 与公共 Collapse 动效。
 * [OUTPUT]: 桌面安装入口、iPhone/其他浏览器操作指引和安装反馈。
 * [POS]: 通用 PWA 展示组件，嵌入「我们」页，不操作 DOM 或请求账单。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useId, useState } from 'react';
import { Collapse } from '../motion';
import { usePwa } from './runtime';

export function InstallCard() {
  const state = usePwa();
  const [showGuide, setShowGuide] = useState(false);
  const guideId = useId();
  return (
    <section
      className="mt-6 rounded-lg border border-line bg-surface p-5"
      aria-label="添加到桌面"
    >
      <div className="flex items-center gap-4">
        {/* 本地图标已有固定尺寸，避免为了安装入口再加载图片处理能力。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          width={48}
          height={48}
          className="shrink-0 rounded-lg"
        />
        <div>
          <h2 className="text-base">把小账本放在桌面</h2>
          <p className="mt-1 text-xs leading-6 muted">下次点一下「日日有余」，就能开始记账。</p>
        </div>
      </div>
      {state.installed ? (
        <p
          className="mt-4 text-sm text-positive"
          role="status"
        >
          已添加到桌面
        </p>
      ) : (
        <button
          type="button"
          className="btn mt-4 w-full"
          disabled={state.busy}
          onClick={state.canPrompt ? state.install : () => setShowGuide(!showGuide)}
          aria-expanded={state.canPrompt ? undefined : showGuide}
          aria-controls={state.canPrompt ? undefined : guideId}
        >
          {state.busy ? '正在打开安装窗口…' : '添加到桌面'}
        </button>
      )}
      <Collapse
        open={showGuide && !state.installed}
        id={guideId}
      >
        <div className="mt-4 border-t border-line pt-4 text-sm leading-7 muted">
          {state.platform === 'ios' ? (
            <ol className="list-decimal space-y-2 pl-5">
              <li>用 Safari 打开这个账本地址。</li>
              <li>点“分享”，在菜单中选择“添加到主屏幕”。</li>
              <li>若有“作为 Web App 打开”，保持开启，再点“添加”。</li>
            </ol>
          ) : (
            <ol className="list-decimal space-y-2 pl-5">
              <li>用手机浏览器打开这个账本地址。</li>
              <li>打开浏览器菜单，选择“添加到桌面”或“安装应用”。</li>
              <li>确认名称为“日日有余”，允许添加桌面图标。</li>
            </ol>
          )}
          <p className="mt-3 text-xs">
            不同浏览器的菜单名称可能不同。若在微信等应用内打开，请先选择用浏览器打开。
          </p>
        </div>
      </Collapse>
      {state.notice && (
        <p
          className="mt-3 text-sm leading-6 muted"
          role="status"
        >
          {state.notice}
        </p>
      )}
      <p className="mt-3 text-xs leading-6 muted">记账和查看账单需要联网。</p>
    </section>
  );
}

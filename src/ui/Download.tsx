'use client';
/** [INPUT]: 已获取的文件内容和下载名。[OUTPUT]: React 管理的隐藏下载链接。
 * [POS]: 浏览器下载适配；节点由 React 创建/回收，Blob URL 在更换或卸载时释放。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { useEffect, useRef, useState } from 'react';

export function Download({ file }: { file: { content: string; name: string } }) {
  const anchor = useRef<HTMLAnchorElement>(null);
  const [resource, setResource] = useState<{ file: typeof file; url: string } | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([file.content], { type: 'text/csv;charset=utf-8' }));
    setResource({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (resource?.file === file) {
      anchor.current?.click();
    }
  }, [resource, file]);
  return (
    <a
      ref={anchor}
      href={resource?.file === file ? resource.url : undefined}
      download={file.name}
      hidden
      aria-hidden="true"
    >
      下载账单
    </a>
  );
}

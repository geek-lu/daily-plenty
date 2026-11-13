'use client';
/** [INPUT]: 共享会话、entry runtime、Presence 与 EntryDrawer。[OUTPUT]: 四页共用记账入口与可完成退出动画的抽屉。
 * [POS]: entry 组合组件，抽屉挂在共享布局，不跳转路由。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md */
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Presence } from '@/ui/motion';
import { useSession } from '../session/runtime';
import { EntryDrawer } from '../ui/EntryDrawer';
import { useNewEntry } from './runtime';

const ComposerContext = createContext<{
  openEntry: () => void;
  canCreate: boolean;
  isOpen: boolean;
} | null>(null);
export function EntryComposerProvider({ children }: { children: React.ReactNode }) {
  const { user, ledgerId, ledgers, mode, invalidateData } = useSession();
  const path = usePathname();
  const scope = `${user?.id}:${ledgerId}:${path}`;
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  useEffect(() => {
    setOpenedFor(null);
  }, [scope]);
  const canCreate =
    mode === 'ready' &&
    ledgers.some((ledger) => ledger.id === ledgerId && ledger.role === 'editor');
  const isOpen = openedFor === scope && canCreate;
  const close = () => setOpenedFor(null);
  return (
    <ComposerContext.Provider
      value={{
        openEntry: () => {
          if (canCreate) {
            setOpenedFor(scope);
          }
        },
        canCreate,
        isOpen,
      }}
    >
      {children}
      <Presence
        key={scope}
        show={isOpen}
      >
        {isOpen && user && (
          <NewEntryDrawer
            ledgerId={ledgerId}
            userId={user.id}
            onSaved={invalidateData}
            onClose={close}
          />
        )}
      </Presence>
    </ComposerContext.Provider>
  );
}
export function useEntryComposer() {
  const value = useContext(ComposerContext);
  if (!value) {
    throw new Error('记账入口需要共享布局');
  }
  return value;
}
function NewEntryDrawer({
  ledgerId,
  userId,
  onSaved,
  onClose,
}: {
  ledgerId: string;
  userId: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const state = useNewEntry(ledgerId, userId, onSaved, onClose);
  return (
    <EntryDrawer
      open
      form={state.form}
      categories={state.data?.categories || []}
      members={state.data?.members || []}
      templateName={state.templateName}
      editingTemplate={false}
      templateOnly={false}
      onTemplateName={state.setTemplateName}
      onAddCategory={state.addCategory}
      onSaveTemplate={state.saveTemplate}
      onChange={state.setForm}
      onClose={onClose}
      onSave={state.save}
      deleteSummary=""
      busy={state.busy}
      loading={state.loading}
      unavailable={!state.data}
      error={state.error}
      notice={state.notice}
    />
  );
}

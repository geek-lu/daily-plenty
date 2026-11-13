'use client';
/**
 * [INPUT]: useOverview、共用录入 runtime 与表单映射。
 * [OUTPUT]: 首页已有账单与个人模板的打开、保存、删除和刷新。
 * [POS]: home runtime；公共校验、提交锁和请求身份由 ledger/editor 管理。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useState } from 'react';
import type { Entry, EntryTemplate, Kind } from '@/shared/types';
import type { DeletionReason } from '@/shared/deletion-reasons';
import type { CategoryIconId } from '@/shared/category-icons';
import { useOverview } from '../ledger/useOverview';
import { useEntryForm } from '../editor/useEntryForm';
import { emptyForm, entryForm, templateForm, nextForm } from '../editor/form';

export function useHome() {
  const overview = useOverview();
  const editor = useEntryForm(overview.ledgerId);
  const { form, commands, mutate } = editor;
  const [modal, setModal] = useState(false);
  const [templateId, setTemplateId] = useState<string>();
  const [templateOnly, setTemplateOnly] = useState(false);
  const [notice, setNotice] = useState('');

  function openNew() {
    const member = overview.data?.members.find(
      (member) => member.userId === overview.user?.id && !member.leftAt,
    );
    editor.reset(emptyForm(member?.id));
    setTemplateId(undefined);
    setTemplateOnly(false);
    setModal(true);
  }

  function openTemplate(template: EntryTemplate, editing = false) {
    editor.reset(templateForm(template), editing ? template.name : '');
    setTemplateId(editing ? template.id : undefined);
    setTemplateOnly(editing);
    setModal(true);
  }

  function openEdit(entry: Entry) {
    editor.reset(entryForm(entry));
    setTemplateId(undefined);
    setTemplateOnly(false);
    setModal(true);
  }

  const save = (continueAdd: boolean) =>
    mutate(async () => {
      await commands.save(form);
      setNotice(form.id ? '已更新这笔账单' : '已记入日常');
      if (continueAdd) {
        editor.setForm(nextForm(form));
      } else {
        setModal(false);
      }
      editor.setTemplateName('');
      setTemplateId(undefined);
      await overview.reload();
    });

  const saveTemplate = () =>
    mutate(async () => {
      await commands.saveTemplate(form, editor.templateName, templateId);
      setNotice(templateId ? '模板已更新' : '已保存为你的常用模板');
      if (templateOnly) {
        setModal(false);
      }
      editor.setTemplateName('');
      setTemplateId(undefined);
      await overview.reload();
    });

  const deleteTemplate = (template: EntryTemplate) =>
    editor.run(async () => {
      await commands.deleteTemplate(template.id);
      setNotice('模板已删除');
      await overview.reload();
    });

  const remove = (reason: DeletionReason, reasonNote: string) =>
    mutate(async () => {
      await commands.remove(form, reason, reasonNote);
      setModal(false);
      setNotice('账单已删除，原因已记录');
      await overview.reload();
    });

  async function addCategory(name: string, kind: Kind, icon: CategoryIconId) {
    await editor.addCategory(name, kind, icon);
    setNotice(`已添加${kind === 'expense' ? '支出' : '收入'}分类：${name}`);
    await overview.reload();
  }

  return {
    ...overview,
    ...editor,
    modal,
    templateId,
    templateOnly,
    setTemplateOnly,
    notice,
    setNotice,
    error: editor.error || overview.error,
    busy: editor.busy || overview.loading,
    close: () => {
      if (!editor.isPending()) {
        setModal(false);
      }
    },
    save,
    openNew,
    openTemplate: (template: EntryTemplate) => openTemplate(template),
    openTemplateEdit: (template: EntryTemplate) => openTemplate(template, true),
    openEdit,
    addCategory,
    saveTemplate,
    deleteTemplate,
    remove,
  };
}

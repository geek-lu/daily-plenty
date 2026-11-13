/**
 * [INPUT]: index.html 的 DOM、示例账单及浏览器表单 / Blob / VisualViewport API。
 * [OUTPUT]: 内存记账、筛选统计、CSV 导出、评审切换及手机键盘视口适配。
 * [POS]: 评审包的交互演示层；不承载正式鉴权、联网、持久化或多人同步。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
'use strict';
const $ = (id) => document.getElementById(id);
const money = (cents) =>
  (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
const people = { me: '我', partner: 'TA' };
const categories = {
  expense: ['餐饮', '买菜', '交通', '购物', '居家', '娱乐', '健康', '其他'],
  income: ['工资', '奖金', '其他收入'],
};
const icons = {
  餐饮: 'food',
  买菜: 'leaf',
  交通: 'bus',
  购物: 'bag',
  居家: 'home',
  娱乐: 'heart',
  健康: 'heart',
  其他: 'wallet',
  工资: 'wallet',
  奖金: 'wallet',
  其他收入: 'wallet',
};
const templates = {
  lunch: { amount: 3600, category: '餐饮', note: '午餐' },
  bus: { amount: 600, category: '交通', note: '通勤' },
  coffee: { amount: 2400, category: '餐饮', note: '咖啡' },
};
let entries = [
  {
    id: 1,
    type: 'expense',
    amount: 12850,
    category: '买菜',
    note: '买一些新鲜，也买一点幸福',
    date: '2026-11-09',
    payer: 'partner',
    creator: 'partner',
  },
  {
    id: 2,
    type: 'expense',
    amount: 3600,
    category: '餐饮',
    note: '工作日的暖心午餐',
    date: '2026-11-09',
    payer: 'me',
    creator: 'me',
  },
  {
    id: 3,
    type: 'expense',
    amount: 2400,
    category: '餐饮',
    note: '一杯咖啡，开始新的一周',
    date: '2026-11-09',
    payer: 'me',
    creator: 'me',
  },
  {
    id: 4,
    type: 'expense',
    amount: 5880,
    category: '买菜',
    note: '给家里添点当季水果',
    date: '2026-11-08',
    payer: 'partner',
    creator: 'me',
  },
  {
    id: 5,
    type: 'expense',
    amount: 24670,
    category: '购物',
    note: '周末一起逛超市',
    date: '2026-11-08',
    payer: 'me',
    creator: 'me',
  },
  {
    id: 6,
    type: 'expense',
    amount: 4800,
    category: '交通',
    note: '去公园的路上',
    date: '2026-11-07',
    payer: 'partner',
    creator: 'partner',
  },
  {
    id: 7,
    type: 'expense',
    amount: 260000,
    category: '居家',
    note: '十一月，我们的小家',
    date: '2026-11-01',
    payer: 'me',
    creator: 'me',
  },
  {
    id: 8,
    type: 'income',
    amount: 1000000,
    category: '工资',
    note: '认真工作的回报',
    date: '2026-11-05',
    payer: 'me',
    creator: 'me',
  },
  {
    id: 9,
    type: 'income',
    amount: 800000,
    category: '工资',
    note: '一起积攒好日子',
    date: '2026-11-05',
    payer: 'partner',
    creator: 'partner',
  },
];
let nextId = 10;
let entryType = 'expense';
let selectedCategory = '餐饮';
let editingId = null;
let deletedEntry = null;
let toastTimer;

// ---- 评审导航与页面状态 ----
function showReview(view) {
  $('prototype-view').hidden = view !== 'prototype';
  $('flows-view').hidden = view !== 'flows';
  document.querySelectorAll('.review-links [data-review]').forEach((button) => {
    button.classList.toggle('active', button.dataset.review === view);
    button.setAttribute('aria-pressed', String(button.dataset.review === view));
  });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function showFlow(flow) {
  document.querySelectorAll('[id^="flow-"]').forEach((section) => {
    section.hidden = section.id !== `flow-${flow}`;
  });
  document.querySelectorAll('[data-flow]').forEach((button) => {
    button.classList.toggle('active', button.dataset.flow === flow);
    button.setAttribute('aria-pressed', String(button.dataset.flow === flow));
  });
}
function showScreen(screen) {
  const titles = {
    home: ['把日子，过得有余。', '一蔬一饭，一起认真记录。'],
    records: ['生活，都有迹可循。', '每一笔小事，都值得被好好记住。'],
    reports: ['看见生活的模样。', '钱花在哪里，日子就在哪里。'],
    together: ['两个人，一本账。', '一起经营小家，也一起积攒未来。'],
  };
  document.querySelectorAll('[id^="screen-"]').forEach((section) => {
    section.hidden = section.id !== `screen-${screen}`;
  });
  document.querySelectorAll('nav [data-screen]').forEach((button) => {
    const active = button.dataset.screen === screen;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });
  [$('page-title').textContent, $('page-subtitle').textContent] = titles[screen];
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ---- 账单展示与整数分统计 ----
function monthlyEntries() {
  return entries
    .filter((entry) => entry.date.startsWith($('month').value))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}
const sum = (list) => list.reduce((total, entry) => total + entry.amount, 0);
function entryRow(entry) {
  const direction = entry.type === 'expense' ? '付' : '收入';
  const sign = entry.type === 'expense' ? '−' : '+';
  return `<button class="ledger-row" data-edit="${entry.id}" aria-label="编辑${escapeHtml(entry.note || entry.category)}，${money(entry.amount)}元"><span class="category-icon"><svg aria-hidden="true"><use href="#i-${icons[entry.category] || 'wallet'}"/></svg></span><span class="entry-info"><span class="entry-title">${escapeHtml(entry.note || entry.category)}</span><span class="entry-meta">${escapeHtml(entry.category)} · ${people[entry.payer]}${direction} · ${people[entry.creator]}记</span></span><span class="entry-amount ${entry.type === 'income' ? 'positive' : ''}">${sign}${money(entry.amount)}</span><span class="entry-arrow" aria-hidden="true">›</span></button>`;
}
function renderLedger(target, list) {
  if (!list.length) {
    target.innerHTML =
      '<div class="empty">还没有记录。<br><span class="small">记下第一笔，或调整筛选条件。</span></div>';
    return;
  }
  const days = [...new Set(list.map((entry) => entry.date))];
  target.innerHTML = days
    .map((day) => {
      const records = list.filter((entry) => entry.date === day);
      const label = `${Number(day.slice(5, 7))} 月 ${Number(day.slice(8))} 日`;
      return `<div class="day-label"><span>${label}</span><span>${records.length} 笔记录</span></div>${records.map(entryRow).join('')}`;
    })
    .join('');
}
function filteredEntries() {
  const query = $('search').value.trim().toLowerCase();
  return monthlyEntries().filter(
    (entry) =>
      ($('filter-type').value === 'all' || entry.type === $('filter-type').value) &&
      ($('filter-payer').value === 'all' || entry.payer === $('filter-payer').value) &&
      `${entry.note} ${entry.category}`.toLowerCase().includes(query),
  );
}
function renderRecords() {
  const filtered = filteredEntries();
  $('filtered-count').textContent = `找到 ${filtered.length} 笔 · 导出遵循当前月份与筛选条件`;
  renderLedger($('all-ledger'), filtered);
}
function renderReports(expenses) {
  const total = sum(expenses);
  const grouped = categories.expense
    .map((category) => ({
      category,
      value: sum(expenses.filter((entry) => entry.category === category)),
    }))
    .filter((item) => item.value)
    .sort((a, b) => b.value - a.value);
  $('category-report').innerHTML =
    grouped
      .map(
        (item) =>
          `<div class="report-line"><div class="row between"><span>${item.category}</span><span class="number">¥ ${money(item.value)} <span class="muted">· ${Math.round((item.value / total) * 100)}%</span></span></div><div class="track"><span style="width:${(item.value / total) * 100}%"></span></div></div>`,
      )
      .join('') || '<div class="empty">这个月还没有支出。</div>';
  $('payer-report').innerHTML = Object.entries(people)
    .map(([id, name]) => {
      const value = sum(expenses.filter((entry) => entry.payer === id));
      return `<div style="margin-bottom:24px"><div class="row between"><span>${name}支付</span><span class="small muted">${total ? Math.round((value / total) * 100) : 0}%</span></div><div class="payer-total number">¥ ${money(value)}</div><div class="track"><span style="width:${total ? (value / total) * 100 : 0}%"></span></div></div>`;
    })
    .join('');
}
function render() {
  const list = monthlyEntries();
  const expenses = list.filter((entry) => entry.type === 'expense');
  const expense = sum(expenses);
  const income = sum(list.filter((entry) => entry.type === 'income'));
  $('balance').textContent = money(income - expense);
  $('expense').textContent = money(expense);
  $('income').textContent = money(income);
  $('expense-count').textContent = `${expenses.length} 笔生活里的小事`;
  $('budget-left').textContent = `¥ ${money(Math.abs(600000 - expense))}`;
  $('budget-label').textContent = expense > 600000 ? '已超出示例预算' : '本月还可支出';
  $('budget-progress').style.width = `${Math.min((expense / 600000) * 100, 100)}%`;
  $('budget-ratio').textContent = `已使用 ${Math.round((expense / 600000) * 100)}%`;
  renderLedger($('recent-ledger'), list.slice(0, 5));
  renderRecords();
  renderReports(expenses);
}

// ---- 表单与快捷模板；金额使用整数分避免浮点累计 ----
function renderCategories() {
  $('category-choices').innerHTML = categories[entryType]
    .map(
      (category) =>
        `<button type="button" class="category-choice ${category === selectedCategory ? 'active' : ''}" data-category="${category}" aria-pressed="${category === selectedCategory}">${category}</button>`,
    )
    .join('');
}
function setEntryType(type) {
  entryType = type;
  if (!categories[type].includes(selectedCategory)) selectedCategory = categories[type][0];
  document.querySelectorAll('[data-entry-type]').forEach((button) => {
    button.classList.toggle('active', button.dataset.entryType === type);
    button.setAttribute('aria-pressed', String(button.dataset.entryType === type));
  });
  $('payer-label').textContent = type === 'expense' ? '谁付款' : '谁收入';
  renderCategories();
}
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function openEntry(entry = null, template = null) {
  editingId = entry?.id ?? null;
  const source = entry || template;
  selectedCategory = source?.category || '餐饮';
  setEntryType(entry?.type || 'expense');
  $('amount').value = source ? (source.amount / 100).toFixed(2) : '';
  $('payer').value = entry?.payer || 'me';
  $('entry-date').value = entry?.date || localToday();
  $('entry-note').value = source?.note || '';
  $('entry-title').textContent = entry ? '看看这笔日常' : '记一笔小日子';
  $('save-entry').textContent = entry ? '保存修改' : '保存账单';
  $('save-continue').hidden = Boolean(entry);
  $('delete-entry').hidden = !entry;
  $('form-error').textContent = '';
  $('amount').removeAttribute('aria-invalid');
  $('entry-date').removeAttribute('aria-invalid');
  $('record-info').textContent =
    `由${people[entry?.creator || 'me']}录入${entry?.updatedBy ? ` · ${people[entry.updatedBy]}最后修改` : ''} · 当前为示例账本`;
  $('entry-dialog').showModal();
  $('amount').focus();
}
function validateEntry() {
  const raw = $('amount').value.trim();
  const valid = /^(0|[1-9]\d{0,5})(\.\d{1,2})?$/.test(raw);
  const [whole = '0', fraction = ''] = raw.split('.');
  const cents = valid ? Number(whole) * 100 + Number(fraction.padEnd(2, '0')) : 0;
  if (!valid || cents <= 0)
    return { error: '请输入大于 0 的金额，最多两位小数，最高 999,999.99 元。', field: 'amount' };
  const date = $('entry-date').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '2000-01-01' || date > '2100-12-31')
    return { error: '请选择 2000 至 2100 年之间的有效日期。', field: 'entry-date' };
  return {
    amount: cents,
    type: entryType,
    category: selectedCategory,
    date,
    payer: $('payer').value,
    note: $('entry-note').value.trim(),
  };
}
function selectMonth(month) {
  if (![...$('month').options].some((option) => option.value === month)) {
    $('month').add(new Option(`${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月`, month));
  }
  $('month').value = month;
}
function saveEntry(event) {
  event.preventDefault();
  const data = validateEntry();
  if (data.error) {
    $('form-error').textContent = data.error;
    $(data.field).setAttribute('aria-invalid', 'true');
    $(data.field).focus();
    return;
  }
  const existing = entries.find((entry) => entry.id === editingId);
  if (existing) Object.assign(existing, data, { updatedBy: 'me' });
  else entries.push({ ...data, id: nextId++, creator: 'me' });
  selectMonth(data.date.slice(0, 7));
  render();
  showToast(existing ? '已在演示账本中更新' : '已记入演示账本');
  if (event.submitter?.value === 'continue') resetForNextEntry();
  else $('entry-dialog').close();
}
function resetForNextEntry() {
  editingId = null;
  $('amount').value = '';
  $('entry-note').value = '';
  $('form-error').textContent = '';
  $('amount').removeAttribute('aria-invalid');
  $('entry-date').removeAttribute('aria-invalid');
  $('amount').focus();
}

// ---- 删除确认与撤销；原型刷新即恢复所有演示数据 ----
function showToast(message, canUndo = false) {
  clearTimeout(toastTimer);
  $('toast-message').textContent = message;
  $('undo-delete').hidden = !canUndo;
  $('toast').hidden = false;
  toastTimer = setTimeout(
    () => {
      $('toast').hidden = true;
      deletedEntry = null;
    },
    canUndo ? 10000 : 3500,
  );
}
function requestDelete() {
  const entry = entries.find((item) => item.id === editingId);
  $('delete-copy').textContent =
    `「${entry.note || entry.category}」¥ ${money(entry.amount)}。删除后会更新当月收支，可在 10 秒内撤销。`;
  $('delete-dialog').showModal();
}
function confirmDelete() {
  deletedEntry = entries.find((entry) => entry.id === editingId);
  entries = entries.filter((entry) => entry.id !== editingId);
  $('delete-dialog').close();
  $('entry-dialog').close();
  render();
  showToast('这笔演示账单已删除', true);
}
function undoDelete() {
  if (!deletedEntry) return;
  entries.push(deletedEntry);
  selectMonth(deletedEntry.date.slice(0, 7));
  deletedEntry = null;
  render();
  showToast('已恢复这笔演示账单');
}
function csvCell(value) {
  const raw = String(value);
  const safe = /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}
function exportCsv() {
  const rows = [
    ['日期', '收支', '分类', '金额（元）', '付款人/收款人', '录入人', '备注'],
    ...filteredEntries().map((entry) => [
      entry.date,
      entry.type === 'expense' ? '支出' : '收入',
      entry.category,
      (entry.amount / 100).toFixed(2),
      people[entry.payer],
      people[entry.creator],
      entry.note,
    ]),
  ];
  const blob = new Blob(['\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `日日有余-演示账单-${$('month').value}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('已导出当前筛选的演示账单');
}

// ---- 手机键盘：弹层保持在可视区域内，不禁止页面缩放 ----
function syncDialogViewport() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  document.documentElement.style.setProperty('--viewport-height', `${viewport.height}px`);
  document.documentElement.style.setProperty(
    '--viewport-bottom',
    `${viewport.offsetTop + viewport.height}px`,
  );
}
window.visualViewport?.addEventListener('resize', syncDialogViewport);
window.visualViewport?.addEventListener('scroll', syncDialogViewport);
syncDialogViewport();

// ---- 事件绑定 ----
document
  .querySelectorAll('[data-review]')
  .forEach((button) => button.addEventListener('click', () => showReview(button.dataset.review)));
document
  .querySelectorAll('[data-flow]')
  .forEach((button) => button.addEventListener('click', () => showFlow(button.dataset.flow)));
document
  .querySelectorAll('[data-screen]')
  .forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.screen)));
document
  .querySelectorAll('[data-add]')
  .forEach((button) => button.addEventListener('click', () => openEntry()));
document
  .querySelectorAll('[data-template]')
  .forEach((button) =>
    button.addEventListener('click', () => openEntry(null, templates[button.dataset.template])),
  );
document
  .querySelectorAll('[data-entry-type]')
  .forEach((button) =>
    button.addEventListener('click', () => setEntryType(button.dataset.entryType)),
  );
$('category-choices').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (button) {
    selectedCategory = button.dataset.category;
    renderCategories();
  }
});
['recent-ledger', 'all-ledger'].forEach((id) =>
  $(id).addEventListener('click', (event) => {
    const button = event.target.closest('[data-edit]');
    if (button) openEntry(entries.find((entry) => entry.id === Number(button.dataset.edit)));
  }),
);
$('entry-form').addEventListener('submit', saveEntry);
$('close-entry').addEventListener('click', () => $('entry-dialog').close());
$('delete-entry').addEventListener('click', requestDelete);
$('cancel-delete').addEventListener('click', () => $('delete-dialog').close());
$('confirm-delete').addEventListener('click', confirmDelete);
$('undo-delete').addEventListener('click', undoDelete);
$('month').addEventListener('change', render);
$('search').addEventListener('input', renderRecords);
['filter-type', 'filter-payer'].forEach((id) => $(id).addEventListener('change', renderRecords));
$('export-csv').addEventListener('click', exportCsv);
$('view-invite-flow').addEventListener('click', () => {
  showReview('flows');
  showFlow('shared');
});
$('amount').addEventListener('input', () => $('amount').removeAttribute('aria-invalid'));
$('entry-date').addEventListener('input', () => $('entry-date').removeAttribute('aria-invalid'));
render();
if (window.location.hash === '#flows') showReview('flows');

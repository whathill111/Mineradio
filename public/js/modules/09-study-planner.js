'use strict';

window.MineradioStudyPlanner = (function createStudyPlanner() {
  var STORE_KEY = 'mineradio-study-planner-v1';
  var MAX_ITEMS = 12;
  var MAX_SAVED_DAYS = 14;
  var state = { date: '', items: [], collapsed: true };
  var initialized = false;

  function localDateKey(date) {
    date = date instanceof Date ? date : new Date();
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function normalizeItem(item) {
    var text = cleanText(item && item.text);
    if (!text) return null;
    return {
      id: String(item && item.id || ('plan-' + Date.now() + '-' + Math.random().toString(16).slice(2))),
      text: text,
      done: !!(item && item.done),
      createdAt: Math.max(0, Number(item && item.createdAt) || Date.now()),
      completedAt: Math.max(0, Number(item && item.completedAt) || 0)
    };
  }

  function readArchive() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function loadToday() {
    var archive = readArchive();
    var date = localDateKey();
    var saved = archive.days && archive.days[date] || {};
    state.date = date;
    state.items = (Array.isArray(saved.items) ? saved.items : []).map(normalizeItem).filter(Boolean).slice(0, MAX_ITEMS);
    state.collapsed = saved.collapsed !== false;
  }

  function saveToday() {
    var archive = readArchive();
    var days = archive.days && typeof archive.days === 'object' ? archive.days : {};
    days[state.date] = {
      items: state.items,
      collapsed: state.collapsed,
      updatedAt: Date.now()
    };
    Object.keys(days).sort().reverse().slice(MAX_SAVED_DAYS).forEach(function (key) { delete days[key]; });
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ version: 1, days: days }));
    } catch (error) {
      if (typeof showToast === 'function') showToast('今日计划暂时无法保存');
    }
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function render() {
    var root = document.getElementById('study-planner');
    var body = document.getElementById('study-planner-body');
    var toggle = document.getElementById('study-planner-toggle');
    var summary = document.getElementById('study-planner-summary');
    var list = document.getElementById('study-planner-list');
    var empty = document.getElementById('study-planner-empty');
    var progress = document.getElementById('study-planner-progress');
    var clear = document.getElementById('study-planner-clear');
    if (!root || !body || !toggle || !summary || !list || !empty || !progress || !clear) return;

    var completed = state.items.filter(function (item) { return item.done; }).length;
    var remaining = state.items.length - completed;
    root.classList.toggle('expanded', !state.collapsed);
    toggle.setAttribute('aria-expanded', state.collapsed ? 'false' : 'true');
    body.setAttribute('aria-hidden', state.collapsed ? 'true' : 'false');
    summary.textContent = remaining ? (remaining + ' 项待完成') : (state.items.length ? '今日已完成' : '添加一个目标');
    progress.textContent = '完成 ' + completed + ' / ' + state.items.length;
    clear.disabled = completed === 0;
    empty.hidden = state.items.length > 0;
    list.innerHTML = state.items.map(function (item) {
      return '<div class="study-planner-item' + (item.done ? ' done' : '') + '" role="listitem" data-plan-id="' + escapeHtml(item.id) + '">' +
        '<label><input type="checkbox"' + (item.done ? ' checked' : '') + '><span class="study-planner-check" aria-hidden="true"></span>' +
        '<span class="study-planner-text">' + escapeHtml(item.text) + '</span></label>' +
        '<button class="study-planner-delete" type="button" title="删除" aria-label="删除 ' + escapeHtml(item.text) + '">×</button>' +
        '</div>';
    }).join('');
  }

  function notifyChange(reason, item, extra) {
    if (!window.dispatchEvent || typeof CustomEvent !== 'function') return;
    var completed = state.items.filter(function (entry) { return entry.done; }).length;
    var detail = {
      reason: String(reason || 'change'),
      date: state.date,
      total: state.items.length,
      completed: completed,
      remaining: state.items.length - completed,
      item: item ? JSON.parse(JSON.stringify(item)) : null
    };
    if (extra && typeof extra === 'object') {
      Object.keys(extra).forEach(function (key) { detail[key] = extra[key]; });
    }
    window.dispatchEvent(new CustomEvent('mineradio:planner-change', { detail: detail }));
  }

  function setCollapsed(collapsed, focusInput) {
    state.collapsed = !!collapsed;
    saveToday();
    render();
    if (!state.collapsed && focusInput) {
      var input = document.getElementById('study-planner-input');
      if (input) setTimeout(function () { input.focus(); }, 40);
    }
  }

  function addItem(text) {
    text = cleanText(text);
    if (!text) return false;
    if (state.items.length >= MAX_ITEMS) {
      if (typeof showToast === 'function') showToast('今日计划最多保留 ' + MAX_ITEMS + ' 项');
      return false;
    }
    var item = normalizeItem({ text: text });
    state.items.push(item);
    saveToday();
    render();
    notifyChange('add', item);
    return true;
  }

  function findItem(id) {
    return state.items.find(function (item) { return item.id === id; });
  }

  function bind() {
    var toggle = document.getElementById('study-planner-toggle');
    var form = document.getElementById('study-planner-form');
    var input = document.getElementById('study-planner-input');
    var list = document.getElementById('study-planner-list');
    var clear = document.getElementById('study-planner-clear');
    if (!toggle || !form || !input || !list || !clear) return false;

    toggle.addEventListener('click', function () { setCollapsed(!state.collapsed, state.collapsed); });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (addItem(input.value)) input.value = '';
      input.focus();
    });
    list.addEventListener('change', function (event) {
      var row = event.target && event.target.closest('.study-planner-item');
      if (!row || event.target.type !== 'checkbox') return;
      var item = findItem(row.getAttribute('data-plan-id'));
      if (!item) return;
      item.done = !!event.target.checked;
      item.completedAt = item.done ? Date.now() : 0;
      saveToday();
      render();
      notifyChange(item.done ? 'complete' : 'reopen', item);
    });
    list.addEventListener('click', function (event) {
      var button = event.target && event.target.closest('.study-planner-delete');
      if (!button) return;
      var row = button.closest('.study-planner-item');
      var id = row && row.getAttribute('data-plan-id');
      var removed = findItem(id);
      state.items = state.items.filter(function (item) { return item.id !== id; });
      saveToday();
      render();
      notifyChange('delete', removed);
    });
    clear.addEventListener('click', function () {
      var cleared = state.items.filter(function (item) { return item.done; }).length;
      state.items = state.items.filter(function (item) { return !item.done; });
      saveToday();
      render();
      notifyChange('clear-completed', null, { cleared: cleared });
    });
    return true;
  }

  function refreshDate() {
    var today = localDateKey();
    if (today === state.date) return;
    loadToday();
    render();
    notifyChange('date-change');
  }

  function init() {
    if (initialized || !document.getElementById('study-planner')) return;
    initialized = true;
    loadToday();
    bind();
    render();
    notifyChange('init');
    window.addEventListener('focus', refreshDate);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshDate(); });
  }

  return {
    init: init,
    addItem: addItem,
    localDateKey: localDateKey,
    getState: function () { return JSON.parse(JSON.stringify(state)); }
  };
})();

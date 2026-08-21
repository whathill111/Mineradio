'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const appRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(appRoot, 'public', 'js', 'modules', '09-study-planner.js'), 'utf8');
const html = fs.readFileSync(path.join(appRoot, 'public', 'index.html'), 'utf8');
const loader = fs.readFileSync(path.join(appRoot, 'public', 'js', 'index-loader.js'), 'utf8');
const desktopOverlay = fs.readFileSync(
  path.join(appRoot, 'public', 'js', 'modules', '10-shell', '04-desktop-overlay-fullscreen.js'),
  'utf8',
);

class FakeClassList {
  constructor() { this.values = new Set(); }
  toggle(name, force) {
    if (force) this.values.add(name);
    else this.values.delete(name);
  }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor() {
    this.attributes = {};
    this.listeners = {};
    this.classList = new FakeClassList();
    this.innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.focused = false;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] || ''; }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  focus() { this.focused = true; }
}

function createRuntime(initialStorage = {}) {
  const ids = [
    'study-planner',
    'study-planner-toggle',
    'study-planner-body',
    'study-planner-summary',
    'study-planner-form',
    'study-planner-input',
    'study-planner-list',
    'study-planner-empty',
    'study-planner-progress',
    'study-planner-clear',
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement()]));
  const values = new Map(Object.entries(initialStorage));
  const windowListeners = {};
  const documentListeners = {};
  const sandbox = {
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    Array,
    Object,
    setTimeout(callback) { callback(); return 1; },
    localStorage: {
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, String(value)); },
    },
    document: {
      hidden: false,
      getElementById(id) { return elements[id] || null; },
      addEventListener(type, handler) { documentListeners[type] = handler; },
    },
    window: {
      addEventListener(type, handler) { windowListeners[type] = handler; },
    },
  };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(source, sandbox, { filename: '09-study-planner.js' });
  return {
    planner: sandbox.window.MineradioStudyPlanner,
    elements,
    values,
    windowListeners,
    documentListeners,
  };
}

test('study planner is loaded, compact, and protected in full desktop mode', () => {
  assert.match(html, /id="study-planner"/);
  assert.match(html, /id="study-planner-input"[^>]*maxlength="80"/);
  assert.match(html, /css\/study-planner\.css/);
  assert.match(loader, /js\/modules\/09-study-planner\.js/);
  assert.match(desktopOverlay, /selector:\s*'#study-planner',\s*kind:\s*'study-planner'/);
});

test('study planner keeps a bounded, escaped, date-scoped local archive', () => {
  const runtime = createRuntime();
  runtime.planner.init();
  assert.equal(runtime.planner.getState().collapsed, true);
  assert.equal(runtime.elements['study-planner-summary'].textContent, '添加一个目标');

  assert.equal(runtime.planner.addItem('  完成 数学 练习  '), true);
  assert.equal(runtime.planner.addItem('<img src=x onerror=alert(1)>'), true);
  const state = runtime.planner.getState();
  assert.equal(state.items[0].text, '完成 数学 练习');
  assert.match(runtime.elements['study-planner-list'].innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(runtime.elements['study-planner-list'].innerHTML, /<img src=x/);

  for (let index = 2; index < 12; index += 1) {
    assert.equal(runtime.planner.addItem('计划 ' + index), true);
  }
  assert.equal(runtime.planner.addItem('超出上限'), false);
  assert.equal(runtime.planner.getState().items.length, 12);

  const saved = JSON.parse(runtime.values.get('mineradio-study-planner-v1'));
  const dateKey = runtime.planner.localDateKey(new Date());
  assert.equal(saved.version, 1);
  assert.equal(saved.days[dateKey].items.length, 12);
  assert.equal(Object.keys(saved.days).length, 1);
});

test('study planner checkbox and clear controls persist completion state', () => {
  const runtime = createRuntime();
  runtime.planner.init();
  runtime.planner.addItem('背单词');
  runtime.planner.addItem('写作业');
  const firstId = runtime.planner.getState().items[0].id;

  runtime.elements['study-planner-list'].listeners.change({
    target: {
      type: 'checkbox',
      checked: true,
      closest() {
        return { getAttribute(name) { return name === 'data-plan-id' ? firstId : ''; } };
      },
    },
  });
  assert.equal(runtime.planner.getState().items[0].done, true);
  assert.equal(runtime.elements['study-planner-progress'].textContent, '完成 1 / 2');

  runtime.elements['study-planner-clear'].listeners.click();
  const remaining = runtime.planner.getState().items;
  assert.deepEqual(remaining.map((item) => item.text), ['写作业']);
  const saved = JSON.parse(runtime.values.get('mineradio-study-planner-v1'));
  assert.deepEqual(saved.days[runtime.planner.localDateKey(new Date())].items.map((item) => item.text), ['写作业']);
});

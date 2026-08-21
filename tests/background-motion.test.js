'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const appRoot = path.resolve(__dirname, '..');
const defaultsSource = fs.readFileSync(
  path.join(appRoot, 'public', 'js', 'modules', '00-state', '04-fx-defaults.js'),
  'utf8',
);
const controlsSource = fs.readFileSync(
  path.join(appRoot, 'public', 'js', 'modules', '07-fx', '02-accent-background-controls.js'),
  'utf8',
);
const persistenceSource = fs.readFileSync(
  path.join(appRoot, 'public', 'js', 'modules', '02-visual', '04-visual-settings-persistence.js'),
  'utf8',
);
const archiveSource = fs.readFileSync(
  path.join(appRoot, 'public', 'js', 'modules', '07-fx', '00-preset-archive-data.js'),
  'utf8',
);
const loopSource = fs.readFileSync(
  path.join(appRoot, 'public', 'js', 'modules', '11-main-loop.js'),
  'utf8',
);
const consoleWorkspaceSource = fs.readFileSync(
  path.join(appRoot, 'public', 'js', 'modules', '07-fx', '09-console-workspace.js'),
  'utf8',
);
const html = fs.readFileSync(path.join(appRoot, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(appRoot, 'public', 'css', 'index.css'), 'utf8');

function createRuntime() {
  const properties = new Map();
  const bodyClasses = new Set();
  const root = {
    style: {
      setProperty(name, value) { properties.set(name, String(value)); },
    },
  };
  const body = {
    classList: {
      contains(name) { return bodyClasses.has(name); },
      toggle(name, force) {
        if (force) bodyClasses.add(name);
        else bodyClasses.delete(name);
      },
    },
  };
  const sandbox = {
    console,
    Math,
    Number,
    String,
    Object,
    Array,
    Date,
    isFinite,
    fx: { backgroundMotionMode: 'cinema', backgroundMedia: { type: 'image', src: 'data:image/webp;base64,x' } },
    normalizeCustomBackgroundMedia(value) { return value || null; },
    clampRange(value, min, max) { return Math.max(min, Math.min(max, value)); },
    document: {
      hidden: false,
      documentElement: root,
      body,
      getElementById() { return null; },
      querySelectorAll() { return []; },
    },
    window: {
      matchMedia() { return { matches: false }; },
    },
  };
  vm.runInNewContext(defaultsSource, sandbox, { filename: '04-fx-defaults.js' });
  vm.runInNewContext(controlsSource, sandbox, { filename: '02-accent-background-controls.js' });
  return { sandbox, properties, bodyClasses };
}

test('background motion modes are normalized and produce bounded subtle frames', () => {
  const { sandbox } = createRuntime();
  assert.equal(sandbox.normalizeBackgroundMotionMode('audio'), 'audio');
  assert.equal(sandbox.normalizeBackgroundMotionMode('unknown'), 'cinema');

  const off = sandbox.customBackgroundMotionFrame('off', 20, { energy: 1, beat: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(off)), {
    x: 0,
    y: 0,
    scale: 1,
    brightness: 1,
    saturation: 1,
  });

  const cinema = sandbox.customBackgroundMotionFrame('cinema', 20, {});
  const audio = sandbox.customBackgroundMotionFrame('audio', 20, {
    energy: 0.8,
    bass: 0.7,
    beat: 0.9,
    treble: 0.6,
  });
  assert.ok(Math.abs(cinema.x) <= 1.3);
  assert.ok(Math.abs(cinema.y) <= 0.9);
  assert.ok(cinema.scale >= 1.03 && cinema.scale <= 1.044);
  assert.ok(audio.scale > cinema.scale && audio.scale < 1.08);
  assert.ok(audio.brightness > 1 && audio.brightness < 1.06);
  assert.ok(audio.saturation > 1 && audio.saturation < 1.12);
});

test('motion tick updates compositor variables and disables itself for reduced motion', () => {
  const runtime = createRuntime();
  const first = runtime.sandbox.tickCustomBackgroundMotion(0.25, {
    time: 12,
    energy: 0.7,
    bass: 0.6,
    beat: 0.8,
    treble: 0.5,
  });
  assert.equal(first.active, true);
  assert.equal(runtime.bodyClasses.has('custom-bg-motion-active'), true);
  assert.match(runtime.properties.get('--custom-bg-motion-x'), /%$/);
  assert.ok(Number(runtime.properties.get('--custom-bg-motion-scale')) > 1);

  runtime.sandbox.window.matchMedia = () => ({ matches: true });
  const reduced = runtime.sandbox.tickCustomBackgroundMotion(0.25, { time: 13, energy: 1, beat: 1 });
  assert.equal(reduced.active, false);
  assert.equal(runtime.bodyClasses.has('custom-bg-motion-active'), false);
  assert.ok(reduced.scale < first.scale);
});

test('background motion is wired through UI, persistence, archives, CSS, and main loop', () => {
  assert.match(defaultsSource, /backgroundMotionMode:\s*'cinema'/);
  assert.match(persistenceSource, /backgroundMotionMode:\s*savedBgMotionMode/);
  assert.match(persistenceSource, /backgroundMotionMode:\s*\['backgroundMotionMode'\]/);
  assert.match(archiveSource, /'backgroundMotionMode'/);
  assert.match(html, /id="background-motion-seg"/);
  assert.match(html, /data-bg-motion="off"/);
  assert.match(html, /data-bg-motion="cinema"/);
  assert.match(html, /data-bg-motion="audio"/);
  assert.match(css, /--custom-bg-motion-scale/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(loopSource, /tickCustomBackgroundMotion\(backgroundMotionStepDt/);
  assert.match(consoleWorkspaceSource, /fxConsoleItem\('background-motion-seg'/);
});

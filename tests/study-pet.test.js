'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const appRoot = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(appRoot, 'public', 'js', 'modules', '09-study-pet.js'), 'utf8');
const plannerSource = fs.readFileSync(path.join(appRoot, 'public', 'js', 'modules', '09-study-planner.js'), 'utf8');
const html = fs.readFileSync(path.join(appRoot, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(appRoot, 'public', 'css', 'study-pet.css'), 'utf8');
const loader = fs.readFileSync(path.join(appRoot, 'public', 'js', 'index-loader.js'), 'utf8');
const startup = fs.readFileSync(
  path.join(appRoot, 'public', 'js', 'modules', '10-shell', '05-startup-bindings.js'),
  'utf8',
);
const desktopOverlay = fs.readFileSync(
  path.join(appRoot, 'public', 'js', 'modules', '10-shell', '04-desktop-overlay-fullscreen.js'),
  'utf8',
);
const codexAtlasPath = path.join(appRoot, 'public', 'assets', 'study-pets', 'codex', 'spritesheet.webp');
const studyPetsDir = path.join(appRoot, 'public', 'assets', 'study-pets');

function createRuntime() {
  const sandbox = {
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    Array,
    Object,
    Promise,
    isFinite,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    window: {
      addEventListener() {},
      matchMedia() { return { matches: false }; },
    },
    document: {
      hidden: false,
      getElementById() { return null; },
      addEventListener() {},
    },
  };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(source, sandbox, { filename: '09-study-pet.js' });
  return sandbox.window.MineradioStudyPet;
}

test('pet manifest defaults to the fixed Codex 8x9 animation contract', () => {
  const pet = createRuntime();
  const manifest = pet.normalizeManifest({
    id: 'study-fox',
    displayName: '伴学小狐',
    description: '安静陪伴学习。',
    spritesheetPath: 'spritesheet.webp',
  });
  assert.equal(manifest.id, 'study-fox');
  assert.equal(manifest.frameWidth, 192);
  assert.equal(manifest.frameHeight, 208);
  assert.equal(manifest.columns, 8);
  assert.equal(manifest.rows, 9);
  assert.equal(manifest.states.idle.row, 0);
  assert.equal(manifest.states.idle.frames, 6);
  assert.equal(manifest.states['running-right'].frames, 8);
  assert.equal(manifest.states.waving.frames, 4);
  assert.equal(manifest.states.review.row, 8);
  assert.deepEqual(Array.from(manifest.states.jumping.durations), [140, 140, 140, 140, 280]);
});

test('pet manifest accepts safe timing extensions and rejects incompatible atlases', () => {
  const pet = createRuntime();
  const manifest = pet.normalizeManifest({
    id: 'focus-bird',
    spritesheetPath: 'art/focus.webp',
    frameWidth: 192,
    frameHeight: 208,
    columns: 8,
    rows: 9,
    states: {
      idle: { row: 0, frames: 8, fps: 5 },
      running: { row: 7, frames: 6, durations: [90, 100, 110, 120, 130, 200] },
    },
  });
  assert.equal(manifest.states.idle.frames, 8);
  assert.deepEqual(Array.from(manifest.states.idle.durations), new Array(8).fill(200));
  assert.deepEqual(Array.from(manifest.states.running.durations), [90, 100, 110, 120, 130, 200]);
  assert.throws(() => pet.normalizeManifest({ id: 'bad', frameWidth: 128 }), /8x9/);
  assert.throws(() => pet.normalizeManifest({ id: 'bad', spritesheetPath: 'https:\/\/example.com\/pet.webp' }), /本地图片/);
  assert.throws(() => pet.normalizeManifest({ id: 'bad', spritesheetPath: '..\/pet.webp' }), /本地图片/);
});

test('pet manifest JSON accepts the UTF-8 BOM commonly written on Windows', () => {
  const pet = createRuntime();
  const manifest = pet.parseManifestText('\uFEFF{"id":"windows-pet","displayName":"Windows Pet"}');
  assert.equal(manifest.id, 'windows-pet');
  assert.throws(() => pet.parseManifestText('\uFEFF{broken'), /pet\.json/);
});

test('pet package file matching stays inside the selected local package', () => {
  const pet = createRuntime();
  const files = [
    { name: 'pet.json', webkitRelativePath: 'study-fox/pet.json' },
    { name: 'spritesheet.webp', webkitRelativePath: 'study-fox/spritesheet.webp' },
    { name: 'notes.txt', webkitRelativePath: 'study-fox/notes.txt' },
  ];
  const selected = pet.selectPackageFiles(files, { spritesheetPath: 'spritesheet.webp' });
  assert.equal(selected.manifestFile, files[0]);
  assert.equal(selected.imageFile, files[1]);
});

test('study state mapping reacts to plans, playback, completion, and user interactions', () => {
  const pet = createRuntime();
  assert.equal(pet.stateFor({ total: 2, completed: 0, remaining: 2 }, false, false, ''), 'running');
  assert.equal(pet.stateFor({ total: 0, completed: 0, remaining: 0 }, true, false, ''), 'running');
  assert.equal(pet.stateFor({ total: 2, completed: 2, remaining: 0 }, false, false, ''), 'review');
  assert.equal(pet.stateFor({ total: 0, completed: 0, remaining: 0 }, false, true, ''), 'waiting');
  assert.equal(pet.stateFor({ total: 0, completed: 0, remaining: 0 }, false, false, ''), 'idle');
  assert.equal(pet.stateFor({ total: 2, completed: 0, remaining: 2 }, true, false, 'waving'), 'waving');
});

test('pet UI, planner events, persistent importer, and desktop protection are wired', () => {
  assert.match(html, /css\/study-pet\.css/);
  assert.match(html, /id="study-pet-settings"/);
  assert.match(html, /id="study-pet-files-input"[^>]*multiple/);
  assert.match(html, /id="study-pet-folder-input"[^>]*webkitdirectory/);
  assert.match(html, /id="study-pet-sprite"/);
  assert.match(loader, /js\/modules\/09-study-pet\.js/);
  assert.match(startup, /MineradioStudyPet\.init\(\)/);
  assert.match(desktopOverlay, /selector:\s*'#study-pet',\s*kind:\s*'study-pet'/);
  assert.match(plannerSource, /mineradio:planner-change/);
  assert.match(plannerSource, /notifyChange\(item\.done \? 'complete' : 'reopen'/);
  assert.match(source, /indexedDB\.open\(DB_NAME, DB_VERSION\)/);
  assert.match(source, /1536/);
  assert.match(source, /1872/);
  assert.match(source, /4 \* 60 \* 1000/);
  assert.match(source, /ensureBuiltinPets\(\)/);
  assert.match(source, /currentRecord\.builtin/);
  const codexAtlas = fs.readFileSync(codexAtlasPath);
  assert.equal(codexAtlas.subarray(0, 4).toString('hex'), '52494646');
  // Anti-regression: only the eight builtin Codex pets may ship — no private extras.
  const expectedBuiltinIds = ['bsod', 'codex', 'dewey', 'fireball', 'null-signal', 'rocky', 'seedy', 'stacky'];
  const shippedDirs = fs.readdirSync(studyPetsDir, { withFileTypes: true })
    .filter(function (entry) { return entry.isDirectory(); })
    .map(function (entry) { return entry.name; })
    .sort();
  assert.deepEqual(shippedDirs, expectedBuiltinIds);
  assert.match(css, /#study-pet-message\.visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

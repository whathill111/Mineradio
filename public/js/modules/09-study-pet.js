'use strict';

window.MineradioStudyPet = (function createStudyPetRuntime() {
  var DB_NAME = 'mineradio-study-pets-v1';
  var DB_VERSION = 1;
  var STORE_NAME = 'pets';
  var PREF_KEY = 'mineradio-study-pet-prefs-v1';
  var MAX_PETS = 12;
  var MAX_SPRITESHEET_BYTES = 18 * 1024 * 1024;
  var ATLAS_WIDTH = 1536;
  var ATLAS_HEIGHT = 1872;
  var BUILTIN_PET_BASE = 'assets/study-pets/';
  var BUILTIN_PETS = [
    { id: 'codex', displayName: 'Codex', description: 'The original Codex companion', asset: 'codex/spritesheet.webp' },
    { id: 'dewey', displayName: 'Dewey', description: 'A tidy duck for calm workspace days', asset: 'dewey/spritesheet.webp' },
    { id: 'fireball', displayName: 'Fireball', description: 'Hot path energy for fast iteration', asset: 'fireball/spritesheet.webp' },
    { id: 'rocky', displayName: 'Rocky', description: 'A steady rock when the diff gets large', asset: 'rocky/spritesheet.webp' },
    { id: 'seedy', displayName: 'Seedy', description: 'Small green shoots for new ideas', asset: 'seedy/spritesheet.webp' },
    { id: 'stacky', displayName: 'Stacky', description: 'A balanced stack for deep work', asset: 'stacky/spritesheet.webp' },
    { id: 'bsod', displayName: 'BSOD', description: 'A tiny blue-screen gremlin', asset: 'bsod/spritesheet.webp' },
    { id: 'null-signal', displayName: 'Null Signal', description: 'Quiet signal from the void', asset: 'null-signal/spritesheet.webp' }
  ];
  var FRAME_WIDTH = 192;
  var FRAME_HEIGHT = 208;
  var COLUMNS = 8;
  var ROWS = 9;
  var DISPLAY_WIDTH = 96;
  var DISPLAY_HEIGHT = 104;
  var initialized = false;
  var dbPromise = null;
  var objectUrl = '';
  var messageTimer = 0;
var encouragementTimer = 0;
var statePollTimer = 0;
var temporaryTimer = 0;
  var animationTimer = 0;
  var animationGeneration = 0;
  var messageCursor = 0;
  var interactionCount = 0;
  var library = [];
  var currentRecord = null;
  var prefs = { currentId: '', hidden: false };
  var planner = { total: 0, completed: 0, remaining: 0 };
  var animation = { name: '', frame: 0 };
  var temporary = { name: '', until: 0 };

  var DEFAULT_STATES = {
    idle: { row: 0, frames: 6, durations: [280, 110, 110, 140, 140, 320] },
    'running-right': { row: 1, frames: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
    'running-left': { row: 2, frames: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
    waving: { row: 3, frames: 4, durations: [140, 140, 140, 280] },
    jumping: { row: 4, frames: 5, durations: [140, 140, 140, 140, 280] },
    failed: { row: 5, frames: 8, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
    waiting: { row: 6, frames: 6, durations: [150, 150, 150, 150, 150, 260] },
    running: { row: 7, frames: 6, durations: [120, 120, 120, 120, 120, 220] },
    review: { row: 8, frames: 6, durations: [150, 150, 150, 150, 150, 280] }
  };

  var MESSAGES = {
    welcome: [
      '\u6211\u4f1a\u5728\u8fd9\u91cc\u966a\u4f60\u5b66\u4e60\u3002',
      '\u4eca\u5929\u4e5f\u4e00\u8d77\u6162\u6162\u524d\u8fdb\u5427\u3002'
    ],
    start: [
      '\u5148\u5b8c\u6210\u6700\u5c0f\u7684\u4e00\u6b65\u3002',
      '\u76ee\u6807\u5df2\u7ecf\u5199\u4e0b\u6765\u4e86\uff0c\u73b0\u5728\u5f00\u59cb\u5c31\u597d\u3002',
      '\u4e00\u6b21\u53ea\u4e13\u6ce8\u4e00\u4ef6\u4e8b\u3002'
    ],
    working: [
      '\u4fdd\u6301\u8fd9\u4e2a\u8282\u594f\uff0c\u6211\u5728\u8fd9\u91cc\u966a\u4f60\u3002',
      '\u5df2\u7ecf\u5f00\u59cb\u4e86\uff0c\u5c31\u6bd4\u6628\u5929\u66f4\u8fd1\u3002',
      '\u4e0d\u7528\u7740\u6025\uff0c\u7a33\u7a33\u5730\u505a\u5b8c\u5f53\u524d\u8fd9\u4e00\u6b65\u3002'
    ],
    complete: [
      '\u5b8c\u6210\u4e00\u9879\uff0c\u7ed9\u81ea\u5df1\u4e00\u4e2a\u5c0f\u5c0f\u7684\u80af\u5b9a\u3002',
      '\u53c8\u524d\u8fdb\u4e86\u4e00\u683c\uff0c\u5f88\u597d\u3002',
      '\u5b8c\u6210\u4e00\u9879\uff0c\u4f11\u606f\u4e00\u4e0b\u4e5f\u53ef\u4ee5\u3002'
    ],
    allDone: [
      '\u4eca\u5929\u7684\u8ba1\u5212\u90fd\u5b8c\u6210\u5566\uff0c\u771f\u4e0d\u9519\u3002',
      '\u5168\u90e8\u6253\u52fe\uff01\u4eca\u5929\u7684\u4f60\u5f88\u53ef\u9760\u3002'
    ],
    idle: [
      '\u628a\u76ee\u6807\u5199\u4e0b\u6765\uff0c\u884c\u52a8\u4f1a\u66f4\u6e05\u6670\u3002',
      '\u51c6\u5907\u597d\u65f6\uff0c\u6211\u4eec\u5c31\u4ece\u4e00\u4ef6\u5c0f\u4e8b\u5f00\u59cb\u3002'
    ],
    hello: [
      '\u6211\u5728\u5462\uff0c\u4e00\u8d77\u52a0\u6cb9\u3002',
      '\u55e8\uff0c\u73b0\u5728\u4e5f\u662f\u5f00\u59cb\u7684\u597d\u65f6\u5019\u3002'
    ]
  };

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cleanText(value, maxLength) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
  }

  function slug(value) {
    var result = String(value || '').trim().toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
    return result || ('study-pet-' + Date.now().toString(36));
  }

  function boundedInteger(value, fallback, min, max) {
    var number = Number(value);
    if (!isFinite(number)) number = fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function normalizeDurations(rawState, frames, defaults) {
    var durations = rawState && Array.isArray(rawState.durations) ? rawState.durations : null;
    if (durations && durations.length >= frames) {
      return durations.slice(0, frames).map(function (value) {
        return boundedInteger(value, 140, 60, 2000);
      });
    }
    var fps = Number(rawState && rawState.fps);
    if (isFinite(fps) && fps > 0) {
      var duration = boundedInteger(1000 / fps, 140, 60, 1000);
      return new Array(frames).fill(duration);
    }
    var source = defaults.slice();
    while (source.length < frames) source.push(source[source.length - 1] || 140);
    return source.slice(0, frames);
  }

  function normalizeManifest(raw, fallbackName) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('\u5ba0\u7269\u6e05\u5355\u5fc5\u987b\u662f JSON \u5bf9\u8c61');
    [
      ['frameWidth', FRAME_WIDTH],
      ['frameHeight', FRAME_HEIGHT],
      ['columns', COLUMNS],
      ['rows', ROWS]
    ].forEach(function (entry) {
      if (raw[entry[0]] != null && Number(raw[entry[0]]) !== entry[1]) {
        throw new Error('\u5ba0\u7269\u56fe\u96c6\u53c2\u6570\u4e0d\u7b26\u5408 Codex 8x9 \u89c4\u8303');
      }
    });
    var displayName = cleanText(raw.displayName || raw.name || fallbackName || raw.id || '\u4f34\u5b66\u5ba0\u7269', 48);
    var id = slug(raw.id || displayName || fallbackName);
    var spritesheetPath = String(raw.spritesheetPath || 'spritesheet.webp').replace(/\\/g, '/').replace(/^\.\//, '');
    if (!spritesheetPath || /^(?:[a-z]+:|\/)/i.test(spritesheetPath) || spritesheetPath.split('/').indexOf('..') >= 0) {
      throw new Error('spritesheetPath \u5fc5\u987b\u6307\u5411\u5305\u5185\u7684\u672c\u5730\u56fe\u7247');
    }
    var states = {};
    Object.keys(DEFAULT_STATES).forEach(function (name) {
      var base = DEFAULT_STATES[name];
      var supplied = raw.states && raw.states[name] && typeof raw.states[name] === 'object' ? raw.states[name] : {};
      var frames = boundedInteger(supplied.frames == null ? supplied.frameCount : supplied.frames, base.frames, 1, COLUMNS);
      states[name] = {
        row: boundedInteger(supplied.row, base.row, 0, ROWS - 1),
        frames: frames,
        durations: normalizeDurations(supplied, frames, base.durations)
      };
    });
    return {
      id: id,
      displayName: displayName || id,
      description: cleanText(raw.description || '\u4e00\u4e2a\u966a\u4f34\u5b66\u4e60\u7684\u5c0f\u4f19\u4f34\u3002', 140),
      spritesheetPath: spritesheetPath,
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
      columns: COLUMNS,
      rows: ROWS,
      pixelated: raw.pixelated === true,
      states: states
    };
  }

  function normalizePath(value) {
    return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
  }

  function basename(value) {
    var parts = normalizePath(value).split('/');
    return parts[parts.length - 1] || '';
  }

  function filePath(file) {
    return normalizePath(file && (file.webkitRelativePath || file.name));
  }

  function selectPackageFiles(files, rawManifest) {
    files = Array.prototype.slice.call(files || []);
    var manifestFile = files.find(function (file) { return basename(filePath(file)) === 'pet.json'; })
      || files.find(function (file) { return /\.json$/i.test(file && file.name || ''); });
    var wanted = normalizePath(rawManifest && rawManifest.spritesheetPath || 'spritesheet.webp');
    var wantedName = basename(wanted);
    var imageFile = files.find(function (file) {
      var path = filePath(file);
      return path === wanted || path.slice(-(wanted.length + 1)) === '/' + wanted;
    }) || files.find(function (file) {
      return basename(filePath(file)) === wantedName;
    }) || files.find(function (file) {
      return /\.(?:webp|png)$/i.test(file && file.name || '');
    });
    return { manifestFile: manifestFile || null, imageFile: imageFile || null };
  }

  function readFileText(file) {
    if (file && typeof file.text === 'function') return file.text();
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(reader.error || new Error('\u6587\u4ef6\u8bfb\u53d6\u5931\u8d25')); };
      reader.readAsText(file, 'utf-8');
    });
  }

  function parseManifestText(text) {
    try {
      return JSON.parse(String(text == null ? '' : text).replace(/^\uFEFF/, ''));
    } catch (error) {
      throw new Error('pet.json \u4e0d\u662f\u6709\u6548 JSON');
    }
  }

  function inspectSpritesheet(blob) {
    if (window.createImageBitmap) {
      return window.createImageBitmap(blob).then(function (bitmap) {
        var result = { width: bitmap.width, height: bitmap.height };
        if (bitmap.close) bitmap.close();
        return result;
      });
    }
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var image = new Image();
      image.onload = function () {
        var result = { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
        URL.revokeObjectURL(url);
        resolve(result);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('\u5ba0\u7269\u56fe\u96c6\u65e0\u6cd5\u89e3\u7801'));
      };
      image.src = url;
    });
  }

  function validateSpritesheet(file) {
    if (!file) return Promise.reject(new Error('\u7f3a\u5c11 spritesheet.webp \u6216 PNG \u56fe\u96c6'));
    if ((Number(file.size) || 0) > MAX_SPRITESHEET_BYTES) {
      return Promise.reject(new Error('\u5ba0\u7269\u56fe\u96c6\u8d85\u8fc7 18 MB'));
    }
    if (!/\.(?:webp|png)$/i.test(file.name || '') && !/^image\/(?:webp|png)$/i.test(file.type || '')) {
      return Promise.reject(new Error('\u5ba0\u7269\u56fe\u96c6\u53ea\u652f\u6301 WebP \u6216 PNG'));
    }
    return inspectSpritesheet(file).then(function (dimensions) {
      if (dimensions.width !== ATLAS_WIDTH || dimensions.height !== ATLAS_HEIGHT) {
        throw new Error('\u56fe\u96c6\u5c3a\u5bf8\u5e94\u4e3a 1536x1872\uff0c\u5f53\u524d\u4e3a ' + dimensions.width + 'x' + dimensions.height);
      }
      return dimensions;
    });
  }

  function openDatabase() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u6301\u4e45\u4fdd\u5b58\u5ba0\u7269'));
        return;
      }
      var request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('\u5ba0\u7269\u6570\u636e\u5e93\u6253\u5f00\u5931\u8d25')); };
    });
    return dbPromise;
  }

  function storeRequest(mode, operation) {
    return openDatabase().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(STORE_NAME, mode);
        var store = transaction.objectStore(STORE_NAME);
        var request;
        try { request = operation(store); } catch (error) { reject(error); return; }
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { reject(request.error || transaction.error || new Error('\u5ba0\u7269\u6570\u636e\u64cd\u4f5c\u5931\u8d25')); };
      });
    });
  }

  function listPets() {
    return storeRequest('readonly', function (store) { return store.getAll(); }).then(function (records) {
      return (Array.isArray(records) ? records : []).sort(function (a, b) {
        return (Number(b.importedAt) || 0) - (Number(a.importedAt) || 0);
      });
    });
  }

  function putPet(record) {
    return storeRequest('readwrite', function (store) { return store.put(record); });
  }

  function removePet(id) {
    return storeRequest('readwrite', function (store) { return store.delete(id); });
  }

  function isBuiltinPetId(id) {
    id = String(id || '');
    return BUILTIN_PETS.some(function (pet) { return pet.id === id; });
  }

  function builtinPetRecords() {
    return BUILTIN_PETS.map(function (pet) {
      return {
        id: pet.id,
        manifest: normalizeManifest({
          id: pet.id,
          displayName: pet.displayName,
          description: pet.description,
          spritesheetPath: 'spritesheet.webp'
        }, pet.displayName),
        assetUrl: BUILTIN_PET_BASE + pet.asset,
        builtin: true,
        importedAt: 0
      };
    });
  }

  function ensureBuiltinPets() {
    return listPets().then(function (records) {
      // Versions 2.1.0/2.1.1 copied one bundled pet into IndexedDB. Built-ins
      // are now immutable public assets, so remove only records explicitly
      // marked as built-in. User-imported pets, including matching names, stay.
      var obsolete = records.filter(function (record) { return record && record.builtin === true; });
      if (!obsolete.length) return false;
      return Promise.all(obsolete.map(function (record) { return removePet(record.id); })).then(function () { return true; });
    }).catch(function (error) {
      console.warn('[StudyPet] builtin migration unavailable:', error);
      return false;
    });
  }

  function readPrefs() {
    try {
      var parsed = JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {};
      var position = null;
      if (parsed.position && isFinite(Number(parsed.position.x)) && isFinite(Number(parsed.position.y))) {
        position = {
          x: Math.max(0, Math.min(1, Number(parsed.position.x))),
          y: Math.max(0, Math.min(1, Number(parsed.position.y)))
        };
      }
      return { currentId: String(parsed.currentId || ''), hidden: parsed.hidden === true, position: position };
    } catch (error) {
      return { currentId: '', hidden: false, position: null };
    }
  }

  function savePrefs() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ currentId: prefs.currentId, hidden: prefs.hidden, position: prefs.position || null })); } catch (error) { }
  }

  function toast(message) {
    if (typeof showToast === 'function') showToast(message);
  }

  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (error) { return false; }
  }

  function currentManifest() {
    return currentRecord && currentRecord.manifest ? currentRecord.manifest : null;
  }

  function currentStateConfig(name) {
    var manifest = currentManifest();
    return manifest && manifest.states && manifest.states[name] || (manifest && manifest.states && manifest.states.idle) || DEFAULT_STATES.idle;
  }

  function clearAnimationTimer() {
    if (animationTimer) clearTimeout(animationTimer);
    animationTimer = 0;
  }

  function renderFrame() {
    var sprite = document.getElementById('study-pet-sprite');
    if (!sprite || !currentRecord) return;
    var config = currentStateConfig(animation.name || 'idle');
    var frame = Math.max(0, Math.min(config.frames - 1, animation.frame));
    sprite.style.width = DISPLAY_WIDTH + 'px';
    sprite.style.height = DISPLAY_HEIGHT + 'px';
    sprite.style.backgroundSize = (DISPLAY_WIDTH * COLUMNS) + 'px ' + (DISPLAY_HEIGHT * ROWS) + 'px';
    sprite.style.backgroundPosition = (-frame * DISPLAY_WIDTH) + 'px ' + (-config.row * DISPLAY_HEIGHT) + 'px';
    sprite.setAttribute('data-state', animation.name || 'idle');
    sprite.setAttribute('data-frame', String(frame));
  }

  function scheduleAnimationFrame() {
    clearAnimationTimer();
    if (!currentRecord || prefs.hidden || document.hidden || reducedMotion()) return;
    var generation = animationGeneration;
    var config = currentStateConfig(animation.name || 'idle');
    var delay = config.durations[animation.frame] || 140;
    animationTimer = setTimeout(function () {
      if (generation !== animationGeneration) return;
      animation.frame = (animation.frame + 1) % Math.max(1, config.frames);
      renderFrame();
      scheduleAnimationFrame();
    }, delay);
  }

  function setAnimationState(name, force) {
    var manifest = currentManifest();
    if (!manifest) return;
    if (!manifest.states[name]) name = 'idle';
    if (!force && animation.name === name) return;
    animation.name = name;
    animation.frame = 0;
    animationGeneration += 1;
    renderFrame();
    scheduleAnimationFrame();
  }

  function isAudioPlaying() {
    try {
      return typeof playing !== 'undefined' && !!playing
        && typeof audio !== 'undefined' && !!audio && !audio.paused;
    } catch (error) {
      return false;
    }
  }

  function studyPetStateFor(summary, audioPlaying, emptyWaiting, overrideState) {
    summary = summary && typeof summary === 'object' ? summary : {};
    if (overrideState && DEFAULT_STATES[overrideState]) return overrideState;
    var total = Math.max(0, Number(summary.total) || 0);
    var completed = Math.max(0, Number(summary.completed) || 0);
    var remaining = Math.max(0, Number(summary.remaining) || 0);
    if (remaining > 0 || audioPlaying) return 'running';
    if (total > 0 && completed >= total) return 'review';
    if (total === 0 && emptyWaiting) return 'waiting';
    return 'idle';
  }

  function desiredState() {
    var overrideState = '';
    if (temporary.name && Date.now() < temporary.until) overrideState = temporary.name;
    else {
      temporary.name = '';
      temporary.until = 0;
    }
    var emptyWaiting = Math.floor(Date.now() / 45000) % 4 === 0;
    return studyPetStateFor(planner, isAudioPlaying(), emptyWaiting, overrideState);
  }

  function evaluateState(force) {
    if (!currentRecord) return;
    setAnimationState(desiredState(), !!force);
  }

  function temporaryState(name, duration) {
    temporary.name = name;
    temporary.until = Date.now() + Math.max(500, Number(duration) || 2200);
    evaluateState(true);
    if (temporaryTimer) clearTimeout(temporaryTimer);
    temporaryTimer = setTimeout(function () {
      temporary.name = '';
      temporary.until = 0;
      evaluateState(true);
    }, Math.max(500, Number(duration) || 2200) + 40);
  }

  function pickMessage(group) {
    var entries = MESSAGES[group] || MESSAGES.working;
    var message = entries[messageCursor % entries.length];
    messageCursor += 1;
    return message;
  }

  function showMessage(message, duration) {
    var bubble = document.getElementById('study-pet-message');
    if (!bubble || !message) return;
    bubble.textContent = cleanText(message, 100);
    bubble.classList.add('visible');
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(function () { bubble.classList.remove('visible'); }, Math.max(1600, Number(duration) || 6200));
  }

  function readPlannerState() {
    try {
      var source = window.MineradioStudyPlanner && window.MineradioStudyPlanner.getState();
      var items = source && Array.isArray(source.items) ? source.items : [];
      var completed = items.filter(function (item) { return item.done; }).length;
      planner = { total: items.length, completed: completed, remaining: items.length - completed };
    } catch (error) {
      planner = { total: 0, completed: 0, remaining: 0 };
    }
  }

  function handlePlannerChange(event) {
    var detail = event && event.detail || {};
    planner = {
      total: Math.max(0, Number(detail.total) || 0),
      completed: Math.max(0, Number(detail.completed) || 0),
      remaining: Math.max(0, Number(detail.remaining) || 0)
    };
    if (detail.reason === 'complete') {
      if (planner.total > 0 && planner.remaining === 0) {
        temporaryState('jumping', 2900);
        showMessage(pickMessage('allDone'), 7000);
      } else {
        temporaryState('review', 2400);
        showMessage(pickMessage('complete'), 6200);
      }
    } else if (detail.reason === 'add') {
      temporaryState('waving', 1700);
      showMessage(pickMessage('start'), 6200);
    } else {
      evaluateState(false);
    }
  }

  function releaseObjectUrl() {
    if (!objectUrl) return;
    try { URL.revokeObjectURL(objectUrl); } catch (error) { }
    objectUrl = '';
  }

  function applyCurrentPet() {
    releaseObjectUrl();
    var root = document.getElementById('study-pet');
    var sprite = document.getElementById('study-pet-sprite');
    var name = document.getElementById('study-pet-name');
    if (!root || !sprite) return;
    if (!currentRecord || (!currentRecord.spritesheet && !currentRecord.assetUrl)) {
      root.hidden = true;
      sprite.style.removeProperty('background-image');
      clearAnimationTimer();
      updateControls();
      return;
    }
    if (currentRecord.assetUrl) {
      sprite.style.backgroundImage = 'url("' + String(currentRecord.assetUrl).replace(/"/g, '%22') + '")';
    } else {
      objectUrl = URL.createObjectURL(currentRecord.spritesheet);
      sprite.style.backgroundImage = 'url("' + objectUrl.replace(/"/g, '%22') + '")';
    }
    sprite.classList.toggle('pixelated', currentRecord.manifest.pixelated === true);
    if (name) name.textContent = currentRecord.manifest.displayName;
    root.hidden = prefs.hidden;
    applyStudyPetPosition();
    root.setAttribute('aria-label', currentRecord.manifest.displayName + '\uff0c\u4f34\u5b66\u5ba0\u7269');
    animation.name = '';
    animation.frame = 0;
    evaluateState(true);
    updateControls();
  }

  function updateControls() {
    var select = document.getElementById('study-pet-select');
    var status = document.getElementById('study-pet-settings-status');
    var toggle = document.getElementById('study-pet-toggle');
    var remove = document.getElementById('study-pet-remove');
    if (select) {
      select.innerHTML = '';
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = library.length ? '\u9009\u62e9\u5ba0\u7269' : '\u5c1a\u672a\u5bfc\u5165';
      select.appendChild(empty);
      library.forEach(function (record) {
        var option = document.createElement('option');
        option.value = record.id;
        option.textContent = record.manifest.displayName;
        select.appendChild(option);
      });
      select.value = currentRecord ? currentRecord.id : '';
      select.disabled = library.length === 0;
    }
    if (status) status.textContent = currentRecord ? currentRecord.manifest.displayName : '\u672a\u5bfc\u5165';
    if (toggle) {
      toggle.disabled = !currentRecord;
      toggle.textContent = prefs.hidden ? '\u663e\u793a' : '\u9690\u85cf';
      toggle.setAttribute('aria-pressed', prefs.hidden ? 'true' : 'false');
    }
    if (remove) remove.disabled = !currentRecord || currentRecord.builtin === true;
    if (remove) remove.title = currentRecord && currentRecord.builtin ? '内置宠物不可删除，可切换其他宠物' : '删除当前宠物';
  }

  function choosePet(id, silent) {
    id = String(id || '');
    currentRecord = library.find(function (record) { return record.id === id; }) || null;
    prefs.currentId = currentRecord ? currentRecord.id : '';
    prefs.hidden = false;
    savePrefs();
    applyCurrentPet();
    if (!silent && currentRecord) {
      showMessage(pickMessage('welcome'), 6500);
      toast('\u5df2\u5207\u6362\u4f34\u5b66\u5ba0\u7269: ' + currentRecord.manifest.displayName);
    }
  }

  function refreshLibrary(preferredId) {
    var builtins = builtinPetRecords();
    return listPets().then(function (records) {
      var custom = records.filter(function (record) {
        return record && record.builtin !== true && !isBuiltinPetId(record.id);
      });
      library = builtins.concat(custom);
      var wanted = String(preferredId || prefs.currentId || '');
      currentRecord = library.find(function (record) { return record.id === wanted; }) || library[0] || null;
      prefs.currentId = currentRecord ? currentRecord.id : '';
      savePrefs();
      applyCurrentPet();
      return library;
    }).catch(function (error) {
      console.warn('[StudyPet] library unavailable:', error);
      library = builtins;
      currentRecord = library.find(function (record) { return record.id === String(preferredId || prefs.currentId || ''); }) || library[0] || null;
      prefs.currentId = currentRecord ? currentRecord.id : '';
      savePrefs();
      applyCurrentPet();
      return library;
    });
  }

  function importPackage(files) {
    files = Array.prototype.slice.call(files || []);
    var selected = selectPackageFiles(files, null);
    if (!selected.manifestFile) return Promise.reject(new Error('\u8bf7\u540c\u65f6\u9009\u62e9 pet.json \u548c spritesheet.webp/png'));
    return readFileText(selected.manifestFile).then(function (text) {
      var raw = parseManifestText(text);
      var manifest = normalizeManifest(raw, selected.manifestFile.name.replace(/\.json$/i, ''));
      if (isBuiltinPetId(manifest.id)) throw new Error('宠物 ID “' + manifest.id + '” 已被内置宠物使用，请修改 pet.json 后再导入');
      selected = selectPackageFiles(files, manifest);
      if (!selected.imageFile) throw new Error('\u627e\u4e0d\u5230 ' + manifest.spritesheetPath);
      return Promise.all([validateSpritesheet(selected.imageFile), listPets()]).then(function (results) {
        var existing = results[1].some(function (record) { return record.id === manifest.id; });
        if (!existing && results[1].length >= MAX_PETS) throw new Error('\u6700\u591a\u4fdd\u5b58 ' + MAX_PETS + ' \u53ea\u4f34\u5b66\u5ba0\u7269');
        return putPet({
          id: manifest.id,
          manifest: manifest,
          spritesheet: selected.imageFile,
          importedAt: Date.now()
        }).then(function () {
          prefs.currentId = manifest.id;
          prefs.hidden = false;
          savePrefs();
          return refreshLibrary(manifest.id).then(function () {
            showMessage(pickMessage('welcome'), 7000);
            toast((existing ? '\u4f34\u5b66\u5ba0\u7269\u5df2\u66f4\u65b0: ' : '\u4f34\u5b66\u5ba0\u7269\u5df2\u5bfc\u5165: ') + manifest.displayName);
            return copy(manifest);
          });
        });
      });
    });
  }

  function handleImportInput(input) {
    var files = input && input.files;
    if (!files || !files.length) return;
    var settings = document.getElementById('study-pet-settings');
    if (settings) settings.open = true;
    importPackage(files).catch(function (error) {
      console.warn('[StudyPet] import failed:', error);
      if (currentRecord) temporaryState('failed', 2500);
      toast(error && error.message || '\u5ba0\u7269\u5bfc\u5165\u5931\u8d25');
    }).finally(function () { input.value = ''; });
  }

  function toggleHidden() {
    if (!currentRecord) {
      toast('\u8bf7\u5148\u5bfc\u5165\u4f34\u5b66\u5ba0\u7269');
      return;
    }
    prefs.hidden = !prefs.hidden;
    savePrefs();
    var root = document.getElementById('study-pet');
    if (root) root.hidden = prefs.hidden;
    if (prefs.hidden) clearAnimationTimer();
    else {
      evaluateState(true);
      showMessage(pickMessage('hello'), 5200);
    }
    updateControls();
  }

  function deleteCurrentPet() {
    if (!currentRecord) return Promise.resolve(false);
    var target = currentRecord;
    if (target.builtin) {
      toast('内置宠物不会被删除，请切换到其他宠物');
      return Promise.resolve(false);
    }
    if (window.confirm && !window.confirm('\u5220\u9664\u4f34\u5b66\u5ba0\u7269\u201c' + target.manifest.displayName + '\u201d\uff1f')) return Promise.resolve(false);
    return removePet(target.id).then(function () {
      prefs.currentId = '';
      prefs.hidden = false;
      savePrefs();
      return refreshLibrary('').then(function () {
        toast('\u5df2\u5220\u9664\u4f34\u5b66\u5ba0\u7269');
        return true;
      });
    }).catch(function (error) {
      console.warn('[StudyPet] delete failed:', error);
      toast('\u5ba0\u7269\u5220\u9664\u5931\u8d25');
      return false;
    });
  }

  function handlePetClick() {
    if (!currentRecord) return;
    interactionCount += 1;
    temporaryState(interactionCount % 3 === 0 ? 'jumping' : 'waving', 2200);
    showMessage(pickMessage(planner.remaining > 0 || isAudioPlaying() ? 'working' : 'hello'), 5600);
  }

  function periodicEncouragement() {
    if (!currentRecord || prefs.hidden || document.hidden) return;
    if (planner.remaining > 0 || isAudioPlaying()) showMessage(pickMessage('working'), 6200);
    else if (planner.total === 0) showMessage(pickMessage('idle'), 6000);
    evaluateState(false);
  }

  function applyStudyPetPosition() {
    var root = document.getElementById('study-pet');
    if (!root) return;
    if (!prefs.position) {
      root.style.removeProperty('left');
      root.style.removeProperty('top');
      root.style.removeProperty('bottom');
      return;
    }
    var rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var vw = window.innerWidth || rect.width || 1;
    var vh = window.innerHeight || rect.height || 1;
    var maxX = Math.max(0, vw - rect.width);
    var maxY = Math.max(0, vh - rect.height);
    root.style.left = Math.round(prefs.position.x * maxX) + 'px';
    root.style.top = Math.round(prefs.position.y * maxY) + 'px';
    root.style.bottom = 'auto';
  }

  function initStudyPetDrag(stage) {
    var root = document.getElementById('study-pet');
    if (!stage || !root) return;
    var dragging = false;
    var moved = false;
    var pointerId = -1;
    var startX = 0;
    var startY = 0;
    var startLeft = 0;
    var startTop = 0;
    var startWidth = 0;
    var startHeight = 0;
    var suppressClick = false;
    stage.addEventListener('pointerdown', function (event) {
      if (!currentRecord || event.button !== 0) return;
      var rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      dragging = true;
      moved = false;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      startWidth = rect.width;
      startHeight = rect.height;
      try { stage.setPointerCapture(event.pointerId); } catch (error) { }
    });
    stage.addEventListener('pointermove', function (event) {
      if (!dragging || event.pointerId !== pointerId) return;
      var dx = event.clientX - startX;
      var dy = event.clientY - startY;
      if (!moved) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        moved = true;
        suppressClick = true;
        root.classList.add('study-pet-dragging');
        temporaryState('jumping', 2147483647);
      }
      var vw = window.innerWidth || 1;
      var vh = window.innerHeight || 1;
      var left = Math.max(0, Math.min(startLeft + dx, vw - startWidth));
      var top = Math.max(0, Math.min(startTop + dy, vh - startHeight));
      root.style.left = left + 'px';
      root.style.top = top + 'px';
      root.style.bottom = 'auto';
    });
    function finish(event, cancelled) {
      if (!dragging || (event && event.pointerId !== pointerId)) return;
      dragging = false;
      try { stage.releasePointerCapture(pointerId); } catch (error) { }
      root.classList.remove('study-pet-dragging');
      if (!moved) return;
      temporaryState('jumping', 620);
      if (cancelled) {
        applyStudyPetPosition();
      } else {
        var rect = root.getBoundingClientRect();
        var vw = window.innerWidth || 1;
        var vh = window.innerHeight || 1;
        prefs.position = {
          x: Math.max(0, Math.min(1, rect.left / Math.max(1, vw - rect.width))),
          y: Math.max(0, Math.min(1, rect.top / Math.max(1, vh - rect.height)))
        };
        savePrefs();
      }
      setTimeout(function () { suppressClick = false; }, 0);
    }
    stage.addEventListener('pointerup', function (event) { finish(event, false); });
    stage.addEventListener('pointercancel', function (event) { finish(event, true); });
    // 松手后的 click 不再触发宠物互动，避免拖完多跳一下
    stage.addEventListener('click', function (event) {
      if (suppressClick) {
        suppressClick = false;
        event.stopImmediatePropagation();
      }
    }, true);
    window.addEventListener('resize', function () {
      if (!dragging) applyStudyPetPosition();
    });
  }

  function bind() {
    var select = document.getElementById('study-pet-select');
    var filesInput = document.getElementById('study-pet-files-input');
    var folderInput = document.getElementById('study-pet-folder-input');
    var importFiles = document.getElementById('study-pet-import-files');
    var importFolder = document.getElementById('study-pet-import-folder');
    var toggle = document.getElementById('study-pet-toggle');
    var remove = document.getElementById('study-pet-remove');
    var stage = document.getElementById('study-pet-stage');
    if (select) select.addEventListener('change', function () { choosePet(select.value); });
    if (filesInput) filesInput.addEventListener('change', function () { handleImportInput(filesInput); });
    if (folderInput) folderInput.addEventListener('change', function () { handleImportInput(folderInput); });
    if (importFiles && filesInput) importFiles.addEventListener('click', function () { filesInput.click(); });
    if (importFolder && folderInput) importFolder.addEventListener('click', function () { folderInput.click(); });
    if (toggle) toggle.addEventListener('click', toggleHidden);
    if (remove) remove.addEventListener('click', deleteCurrentPet);
    if (stage) stage.addEventListener('click', handlePetClick);
    if (stage) initStudyPetDrag(stage);
    window.addEventListener('mineradio:planner-change', handlePlannerChange);
    window.addEventListener('focus', function () { readPlannerState(); evaluateState(true); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearAnimationTimer();
      else { readPlannerState(); evaluateState(true); }
    });
  }

  function init() {
    if (initialized || !document.getElementById('study-pet-settings')) return;
    initialized = true;
    prefs = readPrefs();
    readPlannerState();
    bind();
    updateControls();
    ensureBuiltinPets().then(function () { return refreshLibrary(prefs.currentId); }).then(function () {
      if (currentRecord && !prefs.hidden) showMessage(pickMessage('welcome'), 6500);
    });
    encouragementTimer = setInterval(periodicEncouragement, 4 * 60 * 1000);
    statePollTimer = setInterval(function () { readPlannerState(); evaluateState(false); }, 2500);
  }

  return {
    init: init,
    importPackage: importPackage,
    choosePet: choosePet,
    toggleHidden: toggleHidden,
    deleteCurrentPet: deleteCurrentPet,
    normalizeManifest: normalizeManifest,
    parseManifestText: parseManifestText,
    selectPackageFiles: selectPackageFiles,
    getBuiltinPets: function () { return BUILTIN_PETS.map(function (pet) { return copy(pet); }); },
    stateFor: studyPetStateFor,
    desiredState: desiredState,
    getState: function () {
      return {
        currentId: currentRecord ? currentRecord.id : '',
        hidden: prefs.hidden,
        planner: copy(planner),
        animation: copy(animation),
        library: library.map(function (record) { return copy(record.manifest); })
      };
    }
  };
})();

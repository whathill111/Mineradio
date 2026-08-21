'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const mainText = fs.readFileSync(path.join(appRoot, 'desktop', 'main.js'), 'utf8');
const launcherText = fs.readFileSync(path.join(appRoot, 'scripts', 'workspace-env.bat'), 'utf8');
const gitignoreText = fs.readFileSync(path.join(appRoot, '.gitignore'), 'utf8');

test('app-owned persistent and temporary data stays under .workspace', () => {
  assert.match(mainText, /path\.join\(PROJECT_ROOT, '\.workspace'\)/);
  assert.match(mainText, /path\.join\(WORKSPACE_STATE_ROOT, 'user-data', APP_NAME\)/);
  assert.match(mainText, /return path\.join\(WORKSPACE_STATE_ROOT, 'cache'\)/);
  assert.match(mainText, /process\.env\.TEMP = WORKSPACE_TEMP_PATH/);
  assert.match(mainText, /process\.env\.APPDATA = WORKSPACE_ROAMING_PATH/);
  assert.match(mainText, /process\.env\.LOCALAPPDATA = WORKSPACE_LOCAL_PATH/);
  assert.match(mainText, /app\.setPath\('appData', WORKSPACE_ROAMING_PATH\)/);
  assert.match(mainText, /app\.setPath\('temp', WORKSPACE_TEMP_PATH\)/);
  assert.match(mainText, /app\.setPath\('logs', WORKSPACE_LOG_PATH\)/);
  assert.match(mainText, /app\.setPath\('crashDumps', WORKSPACE_CRASH_DUMP_PATH\)/);
});

test('launchers redirect tool caches and ignore generated workspace state', () => {
  assert.match(launcherText, /MINERADIO_WORKSPACE_STATE_DIR=%APP_DIR%\.workspace/);
  assert.match(launcherText, /NPM_CONFIG_CACHE=%MINERADIO_WORKSPACE_STATE_DIR%\\npm-cache/);
  assert.match(launcherText, /ELECTRON_CACHE=%MINERADIO_WORKSPACE_STATE_DIR%\\electron-cache/);
  assert.match(gitignoreText, /^\.workspace\/$/m);
});

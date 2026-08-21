'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appRoot = path.resolve(__dirname, '..');
const adapter = require('../open-audio-api');

function jsonResponse(value, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return value; },
  };
}

test.afterEach(() => adapter.resetOpenAudioRuntimeForTests());

test('open audio accepts explicit public licences and rejects opaque claims', () => {
  assert.equal(adapter.normalizeLicense('https://creativecommons.org/licenses/by/4.0/'), 'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(adapter.normalizeLicense('http://creativecommons.org/publicdomain/zero/1.0/'), 'http://creativecommons.org/publicdomain/zero/1.0/');
  assert.equal(adapter.normalizeLicense('https://example.com/free-music'), '');
  assert.equal(adapter.normalizeLicense('free to use'), '');
  assert.equal(adapter.licenseLabel('https://creativecommons.org/licenses/by-nc-nd/4.0/'), 'CC BY-NC-ND');
  assert.match(adapter.buildArchiveSearchQuery('ambient focus'), /collection:netlabels/);
  assert.match(adapter.buildArchiveSearchQuery('ambient focus'), /licenseurl:\*/);
});

test('open audio chooses a public MP3 and never a private or unrelated file', () => {
  const chosen = adapter.chooseAudioFile([
    { name: 'private.mp3', private: true, format: 'VBR MP3' },
    { name: 'cover.png', private: false, format: 'PNG' },
    { name: 'track.flac', private: false, format: 'Flac' },
    { name: 'track.mp3', private: false, format: 'VBR MP3' },
  ]);
  assert.equal(chosen.name, 'track.mp3');
  assert.equal(adapter.chooseAudioFile([{ name: '../secret.mp3', private: false }]), null);
});

test('open audio search preserves attribution and revalidates playback from metadata', async () => {
  const calls = [];
  adapter.setOpenAudioFetchForTests(async (url) => {
    calls.push(String(url));
    if (String(url).startsWith('https://archive.org/advancedsearch.php?')) {
      return jsonResponse({
        response: {
          numFound: 2,
          docs: [
            {
              identifier: 'licensed-item',
              title: 'Open Study Song',
              creator: ['Open Artist'],
              collection: 'netlabels',
              licenseurl: 'https://creativecommons.org/licenses/by/4.0/',
            },
            { identifier: 'unlicensed-item', title: 'No Terms' },
          ],
        },
      });
    }
    if (String(url).endsWith('/licensed-item')) {
      return jsonResponse({
        metadata: {
          identifier: 'licensed-item',
          title: 'Open Study Song',
          creator: ['Open Artist'],
          collection: 'netlabels',
          licenseurl: 'https://creativecommons.org/licenses/by/4.0/',
        },
        files: [
          { name: 'cover.png', format: 'PNG' },
          { name: 'study song.flac', format: 'Flac', size: '9000000' },
          { name: 'study song.mp3', format: 'VBR MP3', size: '4000000', length: '180.5' },
        ],
      });
    }
    if (String(url).endsWith('/unlicensed-item')) {
      return jsonResponse({
        metadata: { identifier: 'unlicensed-item', title: 'No Terms' },
        files: [{ name: 'unknown.mp3', format: 'VBR MP3' }],
      });
    }
    throw new Error('unexpected URL ' + url);
  });

  const result = await adapter.handleOpenAudioSearch('study', 4, 0);
  assert.equal(result.provider, 'open');
  assert.equal(result.songs.length, 1);
  assert.equal(result.songs[0].name, 'Open Study Song');
  assert.equal(result.songs[0].artist, 'Open Artist');
  assert.equal(result.songs[0].archiveFile, '');
  assert.equal(result.songs[0].licenseLabel, 'CC BY');
  assert.equal(result.songs[0].licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(result.songs[0].sourceUrl, 'https://archive.org/details/licensed-item');

  const playback = await adapter.handleOpenAudioSongUrl({ archiveId: 'licensed-item', file: 'study song.mp3' });
  assert.equal(playback.playable, true);
  assert.equal(playback.url, 'https://archive.org/download/licensed-item/study%20song.mp3');
  assert.equal(playback.licenseLabel, 'CC BY');
  assert.equal(calls.filter((url) => url.endsWith('/licensed-item')).length, 1, 'playback must verify item metadata exactly once');

  const rejected = await adapter.handleOpenAudioSongUrl({ archiveId: 'unlicensed-item', file: 'unknown.mp3' });
  assert.equal(rejected.playable, false);
});

test('renderer and local server expose the open-audio provider as a no-login source', () => {
  const server = fs.readFileSync(path.join(appRoot, 'server.js'), 'utf8');
  const provider = fs.readFileSync(path.join(appRoot, 'open-audio-api.js'), 'utf8');
  const html = fs.readFileSync(path.join(appRoot, 'public', 'index.html'), 'utf8');
  const search = fs.readFileSync(path.join(appRoot, 'public', 'js', 'modules', '05-playback', '07-search.js'), 'utf8');
  const playback = fs.readFileSync(path.join(appRoot, 'public', 'js', 'modules', '05-playback', '13-playback-start-audio.js'), 'utf8');
  const fallback = fs.readFileSync(path.join(appRoot, 'public', 'js', 'modules', '05-playback', '11-provider-fallback.js'), 'utf8');
  assert.match(html, /id="search-mode-open"/);
  assert.match(server, /pn === '\/api\/open\/search'/);
  assert.match(server, /pn === '\/api\/open\/song\/url'/);
  assert.match(server, /electron\.net\.fetch/);
  assert.match(server, /host === 'archive\.org' \|\| host\.endsWith\('\.archive\.org'\)/);
  assert.match(provider, /electron\.net\.fetch/);
  assert.match(provider, /bypassCustomProtocolHandlers:\s*true/);
  assert.match(search, /MUSIC_SEARCH_PROVIDER_ORDER\s*=\s*\[[^\]]*'open'/);
  assert.match(search, /\/api\/open\/search\?keywords=/);
  assert.match(playback, /\/api\/open\/song\/url\?archiveId=/);
  assert.match(fallback, /SOURCE_FALLBACK_DIRECT_PROVIDERS\s*=\s*\[[^\]]*'open'/);
  assert.match(fallback, /if \(provider === 'open'\) return true/);
});

'use strict';

// This provider exposes only audio with an explicit public reuse licence. It
// is not a membership bypass: every playable URL is resolved from the public
// Internet Archive netlabels catalogue and its current item metadata.

const ARCHIVE_SEARCH_URL = 'https://archive.org/advancedsearch.php';
const ARCHIVE_METADATA_URL = 'https://archive.org/metadata/';
const ARCHIVE_DOWNLOAD_URL = 'https://archive.org/download/';
const ARCHIVE_IMAGE_URL = 'https://archive.org/services/img/';
const SEARCH_TIMEOUT_MS = 15000;
const METADATA_TIMEOUT_MS = 9000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 80;
const AUDIO_EXTENSIONS = new Set(['.mp3', '.ogg', '.oga', '.flac', '.wav', '.m4a', '.opus']);
const LICENSE_PREFIXES = [
  'https://creativecommons.org/licenses/',
  'http://creativecommons.org/licenses/',
  'https://creativecommons.org/publicdomain/',
  'http://creativecommons.org/publicdomain/',
  'https://rightsstatements.org/vocab/',
];

const metadataCache = new Map();

function defaultOpenAudioFetch(input, init) {
  try {
    const electron = require('electron');
    if (electron && electron.net && typeof electron.net.fetch === 'function') {
      return electron.net.fetch(input, Object.assign({}, init || {}, { bypassCustomProtocolHandlers: true }));
    }
  } catch (error) {}
  return fetch(input, init);
}

let fetchImpl = defaultOpenAudioFetch;

function compactText(value, fallback = '') {
  const result = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  return result || fallback;
}

function joinedText(value, fallback = '') {
  if (Array.isArray(value)) {
    const result = value.map((item) => compactText(item)).filter(Boolean).join(' / ');
    return result || fallback;
  }
  return compactText(value, fallback);
}

function safeIdentifier(value) {
  return compactText(value).replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 180);
}

function safeFileName(value) {
  const raw = compactText(value);
  if (!raw || raw.length > 512 || raw.includes('\\') || raw.includes('/') || raw.includes('\0')) return '';
  return raw;
}

function archiveUrlPart(value) {
  return encodeURIComponent(String(value || ''));
}

function normalizeLicense(value) {
  const raw = compactText(value).toLowerCase();
  if (!raw || !raw.startsWith('http')) return '';
  return LICENSE_PREFIXES.some((prefix) => raw.startsWith(prefix)) ? raw : '';
}

function licenseLabel(url) {
  const value = normalizeLicense(url);
  if (!value) return '';
  if (value.includes('/publicdomain/')) return 'Public Domain';
  if (value.includes('/by-nc-nd/')) return 'CC BY-NC-ND';
  if (value.includes('/by-nc-sa/')) return 'CC BY-NC-SA';
  if (value.includes('/by-nc/')) return 'CC BY-NC';
  if (value.includes('/by-nd/')) return 'CC BY-ND';
  if (value.includes('/by-sa/')) return 'CC BY-SA';
  if (value.includes('/by/')) return 'CC BY';
  if (value.includes('rightsstatements.org')) return 'Rights Statement';
  return 'Creative Commons';
}

function metadataLicense(metadata) {
  const candidates = [
    metadata && metadata.licenseurl,
    metadata && metadata.licenseUrl,
    metadata && metadata.license,
    metadata && metadata.rights,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeLicense(candidate);
    if (normalized) return normalized;
  }
  return '';
}

function isPublicAudioFile(file) {
  if (!file || file.private === true || String(file.private || '').toLowerCase() === 'true') return false;
  const name = safeFileName(file.name);
  const dot = name.lastIndexOf('.');
  const extension = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  return !!(name && AUDIO_EXTENSIONS.has(extension));
}

function audioFileRank(file) {
  const name = compactText(file && file.name).toLowerCase();
  if (/\.mp3$/.test(name)) return 0;
  if (/\.(ogg|oga|opus)$/.test(name)) return 1;
  if (/\.flac$/.test(name)) return 2;
  if (/\.m4a$/.test(name)) return 3;
  return 4;
}

function chooseAudioFile(files, requestedName = '') {
  const requested = safeFileName(requestedName);
  return (Array.isArray(files) ? files : [])
    .filter(isPublicAudioFile)
    .filter((file) => !requested || file.name === requested)
    .sort((a, b) => audioFileRank(a) - audioFileRank(b) || compactText(a.name).localeCompare(compactText(b.name)))[0] || null;
}

function pruneCache() {
  while (metadataCache.size > MAX_CACHE_ENTRIES) {
    const first = metadataCache.keys().next().value;
    if (!first) break;
    metadataCache.delete(first);
  }
}

async function fetchJson(url, timeoutMs) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mineradio Open Audio/1.0' },
      signal: controller ? controller.signal : undefined,
    });
    if (!response || response.ok === false) {
      const error = new Error('OPEN_AUDIO_REMOTE_' + (response && response.status || 'FAILED'));
      error.statusCode = response && response.status || 502;
      throw error;
    }
    return await response.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchArchiveMetadata(identifier) {
  const cleanId = safeIdentifier(identifier);
  if (!cleanId) return null;
  const key = cleanId.toLowerCase();
  const now = Date.now();
  const cached = metadataCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;
  const value = await fetchJson(ARCHIVE_METADATA_URL + archiveUrlPart(cleanId), METADATA_TIMEOUT_MS);
  metadataCache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
  pruneCache();
  return value;
}

function archiveDownloadUrl(identifier, fileName) {
  const id = safeIdentifier(identifier);
  const file = safeFileName(fileName);
  return id && file ? ARCHIVE_DOWNLOAD_URL + archiveUrlPart(id) + '/' + archiveUrlPart(file) : '';
}

function archiveDetailsUrl(identifier) {
  const id = safeIdentifier(identifier);
  return id ? 'https://archive.org/details/' + archiveUrlPart(id) : '';
}

function mapArchiveItem(payload, file) {
  const metadata = payload && payload.metadata || {};
  const identifier = safeIdentifier(metadata.identifier || payload && payload.itemid);
  const licenseUrl = metadataLicense(metadata);
  const audioUrl = archiveDownloadUrl(identifier, file && file.name);
  if (!identifier || !file || !licenseUrl || !audioUrl) return null;
  const title = compactText(metadata.title, identifier);
  const creator = joinedText(metadata.creator || metadata.artist, '开放音频');
  const dot = file.name.lastIndexOf('.');
  return {
    id: 'open:' + identifier + ':' + encodeURIComponent(file.name),
    provider: 'open',
    source: 'open-audio',
    name: title,
    title,
    artist: creator,
    artists: creator.split(/\s*\/\s*/).filter(Boolean).map((name) => ({ name })),
    album: joinedText(metadata.album || metadata.collection),
    cover: ARCHIVE_IMAGE_URL + archiveUrlPart(identifier),
    archiveId: identifier,
    archiveFile: file.name,
    sourceUrl: archiveDetailsUrl(identifier),
    licenseUrl,
    licenseLabel: licenseLabel(licenseUrl),
    description: compactText(metadata.description).slice(0, 500),
    duration: Math.max(0, Number(file.length || file.duration) || 0),
    format: compactText(file.format || (dot >= 0 ? file.name.slice(dot + 1) : '')).toLowerCase(),
    playable: true,
    freeSource: true,
    publicCatalog: true,
  };
}

function mapArchiveSearchDoc(doc) {
  const identifier = safeIdentifier(doc && doc.identifier);
  const licenseUrl = normalizeLicense(doc && doc.licenseurl);
  if (!identifier || !licenseUrl) return null;
  const title = compactText(doc.title, identifier);
  const creator = joinedText(doc.creator, '开放音频');
  return {
    id: 'open:' + identifier,
    provider: 'open',
    source: 'open-audio',
    name: title,
    title,
    artist: creator,
    artists: creator.split(/\s*\/\s*/).filter(Boolean).map((name) => ({ name })),
    album: joinedText(doc.collection),
    cover: ARCHIVE_IMAGE_URL + archiveUrlPart(identifier),
    archiveId: identifier,
    archiveFile: '',
    sourceUrl: archiveDetailsUrl(identifier),
    licenseUrl,
    licenseLabel: licenseLabel(licenseUrl),
    description: compactText(doc.description).slice(0, 500),
    duration: 0,
    format: 'open',
    playable: true,
    freeSource: true,
    publicCatalog: true,
  };
}

async function resolveArchiveItem(identifier, requestedFile = '') {
  const payload = await fetchArchiveMetadata(identifier);
  const metadata = payload && payload.metadata || {};
  if (!payload || payload.is_dark === 1 || metadata.private === true || String(metadata.private || '').toLowerCase() === 'true') return null;
  if (!metadataLicense(metadata)) return null;
  const file = chooseAudioFile(payload.files, requestedFile);
  return file ? mapArchiveItem(payload, file) : null;
}

function buildArchiveSearchQuery(keywords) {
  const normalized = compactText(keywords).normalize('NFKC');
  const tokens = normalized.split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}_-]/gu, ''))
    .filter(Boolean)
    .slice(0, 8);
  const term = tokens.length ? tokens.map((token) => `"${token}"`).join(' AND ') : 'music';
  return `collection:netlabels AND mediatype:audio AND licenseurl:* AND (title:(${term}) OR creator:(${term}) OR subject:(${term}))`;
}

async function handleOpenAudioSearch(keywords, limit = 10, offset = 0) {
  const safeLimit = Math.max(1, Math.min(16, Number.parseInt(limit, 10) || 10));
  const safeOffset = Math.max(0, Number.parseInt(offset, 10) || 0);
  const rows = Math.min(32, safeLimit * 2);
  const params = new URLSearchParams({
    q: buildArchiveSearchQuery(keywords),
    rows: String(rows),
    start: String(safeOffset),
    output: 'json',
  });
  ['identifier', 'title', 'creator', 'licenseurl', 'collection', 'description'].forEach((field) => params.append('fl[]', field));
  const search = await fetchJson(ARCHIVE_SEARCH_URL + '?' + params.toString(), SEARCH_TIMEOUT_MS);
  const response = search && search.response || {};
  const docs = Array.isArray(response.docs) ? response.docs : [];
  // Search stays one-request and fast. The selected item is re-fetched and its
  // concrete public audio file is verified only when playback starts.
  const songs = docs.map(mapArchiveSearchDoc).filter(Boolean).slice(0, safeLimit);
  const total = Math.max(0, Number(response.numFound) || 0);
  const nextOffset = safeOffset + docs.length;
  return {
    provider: 'open',
    source: 'archive.org',
    songs,
    offset: safeOffset,
    limit: safeLimit,
    total,
    nextOffset,
    hasMore: nextOffset < total && docs.length > 0,
    message: songs.length ? '' : '没有找到带明确开放授权的音频。可以尝试英文关键词，或导入本地音乐。',
  };
}

async function handleOpenAudioSongUrl(params = {}) {
  const song = await resolveArchiveItem(params.archiveId || params.identifier, params.file || params.archiveFile);
  if (!song) {
    return {
      provider: 'open',
      url: '',
      playable: false,
      freeSource: true,
      reason: 'OPEN_AUDIO_LICENSE_OR_FILE_UNAVAILABLE',
      message: '开放音频的授权或文件暂时无法确认。',
    };
  }
  return {
    provider: 'open',
    id: song.id,
    url: archiveDownloadUrl(song.archiveId, song.archiveFile),
    playable: true,
    freeSource: true,
    source: 'archive.org',
    sourceUrl: song.sourceUrl,
    licenseUrl: song.licenseUrl,
    licenseLabel: song.licenseLabel,
    format: song.format,
    duration: song.duration,
    level: 'standard',
    quality: song.format || 'open',
  };
}

function openAudioStatus() {
  return {
    provider: 'open',
    label: '开放音频',
    short: 'OA',
    loggedIn: false,
    searchReady: true,
    publicCatalog: true,
    playbackReady: true,
    requiresLogin: false,
    source: 'archive.org',
  };
}

function setOpenAudioFetchForTests(fn) {
  fetchImpl = typeof fn === 'function' ? fn : (...args) => fetch(...args);
  metadataCache.clear();
}

function resetOpenAudioRuntimeForTests() {
  metadataCache.clear();
  fetchImpl = defaultOpenAudioFetch;
}

module.exports = {
  handleOpenAudioSearch,
  handleOpenAudioSongUrl,
  openAudioStatus,
  normalizeLicense,
  licenseLabel,
  buildArchiveSearchQuery,
  chooseAudioFile,
  setOpenAudioFetchForTests,
  resetOpenAudioRuntimeForTests,
};

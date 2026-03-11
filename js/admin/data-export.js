/**
 * AdminData — Data persistence layer for admin panel.
 * Loaded first. Holds all state (examples, groups) and handles
 * CRUD, import/export, File System Access API, and GitHub API writes.
 */
const AdminData = (() => {
  let examples = [];
  let groups = [];
  let dirHandle = null;

  // ---- GitHub Config (persisted in localStorage) ----
  const GH_KEY = 'tradesbythad_github';

  function getGitHubConfig() {
    try { return JSON.parse(localStorage.getItem(GH_KEY)); }
    catch { return null; }
  }

  // ---- Init ----
  async function init() {
    const [exRes, grRes] = await Promise.all([
      fetch('data/examples.json'),
      fetch('data/groups.json')
    ]);
    examples = await exRes.json();
    groups = await grRes.json();
  }

  // ---- Getters ----
  function getExamples() { return examples; }
  function getGroups() { return groups; }
  function getExample(id) { return examples.find(e => e.id === id); }
  function getGroup(id) { return groups.find(g => g.id === id); }

  // ---- Example CRUD ----
  function saveExample(data) {
    const idx = examples.findIndex(e => e.id === data.id);
    if (idx > -1) {
      examples[idx] = data;
    } else {
      if (!data.createdAt) data.createdAt = new Date().toISOString();
      if (!data.id) data.id = data.symbol.toLowerCase() + '-' + data.startDate;
      examples.push(data);
    }
  }

  function deleteExample(id) {
    const idx = examples.findIndex(e => e.id === id);
    if (idx > -1) examples.splice(idx, 1);
  }

  // ---- Group CRUD ----
  function saveGroup(data) {
    const idx = groups.findIndex(g => g.id === data.id);
    if (idx > -1) {
      groups[idx] = data;
    } else {
      groups.push(data);
    }
  }

  function deleteGroup(id) {
    const idx = groups.findIndex(g => g.id === id);
    if (idx > -1) groups.splice(idx, 1);
  }

  // ---- Export ----
  function exportJSON(filename, data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportExamples() { exportJSON('examples.json', examples); }
  function exportGroups() { exportJSON('groups.json', groups); }
  function exportAll() { exportJSON('stock-studies-data.json', { groups, examples }); }

  // ---- Import ----
  function importFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return resolve(null);
        try {
          const text = await file.text();
          resolve(JSON.parse(text));
        } catch (err) {
          alert('Invalid JSON file: ' + err.message);
          resolve(null);
        }
      });
      input.click();
    });
  }

  function setExamples(data) { examples = data; }
  function setGroups(data) { groups = data; }

  // ---- File System Access API (local dev) ----
  async function connectFolder() {
    if (!('showDirectoryPicker' in window)) {
      alert('File System Access API not supported. Use Chrome or Edge.');
      return false;
    }
    try {
      dirHandle = await window.showDirectoryPicker({
        id: 'stock-studies-data',
        mode: 'readwrite',
        startIn: 'desktop'
      });
      return true;
    } catch (e) {
      console.warn('Directory picker cancelled:', e);
      return false;
    }
  }

  async function writeToDisk() {
    if (!dirHandle) return;
    const dataDir = await dirHandle.getDirectoryHandle('data', { create: true });
    const writeFile = async (name, data) => {
      const fh = await dataDir.getFileHandle(name, { create: true });
      const writable = await fh.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    };
    await writeFile('examples.json', examples);
    await writeFile('groups.json', groups);
  }

  function isFolderConnected() { return !!dirHandle; }
  function getDirName() { return dirHandle ? dirHandle.name : null; }

  // ---- GitHub API ----
  function connectGitHub(owner, repo, token) {
    const config = { owner, repo, token };
    localStorage.setItem(GH_KEY, JSON.stringify(config));
    return config;
  }

  function disconnectGitHub() {
    localStorage.removeItem(GH_KEY);
  }

  function isGitHubConnected() {
    return !!getGitHubConfig();
  }

  function getGitHubRepoName() {
    const c = getGitHubConfig();
    return c ? `${c.owner}/${c.repo}` : null;
  }

  async function ghFetch(path, opts = {}) {
    const config = getGitHubConfig();
    if (!config) throw new Error('GitHub not connected');
    const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`, {
      ...opts,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...(opts.headers || {})
      }
    });
    return res;
  }

  async function getFileSHA(path) {
    const res = await ghFetch(path);
    if (res.ok) {
      const data = await res.json();
      return data.sha;
    }
    return null;
  }

  async function writeFileToGitHub(filename, data) {
    const path = `data/${filename}`;
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const sha = await getFileSHA(path);

    const body = {
      message: `Update ${filename} via admin`,
      content,
      branch: 'main'
    };
    if (sha) body.sha = sha;

    const res = await ghFetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'GitHub API error');
    }
  }

  async function writeToGitHub() {
    await writeFileToGitHub('examples.json', examples);
    await writeFileToGitHub('groups.json', groups);
  }

  // Validate token works
  async function testGitHubConnection(owner, repo, token) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Cannot access repo');
    }
    return true;
  }

  // ---- Polygon.io Config (persisted in localStorage) ----
  const POLYGON_KEY = 'tradesbythad_polygon';

  function setPolygonApiKey(key) {
    localStorage.setItem(POLYGON_KEY, key);
  }

  function getPolygonApiKey() {
    return localStorage.getItem(POLYGON_KEY) || null;
  }

  function isPolygonConnected() {
    return !!getPolygonApiKey();
  }

  // ---- Polygon.io OHLC Fetching ----
  async function polygonFetch(endpoint) {
    const apiKey = getPolygonApiKey();
    if (!apiKey) throw new Error('Polygon.io API key not set');
    const url = `https://api.polygon.io${endpoint}${endpoint.includes('?') ? '&' : '?'}apiKey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 429) throw new Error('Rate limited — wait 60s and try again');
      throw new Error(err.error || err.message || `Polygon API error (${res.status})`);
    }
    return res.json();
  }

  async function fetchPolygonOHLC(symbol, multiplier, timespan, from, to) {
    const allBars = [];
    let nextUrl = null;
    let endpoint = `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000`;

    while (endpoint) {
      const json = nextUrl
        ? await (async () => { const r = await fetch(nextUrl + `&apiKey=${getPolygonApiKey()}`); return r.json(); })()
        : await polygonFetch(endpoint);

      if (json.results && json.results.length > 0) {
        json.results.forEach(bar => {
          const d = new Date(bar.t);
          if (timespan === 'day') {
            allBars.push({
              time: d.toISOString().split('T')[0],
              open: Math.round(bar.o * 100) / 100,
              high: Math.round(bar.h * 100) / 100,
              low: Math.round(bar.l * 100) / 100,
              close: Math.round(bar.c * 100) / 100
            });
          } else {
            allBars.push({
              time: Math.floor(d.getTime() / 1000),
              open: Math.round(bar.o * 100) / 100,
              high: Math.round(bar.h * 100) / 100,
              low: Math.round(bar.l * 100) / 100,
              close: Math.round(bar.c * 100) / 100
            });
          }
        });
      }

      nextUrl = json.next_url || null;
      if (!nextUrl) break;
    }

    if (allBars.length === 0) throw new Error('No data returned for ' + symbol);
    return allBars;
  }

  async function testPolygonConnection(apiKey) {
    const res = await fetch(`https://api.polygon.io/v3/reference/tickers?ticker=SPY&limit=1&apiKey=${apiKey}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid API key');
    }
    return true;
  }

  async function fetchAndSaveOHLC(symbol, onProgress) {
    if (!isGitHubConnected()) throw new Error('GitHub not connected');
    if (!isPolygonConnected()) throw new Error('Polygon.io API key not set');

    const today = new Date().toISOString().split('T')[0];

    // Daily — max history (from 1990)
    if (onProgress) onProgress(`Fetching ${symbol} daily data...`);
    const daily = await fetchPolygonOHLC(symbol, 1, 'day', '1990-01-01', today);
    if (onProgress) onProgress(`Saving ${symbol}.json (${daily.length} bars)...`);
    await writeFileToGitHub(`ohlc/${symbol}.json`, daily);

    // 5-min — last 5 trading days
    try {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 7); // 7 calendar days to cover 5 trading days
      const fromDate = fiveDaysAgo.toISOString().split('T')[0];
      if (onProgress) onProgress(`Fetching ${symbol} intraday data...`);
      const intraday = await fetchPolygonOHLC(symbol, 5, 'minute', fromDate, today);
      if (onProgress) onProgress(`Saving ${symbol}-5min.json (${intraday.length} bars)...`);
      await writeFileToGitHub(`ohlc/${symbol}-5min.json`, intraday);
    } catch (e) {
      console.warn('5-min data not available for ' + symbol + ':', e.message);
    }

    return daily.length;
  }

  async function fetchAndSaveETF(etfSymbol, onProgress) {
    if (!isGitHubConnected()) throw new Error('GitHub not connected');
    if (!isPolygonConnected()) throw new Error('Polygon.io API key not set');

    const today = new Date().toISOString().split('T')[0];
    if (onProgress) onProgress(`Fetching ${etfSymbol} ETF data...`);
    const daily = await fetchPolygonOHLC(etfSymbol, 1, 'day', '1990-01-01', today);
    if (onProgress) onProgress(`Saving ${etfSymbol}.json (${daily.length} bars)...`);
    await writeFileToGitHub(`ohlc/${etfSymbol}.json`, daily);
    return daily.length;
  }

  // Unified save — picks the right backend
  async function persist() {
    if (isGitHubConnected()) {
      await writeToGitHub();
      return 'github';
    }
    if (dirHandle) {
      await writeToDisk();
      return 'folder';
    }
    return null;
  }

  return {
    init,
    getExamples, getGroups, getExample, getGroup,
    saveExample, deleteExample,
    saveGroup, deleteGroup,
    exportJSON, exportExamples, exportGroups, exportAll,
    importFile, setExamples, setGroups,
    connectFolder, writeToDisk, isFolderConnected, getDirName,
    connectGitHub, disconnectGitHub, isGitHubConnected, getGitHubRepoName,
    testGitHubConnection, writeToGitHub, persist,
    setPolygonApiKey, getPolygonApiKey, isPolygonConnected, testPolygonConnection,
    fetchAndSaveOHLC, fetchAndSaveETF
  };
})();

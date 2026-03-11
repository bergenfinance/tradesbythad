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
    testGitHubConnection, writeToGitHub, persist
  };
})();

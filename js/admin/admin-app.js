/**
 * Admin App — Main controller. Self-initializes on DOMContentLoaded.
 * Depends on: AdminData, FormHandler
 */
(async () => {

  // ---- Init data ----
  try {
    await AdminData.init();
  } catch (e) {
    showToast('Failed to load data. Make sure you are running from a web server.', 'error');
    console.error(e);
    return;
  }

  // ---- Tab switching ----
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.panel).classList.add('active');
    });
  });

  // ---- Connect Button (header) ----
  const connectBtn = document.getElementById('connect-btn');

  function updateConnectStatus() {
    if (AdminData.isGitHubConnected()) {
      connectBtn.textContent = 'GitHub: ' + AdminData.getGitHubRepoName();
      connectBtn.classList.add('btn-primary');
      connectBtn.classList.remove('btn-ghost');
    } else if (AdminData.isFolderConnected()) {
      connectBtn.textContent = 'Folder: ' + AdminData.getDirName();
      connectBtn.classList.add('btn-primary');
      connectBtn.classList.remove('btn-ghost');
    } else {
      connectBtn.textContent = 'Connect';
      connectBtn.classList.remove('btn-primary');
    }
  }

  connectBtn.addEventListener('click', () => {
    showConnectModal();
  });

  updateConnectStatus();

  // ---- Connect Modal ----
  function showConnectModal() {
    const existing = document.getElementById('connect-modal');
    if (existing) existing.remove();

    const ghConnected = AdminData.isGitHubConnected();
    const repoName = AdminData.getGitHubRepoName() || '';

    const modal = document.createElement('div');
    modal.id = 'connect-modal';
    modal.className = 'admin-modal-overlay';
    modal.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <h3>Connect Storage</h3>
          <button class="btn btn-ghost btn-sm" data-close>&times;</button>
        </div>
        <div class="admin-modal-body">
          <div class="admin-connect-section">
            <div class="admin-connect-option">
              <div>
                <strong>GitHub</strong>
                <p style="color:var(--text-secondary);font-size:var(--text-xs);margin-top:2px">
                  Commit changes directly to your repo from any computer.
                  ${ghConnected ? '<br><span style="color:var(--accent-green)">Connected to ' + repoName + '</span>' : ''}
                </p>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-3);margin-top:var(--space-3)">
              <div class="form-group" style="margin:0">
                <label style="font-size:var(--text-xs)">Repository owner</label>
                <input class="input" id="gh-owner" placeholder="your-username" value="${repoName.split('/')[0] || ''}">
              </div>
              <div class="form-group" style="margin:0">
                <label style="font-size:var(--text-xs)">Repository name</label>
                <input class="input" id="gh-repo" placeholder="tradesbythad.com" value="${repoName.split('/')[1] || ''}">
              </div>
              <div class="form-group" style="margin:0">
                <label style="font-size:var(--text-xs)">Personal Access Token <a href="https://github.com/settings/tokens?type=beta" target="_blank" style="color:var(--text-link)">(create one)</a></label>
                <input class="input" id="gh-token" type="password" placeholder="ghp_xxxxxxxxxxxx" value="${ghConnected ? '••••••••' : ''}">
                <span style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:2px;display:block">
                  Fine-grained token with Contents read/write permission on the repo
                </span>
              </div>
              <div style="display:flex;gap:var(--space-2)">
                <button class="btn btn-primary btn-sm" id="gh-connect-btn">${ghConnected ? 'Update' : 'Connect'}</button>
                ${ghConnected ? '<button class="btn btn-ghost btn-sm" id="gh-disconnect-btn" style="color:var(--accent-red)">Disconnect</button>' : ''}
              </div>
              <div id="gh-status" style="font-size:var(--text-xs);min-height:18px"></div>
            </div>
          </div>

          <div style="border-top:1px solid var(--border-secondary);margin:var(--space-4) 0;padding-top:var(--space-4)">
            <div class="admin-connect-option">
              <div>
                <strong>Polygon.io</strong>
                <p style="color:var(--text-secondary);font-size:var(--text-xs);margin-top:2px">
                  Market data API for auto-fetching chart data when adding examples.
                  ${AdminData.isPolygonConnected() ? '<br><span style="color:var(--accent-green)">API key saved</span>' : ''}
                </p>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-3);margin-top:var(--space-3)">
              <div class="form-group" style="margin:0">
                <label style="font-size:var(--text-xs)">API Key <a href="https://polygon.io/dashboard/api-keys" target="_blank" style="color:var(--text-link)">(get one)</a></label>
                <input class="input" id="polygon-key" type="password" placeholder="your-api-key" value="${AdminData.isPolygonConnected() ? '••••••••' : ''}">
              </div>
              <div style="display:flex;gap:var(--space-2)">
                <button class="btn btn-primary btn-sm" id="polygon-connect-btn">${AdminData.isPolygonConnected() ? 'Update' : 'Save Key'}</button>
                ${AdminData.isPolygonConnected() ? '<button class="btn btn-ghost btn-sm" id="polygon-disconnect-btn" style="color:var(--accent-red)">Remove</button>' : ''}
              </div>
              <div id="polygon-status" style="font-size:var(--text-xs);min-height:18px"></div>
            </div>
          </div>

          <div style="border-top:1px solid var(--border-secondary);margin:var(--space-4) 0;padding-top:var(--space-4)">
            <div class="admin-connect-option">
              <div>
                <strong>Local Folder</strong>
                <p style="color:var(--text-secondary);font-size:var(--text-xs);margin-top:2px">
                  Write directly to your project's data/ folder. Chrome/Edge only.
                </p>
              </div>
              <button class="btn btn-sm" id="folder-connect-btn">
                ${AdminData.isFolderConnected() ? 'Connected: ' + AdminData.getDirName() : 'Browse...'}
              </button>
            </div>
          </div>
        </div>
      </div>`;

    document.body.appendChild(modal);

    // Close
    modal.querySelector('[data-close]').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // GitHub connect
    modal.querySelector('#gh-connect-btn').addEventListener('click', async () => {
      const owner = modal.querySelector('#gh-owner').value.trim();
      const repo = modal.querySelector('#gh-repo').value.trim();
      const tokenInput = modal.querySelector('#gh-token').value.trim();
      const status = modal.querySelector('#gh-status');

      if (!owner || !repo || !tokenInput) {
        status.innerHTML = '<span style="color:var(--accent-red)">All fields required</span>';
        return;
      }

      // Don't re-validate if token hasn't changed
      const token = tokenInput === '••••••••' ? JSON.parse(localStorage.getItem('tradesbythad_github'))?.token : tokenInput;
      if (!token) {
        status.innerHTML = '<span style="color:var(--accent-red)">Enter your token</span>';
        return;
      }

      status.innerHTML = '<span style="color:var(--text-tertiary)">Testing connection...</span>';

      try {
        await AdminData.testGitHubConnection(owner, repo, token);
        AdminData.connectGitHub(owner, repo, token);
        status.innerHTML = '<span style="color:var(--accent-green)">Connected!</span>';
        updateConnectStatus();
        showToast('GitHub connected — saves will auto-commit');
        setTimeout(() => modal.remove(), 800);
      } catch (e) {
        status.innerHTML = `<span style="color:var(--accent-red)">${e.message}</span>`;
      }
    });

    // GitHub disconnect
    const disconnectBtn = modal.querySelector('#gh-disconnect-btn');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        AdminData.disconnectGitHub();
        updateConnectStatus();
        showToast('GitHub disconnected');
        modal.remove();
      });
    }

    // Polygon.io connect
    modal.querySelector('#polygon-connect-btn').addEventListener('click', async () => {
      const keyInput = modal.querySelector('#polygon-key').value.trim();
      const status = modal.querySelector('#polygon-status');

      if (!keyInput) {
        status.innerHTML = '<span style="color:var(--accent-red)">API key required</span>';
        return;
      }

      const apiKey = keyInput === '••••••••' ? AdminData.getPolygonApiKey() : keyInput;
      if (!apiKey) {
        status.innerHTML = '<span style="color:var(--accent-red)">Enter your API key</span>';
        return;
      }

      status.innerHTML = '<span style="color:var(--text-tertiary)">Testing connection...</span>';
      try {
        await AdminData.testPolygonConnection(apiKey);
        AdminData.setPolygonApiKey(apiKey);
        status.innerHTML = '<span style="color:var(--accent-green)">Connected!</span>';
        showToast('Polygon.io connected — chart data will auto-fetch');
      } catch (e) {
        status.innerHTML = `<span style="color:var(--accent-red)">${e.message}</span>`;
      }
    });

    // Polygon.io disconnect
    const polygonDisconnectBtn = modal.querySelector('#polygon-disconnect-btn');
    if (polygonDisconnectBtn) {
      polygonDisconnectBtn.addEventListener('click', () => {
        localStorage.removeItem('tradesbythad_polygon');
        showToast('Polygon.io key removed');
        modal.remove();
      });
    }

    // Local folder connect
    modal.querySelector('#folder-connect-btn').addEventListener('click', async () => {
      const ok = await AdminData.connectFolder();
      if (ok) {
        updateConnectStatus();
        showToast('Folder connected');
        modal.remove();
      }
    });
  }

  // ---- Examples panel ----
  const exFormArea = document.getElementById('example-form-area');
  const exList = document.getElementById('examples-list');

  document.getElementById('new-example').addEventListener('click', () => {
    openExampleForm(null);
  });

  function pnlBadge(ex) {
    if (ex.entryPrice == null || ex.exitPrice == null) return '';
    const pnl = ex.direction === 'short'
      ? ((ex.entryPrice - ex.exitPrice) / ex.entryPrice) * 100
      : ((ex.exitPrice - ex.entryPrice) / ex.entryPrice) * 100;
    const cls = pnl >= 0 ? 'badge-gain' : 'badge-loss';
    return `<span class="${cls}">${pnl >= 0 ? '+' : ''}${pnl.toFixed(1)}%</span>`;
  }

  function renderExamplesList() {
    const examples = AdminData.getExamples();
    const groups = AdminData.getGroups();

    if (!examples.length) {
      exList.innerHTML = '<div class="empty-state"><p>No examples yet. Click "+ New Example" to add one.</p></div>';
      return;
    }

    const sorted = [...examples].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));

    exList.innerHTML = `<ul class="admin-list">${sorted.map(ex => {
      const group = groups.find(g => g.id === ex.groupId);
      return `
        <li class="admin-list-item">
          <div class="item-info">
            <span style="font-family:var(--font-mono);font-weight:var(--weight-bold);min-width:48px">${ex.symbol}</span>
            <span style="color:var(--text-secondary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.title}</span>
            ${pnlBadge(ex)}
            ${group ? `<span class="badge badge-group" style="background:${group.color}">${group.name}</span>` : ''}
            <span style="color:var(--text-tertiary);font-size:var(--text-xs);font-family:var(--font-mono)">${ex.startDate}</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-ghost" data-edit="${ex.id}">Edit</button>
            <button class="btn btn-sm btn-ghost" style="color:var(--accent-red)" data-delete="${ex.id}">Delete</button>
          </div>
        </li>`;
    }).join('')}</ul>`;

    exList.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        openExampleForm(AdminData.getExample(btn.dataset.edit));
      });
    });

    exList.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ex = AdminData.getExample(btn.dataset.delete);
        if (!ex) return;
        if (!confirm(`Delete "${ex.symbol} — ${ex.title}"?`)) return;
        AdminData.deleteExample(ex.id);
        renderExamplesList();
        showToast('Example deleted');
        await autoPersist();
      });
    });
  }

  function openExampleForm(example) {
    exList.style.display = 'none';
    exFormArea.style.display = 'block';
    exFormArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const handle = FormHandler.renderExampleForm(exFormArea, example, AdminData.getGroups());

    handle.onSave(async (data) => {
      const isNew = !example;
      AdminData.saveExample(data);
      hideExampleForm();
      renderExamplesList();
      showToast(example ? 'Example updated' : 'Example created');
      await autoPersist();

      // Auto-fetch OHLC data for new examples
      if (isNew && AdminData.isGitHubConnected() && AdminData.isPolygonConnected()) {
        fetchOHLCForSymbol(data.symbol);
      }
    });

    handle.onCancel(() => hideExampleForm());
  }

  function hideExampleForm() {
    exFormArea.style.display = 'none';
    exFormArea.innerHTML = '';
    exList.style.display = 'block';
  }

  // ---- Groups panel ----
  const grFormArea = document.getElementById('group-form-area');
  const grList = document.getElementById('groups-list');

  document.getElementById('new-group').addEventListener('click', () => {
    openGroupForm(null);
  });

  function renderGroupsList() {
    const groups = AdminData.getGroups();
    const examples = AdminData.getExamples();

    if (!groups.length) {
      grList.innerHTML = '<div class="empty-state"><p>No groups yet. Click "+ New Group" to add one.</p></div>';
      return;
    }

    grList.innerHTML = `<ul class="admin-list">${groups.map(g => {
      const count = examples.filter(e => e.groupId === g.id).length;
      return `
        <li class="admin-list-item">
          <div class="item-info">
            <span class="admin-color-dot" style="background:${g.color}"></span>
            <span style="font-weight:var(--weight-semibold)">${g.name}</span>
            <span style="color:var(--text-secondary);font-family:var(--font-mono)">${g.etfSymbol}</span>
            <span style="color:var(--text-tertiary);font-size:var(--text-xs)">${count} example${count !== 1 ? 's' : ''}</span>
          </div>
          <div class="item-actions">
            <button class="btn btn-sm btn-ghost" data-edit-group="${g.id}">Edit</button>
            <button class="btn btn-sm btn-ghost" style="color:var(--accent-red)" data-delete-group="${g.id}">Delete</button>
          </div>
        </li>`;
    }).join('')}</ul>`;

    grList.querySelectorAll('[data-edit-group]').forEach(btn => {
      btn.addEventListener('click', () => {
        openGroupForm(AdminData.getGroup(btn.dataset.editGroup));
      });
    });

    grList.querySelectorAll('[data-delete-group]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const g = AdminData.getGroup(btn.dataset.deleteGroup);
        if (!g) return;
        if (!confirm(`Delete group "${g.name}"? Examples in this group will become ungrouped.`)) return;
        AdminData.deleteGroup(g.id);
        renderGroupsList();
        showToast('Group deleted');
        await autoPersist();
      });
    });
  }

  function openGroupForm(group) {
    grList.style.display = 'none';
    grFormArea.style.display = 'block';
    grFormArea.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const handle = FormHandler.renderGroupForm(grFormArea, group);

    handle.onSave(async (data) => {
      const isNew = !group;
      AdminData.saveGroup(data);
      hideGroupForm();
      renderGroupsList();
      showToast(group ? 'Group updated' : 'Group created');
      await autoPersist();

      // Auto-fetch ETF data for new groups
      if (isNew && data.etfSymbol && AdminData.isGitHubConnected() && AdminData.isPolygonConnected()) {
        fetchOHLCForSymbol(data.etfSymbol, true);
      }
    });

    handle.onCancel(() => hideGroupForm());
  }

  function hideGroupForm() {
    grFormArea.style.display = 'none';
    grFormArea.innerHTML = '';
    grList.style.display = 'block';
  }

  // ---- Data Management ----
  document.getElementById('export-examples').addEventListener('click', () => {
    AdminData.exportExamples();
    showToast('examples.json downloaded');
  });

  document.getElementById('export-groups').addEventListener('click', () => {
    AdminData.exportGroups();
    showToast('groups.json downloaded');
  });

  document.getElementById('export-all').addEventListener('click', () => {
    AdminData.exportAll();
    showToast('Full data export downloaded');
  });

  document.getElementById('import-examples').addEventListener('click', async () => {
    const data = await AdminData.importFile();
    if (data && Array.isArray(data)) {
      AdminData.setExamples(data);
      renderExamplesList();
      showToast(`Imported ${data.length} examples`);
    }
  });

  document.getElementById('import-groups').addEventListener('click', async () => {
    const data = await AdminData.importFile();
    if (data && Array.isArray(data)) {
      AdminData.setGroups(data);
      renderGroupsList();
      showToast(`Imported ${data.length} groups`);
    }
  });

  // ---- Unified Persist ----
  async function autoPersist() {
    try {
      const method = await AdminData.persist();
      if (method === 'github') {
        showToast('Saved to GitHub', 'success');
      } else if (method === 'folder') {
        showToast('Saved to disk', 'success');
      }
    } catch (e) {
      console.error('Auto-persist failed:', e);
      showToast('Save failed: ' + e.message, 'error');
    }
  }

  // ---- OHLC Auto-Fetch ----
  async function fetchOHLCForSymbol(symbol, isETF) {
    showToast(`Fetching chart data for ${symbol}...`, 'info');
    try {
      const fn = isETF ? AdminData.fetchAndSaveETF : AdminData.fetchAndSaveOHLC;
      const bars = await fn(symbol, (msg) => {
        console.log(msg);
      });
      showToast(`${symbol} chart data saved (${bars} bars)`, 'success');
    } catch (e) {
      console.error('OHLC fetch failed:', e);
      showToast(`Chart data fetch failed for ${symbol}: ${e.message}`, 'error');
    }
  }

  // ---- Toast ----
  function showToast(message, type) {
    type = type || 'success';
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ---- Initial render ----
  renderExamplesList();
  renderGroupsList();
})();

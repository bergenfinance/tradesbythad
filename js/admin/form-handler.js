/**
 * FormHandler — Form rendering & data collection for admin panel.
 * No dependencies on other admin modules.
 */
const FormHandler = (() => {

  const SETUP_TYPES = [
    ['cup-with-handle', 'Cup with Handle'],
    ['double-bottom', 'Double Bottom'],
    ['flat-base', 'Flat Base'],
    ['ascending-base', 'Ascending Base'],
    ['high-tight-flag', 'High Tight Flag'],
    ['base-on-base', 'Base on Base'],
    ['ipo-base', 'IPO Base'],
    ['episodic-pivot', 'Episodic Pivot'],
    ['power-play', 'Power Play'],
    ['pullback-to-ma', 'Pullback to MA'],
    ['gap-up-breakout', 'Gap-Up Breakout'],
    ['other', 'Other']
  ];

  // ---- Helpers ----
  function esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
  }

  function opt(value, label, selected) {
    return `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)}</option>`;
  }

  function sectionHeader(title, id, open) {
    return `
      <button type="button" class="admin-section-toggle${open ? ' open' : ''}" data-section="${id}">
        <svg class="admin-section-chevron" width="12" height="12" viewBox="0 0 12 12"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <span>${title}</span>
      </button>`;
  }

  // ---- Example Form ----
  function renderExampleForm(container, example, groups) {
    const isEdit = !!example;
    const ex = example || {};

    const groupOpts = groups.map(g => opt(g.id, g.name, ex.groupId === g.id)).join('');
    const setupOpts = SETUP_TYPES.map(([v, l]) => opt(v, l, ex.setupType === v)).join('');
    const adOpts = ['A', 'B', 'C', 'D'].map(r => opt(r, r, ex.adRating === r)).join('');
    const mktOpts = [
      ['uptrend', 'Confirmed Uptrend'],
      ['uptrend-pressure', 'Uptrend Under Pressure'],
      ['correction', 'Correction']
    ].map(([v, l]) => opt(v, l, ex.marketCondition === v)).join('');

    container.innerHTML = `
      <div class="admin-form-card">
        <div class="admin-form-header">
          <h3>${isEdit ? 'Edit' : 'New'} Example</h3>
          <div id="admin-pnl-badge" class="admin-pnl-badge" style="display:none"></div>
        </div>

        <form id="admin-example-form">

          <!-- === SECTION: Core Info === -->
          <div class="admin-form-section">
            <div class="form-row form-row-3">
              <div class="form-group">
                <label>Symbol <span class="required">*</span></label>
                <input class="input" name="symbol" required value="${esc(ex.symbol)}" placeholder="NVDA" style="text-transform:uppercase;font-family:var(--font-mono);font-weight:var(--weight-bold)">
              </div>
              <div class="form-group">
                <label>Group <span class="required">*</span></label>
                <select class="select" name="groupId" required>
                  <option value="">Select...</option>
                  ${groupOpts}
                </select>
              </div>
              <div class="form-group">
                <label>Direction</label>
                <select class="select" name="direction">
                  <option value="long"${ex.direction !== 'short' ? ' selected' : ''}>Long</option>
                  <option value="short"${ex.direction === 'short' ? ' selected' : ''}>Short</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Start Date <span class="required">*</span></label>
                <input class="input" name="startDate" type="date" required value="${ex.startDate || ''}">
              </div>
              <div class="form-group">
                <label>End Date <span class="required">*</span></label>
                <input class="input" name="endDate" type="date" required value="${ex.endDate || ''}">
              </div>
            </div>
          </div>

          <!-- === SECTION: Trade === -->
          ${sectionHeader('Trade Data', 'trade', true)}
          <div class="admin-form-section" data-section-body="trade">
            <div class="form-row form-row-3">
              <div class="form-group">
                <label>Entry Price</label>
                <input class="input" name="entryPrice" type="number" step="0.01" value="${ex.entryPrice != null ? ex.entryPrice : ''}" placeholder="0.00">
              </div>
              <div class="form-group">
                <label>Exit Price</label>
                <input class="input" name="exitPrice" type="number" step="0.01" value="${ex.exitPrice != null ? ex.exitPrice : ''}" placeholder="0.00">
              </div>
              <div class="form-group">
                <label>Stop Loss</label>
                <input class="input" name="stopLoss" type="number" step="0.01" value="${ex.stopLoss != null ? ex.stopLoss : ''}" placeholder="0.00">
              </div>
            </div>
            <div id="admin-trade-stats" class="admin-trade-stats"></div>
          </div>

          <!-- === SECTION: Pattern & Context === -->
          ${sectionHeader('Pattern & Context', 'pattern', isEdit)}
          <div class="admin-form-section${isEdit ? '' : ' collapsed'}" data-section-body="pattern">
            <div class="form-row">
              <div class="form-group">
                <label>Setup Type</label>
                <select class="select" name="setupType">
                  <option value="">None</option>
                  ${setupOpts}
                </select>
              </div>
              <div class="form-group">
                <label>Market Condition</label>
                <select class="select" name="marketCondition">
                  <option value="">None</option>
                  ${mktOpts}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Base Number</label>
                <input class="input" name="baseNumber" type="number" min="1" max="10" value="${ex.baseNumber != null ? ex.baseNumber : ''}" placeholder="1">
              </div>
              <div class="form-group">
                <label>Tags</label>
                <input class="input" name="tags" value="${esc((ex.tags || []).join(', '))}" placeholder="breakout, volume, earnings">
              </div>
            </div>
          </div>

          <!-- === SECTION: Fundamentals === -->
          ${sectionHeader('Fundamentals', 'fundamentals', isEdit)}
          <div class="admin-form-section${isEdit ? '' : ' collapsed'}" data-section-body="fundamentals">
            <div class="form-row">
              <div class="form-group">
                <label>EPS Growth %</label>
                <input class="input" name="epsGrowth" type="number" value="${ex.epsGrowth != null ? ex.epsGrowth : ''}" placeholder="45">
              </div>
              <div class="form-group">
                <label>Sales Growth %</label>
                <input class="input" name="salesGrowth" type="number" value="${ex.salesGrowth != null ? ex.salesGrowth : ''}" placeholder="32">
              </div>
            </div>
            <div class="form-row form-row-3">
              <div class="form-group">
                <label>RS Rating</label>
                <input class="input" name="rsRating" type="number" min="1" max="99" value="${ex.rsRating != null ? ex.rsRating : ''}" placeholder="92">
              </div>
              <div class="form-group">
                <label>Composite Rating</label>
                <input class="input" name="compositeRating" type="number" min="1" max="99" value="${ex.compositeRating != null ? ex.compositeRating : ''}" placeholder="95">
              </div>
              <div class="form-group">
                <label>A/D Rating</label>
                <select class="select" name="adRating">
                  <option value="">--</option>
                  ${adOpts}
                </select>
              </div>
            </div>
          </div>

          <!-- === SECTION: Notes === -->
          ${sectionHeader('Title & Notes', 'notes', true)}
          <div class="admin-form-section" data-section-body="notes">
            <div class="form-group">
              <label>Title <span class="required">*</span></label>
              <div style="display:flex;gap:var(--space-2);align-items:center">
                <input class="input" name="title" required value="${esc(ex.title)}" placeholder="Auto-generated if left blank" style="flex:1" id="admin-title-input">
                <button type="button" class="btn btn-sm btn-ghost" id="admin-title-suggest" title="Auto-generate title">Auto</button>
              </div>
            </div>
            <div class="form-group">
              <label>Notes</label>
              <textarea class="textarea" name="notes" rows="4" placeholder="Describe the setup, entry logic, what you learned...">${esc(ex.notes)}</textarea>
            </div>
          </div>

          <!-- === Actions === -->
          <div class="admin-form-actions">
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Example'}</button>
            <button type="button" class="btn btn-ghost" data-action="cancel">Cancel</button>
          </div>
        </form>
      </div>`;

    const form = container.querySelector('#admin-example-form');
    let _onSave = null;
    let _onCancel = null;

    // -- Section toggles --
    container.querySelectorAll('.admin-section-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('open');
        const body = container.querySelector(`[data-section-body="${btn.dataset.section}"]`);
        if (body) body.classList.toggle('collapsed');
      });
    });

    // -- Live P&L calculation --
    const entryInput = form.querySelector('[name="entryPrice"]');
    const exitInput = form.querySelector('[name="exitPrice"]');
    const stopInput = form.querySelector('[name="stopLoss"]');
    const dirInput = form.querySelector('[name="direction"]');
    const pnlBadge = container.querySelector('#admin-pnl-badge');
    const tradeStats = container.querySelector('#admin-trade-stats');

    function updateTradeStats() {
      const entry = parseFloat(entryInput.value);
      const exit = parseFloat(exitInput.value);
      const stop = parseFloat(stopInput.value);
      const dir = dirInput.value;

      if (!entry || !exit) {
        pnlBadge.style.display = 'none';
        tradeStats.innerHTML = '';
        return;
      }

      const pnl = dir === 'short' ? ((entry - exit) / entry) * 100 : ((exit - entry) / entry) * 100;
      const isWin = pnl > 0;

      pnlBadge.style.display = '';
      pnlBadge.className = 'admin-pnl-badge ' + (isWin ? 'pnl-positive' : 'pnl-negative');
      pnlBadge.textContent = (isWin ? '+' : '') + pnl.toFixed(1) + '%';

      let statsHTML = '';
      if (stop) {
        const risk = dir === 'short' ? Math.abs(stop - entry) : Math.abs(entry - stop);
        const reward = dir === 'short' ? Math.abs(entry - exit) : Math.abs(exit - entry);
        const rMultiple = risk > 0 ? (reward / risk) * (isWin ? 1 : -1) : 0;

        statsHTML = `
          <span class="admin-stat-chip">Risk: $${risk.toFixed(2)}</span>
          <span class="admin-stat-chip">Reward: $${reward.toFixed(2)}</span>
          <span class="admin-stat-chip ${rMultiple >= 0 ? 'chip-positive' : 'chip-negative'}">${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(1)}R</span>`;
      }
      tradeStats.innerHTML = statsHTML;
    }

    [entryInput, exitInput, stopInput, dirInput].forEach(el =>
      el.addEventListener('input', updateTradeStats)
    );
    dirInput.addEventListener('change', updateTradeStats);
    updateTradeStats(); // initial

    // -- Auto-title --
    const titleInput = container.querySelector('#admin-title-input');
    const titleBtn = container.querySelector('#admin-title-suggest');

    titleBtn.addEventListener('click', () => {
      const symbol = form.querySelector('[name="symbol"]').value.toUpperCase();
      const setup = form.querySelector('[name="setupType"]');
      const setupLabel = setup.selectedOptions[0]?.textContent || '';
      if (symbol) {
        const parts = [symbol];
        if (setupLabel && setupLabel !== 'None') parts.push(setupLabel);
        else parts.push('Trade Study');
        titleInput.value = parts.join(' ');
      }
    });

    // -- Wiring --
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (_onSave) _onSave(collectExampleData(form, example));
    });

    form.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      if (_onCancel) _onCancel();
    });

    // Focus the symbol field on new
    if (!isEdit) {
      setTimeout(() => form.querySelector('[name="symbol"]')?.focus(), 50);
    }

    return {
      onSave(cb) { _onSave = cb; },
      onCancel(cb) { _onCancel = cb; }
    };
  }

  // ---- Group Form ----
  function renderGroupForm(container, group) {
    const isEdit = !!group;
    const g = group || {};

    container.innerHTML = `
      <div class="admin-form-card">
        <div class="admin-form-header">
          <h3>${isEdit ? 'Edit' : 'New'} Group</h3>
        </div>
        <form id="admin-group-form">
          <div class="admin-form-section">
            <div class="form-row">
              <div class="form-group">
                <label>Name <span class="required">*</span></label>
                <input class="input" name="name" required value="${esc(g.name)}" placeholder="e.g. Energy Breakouts">
              </div>
              <div class="form-group">
                <label>ID${isEdit ? ' (read-only)' : ' (auto from name)'}</label>
                <input class="input" name="id" value="${esc(g.id)}" placeholder="auto-generated" ${isEdit ? 'readonly style="opacity:0.5;cursor:not-allowed"' : ''}>
              </div>
            </div>
            <div class="form-row form-row-3">
              <div class="form-group">
                <label>ETF Symbol <span class="required">*</span></label>
                <input class="input" name="etfSymbol" required value="${esc(g.etfSymbol)}" placeholder="XLE" style="text-transform:uppercase;font-family:var(--font-mono)">
              </div>
              <div class="form-group">
                <label>Color</label>
                <input class="input" name="color" type="color" value="${g.color || '#3498db'}" style="height:38px;padding:4px;cursor:pointer">
              </div>
              <div class="form-group">
                <label>Sort Order</label>
                <input class="input" name="sortOrder" type="number" value="${g.sortOrder || 0}" min="0">
              </div>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea class="textarea" name="description" rows="3" placeholder="What kinds of patterns are in this group?">${esc(g.description)}</textarea>
            </div>
          </div>
          <div class="admin-form-actions">
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Group'}</button>
            <button type="button" class="btn btn-ghost" data-action="cancel">Cancel</button>
          </div>
        </form>
      </div>`;

    const form = container.querySelector('#admin-group-form');
    let _onSave = null;
    let _onCancel = null;

    if (!isEdit) {
      const nameInput = form.querySelector('[name="name"]');
      const idInput = form.querySelector('[name="id"]');
      nameInput.addEventListener('input', () => {
        idInput.value = slugify(nameInput.value);
      });
      setTimeout(() => nameInput.focus(), 50);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (_onSave) _onSave(collectGroupData(form, group));
    });

    form.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      if (_onCancel) _onCancel();
    });

    return {
      onSave(cb) { _onSave = cb; },
      onCancel(cb) { _onCancel = cb; }
    };
  }

  // ---- Data Collection ----
  function collectExampleData(formEl, existing) {
    const fd = new FormData(formEl);
    const numOrNull = (v) => { const s = (v || '').trim(); if (!s) return null; const n = Number(s); return isNaN(n) ? null : n; };
    const strOrNull = (v) => { const s = (v || '').trim(); return s || null; };

    const symbol = fd.get('symbol').trim().toUpperCase();
    const startDate = fd.get('startDate');
    const year = startDate ? new Date(startDate + 'T00:00:00').getFullYear() : new Date().getFullYear();

    return {
      id: existing?.id || (symbol.toLowerCase() + '-' + startDate),
      symbol,
      title: fd.get('title').trim(),
      groupId: fd.get('groupId'),
      startDate,
      endDate: fd.get('endDate'),
      year,
      tags: fd.get('tags').split(',').map(t => t.trim()).filter(Boolean),
      notes: fd.get('notes').trim(),
      images: existing?.images || [],
      tradingViewSymbol: existing?.tradingViewSymbol || '',
      tradingViewInterval: existing?.tradingViewInterval || 'D',
      createdAt: existing?.createdAt || new Date().toISOString(),
      entryPrice: numOrNull(fd.get('entryPrice')),
      exitPrice: numOrNull(fd.get('exitPrice')),
      stopLoss: numOrNull(fd.get('stopLoss')),
      direction: fd.get('direction') || 'long',
      setupType: strOrNull(fd.get('setupType')),
      epsGrowth: numOrNull(fd.get('epsGrowth')),
      salesGrowth: numOrNull(fd.get('salesGrowth')),
      rsRating: numOrNull(fd.get('rsRating')),
      compositeRating: numOrNull(fd.get('compositeRating')),
      adRating: strOrNull(fd.get('adRating')),
      marketCondition: strOrNull(fd.get('marketCondition')),
      baseNumber: numOrNull(fd.get('baseNumber'))
    };
  }

  function collectGroupData(formEl, existing) {
    const fd = new FormData(formEl);
    const name = fd.get('name').trim();
    return {
      id: existing?.id || fd.get('id').trim() || slugify(name),
      name,
      description: fd.get('description').trim(),
      etfSymbol: fd.get('etfSymbol').trim().toUpperCase(),
      color: fd.get('color'),
      sortOrder: Number(fd.get('sortOrder')) || 0
    };
  }

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  return { renderExampleForm, renderGroupForm, collectExampleData, collectGroupData };
})();

/**
 * ExampleDetail — Detail view with trade stats, fundamentals, tabbed Lightweight Charts, images, notes.
 */
const ExampleDetail = (() => {
  let exampleChart = null;

  function render(params) {
    const { exampleId } = params;
    const example = Store.getExample(exampleId);
    const contentArea = document.querySelector('.content-area');
    contentArea.innerHTML = '';

    if (!example) {
      contentArea.innerHTML = `
        <div class="empty-state">
          <div class="icon">?</div>
          <h3>Example not found</h3>
          <p>The example "${exampleId}" doesn't exist.</p>
        </div>`;
      return;
    }

    const group = Store.getGroup(example.groupId);
    const { prev, next } = Store.getAdjacentExamples(example.id);

    // Breadcrumbs
    updateBreadcrumbs([
      { label: 'Home', href: '#/' },
      { label: group?.name || 'Unknown', href: group ? `#/group/${group.id}` : null },
      { label: `${example.symbol} — ${example.title}` }
    ]);

    const detail = document.createElement('div');
    detail.className = 'example-detail';

    // Title
    const titleEl = document.createElement('h1');
    titleEl.className = 'example-title';
    titleEl.textContent = example.title;
    detail.appendChild(titleEl);

    // Meta bar
    const meta = document.createElement('div');
    meta.className = 'example-meta';
    meta.innerHTML = `
      <span class="badge badge-group" style="background:${group?.color || '#888'};font-size:var(--text-sm);padding:4px 10px">
        ${group?.name || 'Unknown'}
      </span>
      <span style="font-family:var(--font-mono);font-weight:var(--weight-bold);font-size:var(--text-md)">
        ${example.symbol}
      </span>
      <span style="color:var(--text-secondary);font-size:var(--text-sm)">
        ${formatDate(example.startDate)} — ${formatDate(example.endDate)}
      </span>
      <div class="tags">
        ${example.tags.map(t => `<span class="badge badge-tag">${t}</span>`).join('')}
      </div>
    `;
    detail.appendChild(meta);

    // Trade Stats Panel — always show available data
    {
      const panel = document.createElement('div');
      panel.className = 'trade-stats-panel';
      const dirLabel = (example.direction || 'long').charAt(0).toUpperCase() + (example.direction || 'long').slice(1);
      const holdDays = StatsEngine.hasTradeData(example) ? StatsEngine.computeTradeStats(example)?.holdDays : null;
      const holdDaysFallback = (example.startDate && example.endDate)
        ? (() => { const s = new Date(example.startDate + 'T00:00:00'); const e = new Date(example.endDate + 'T00:00:00'); let c = 0; const cur = new Date(s); while (cur <= e) { const d = cur.getDay(); if (d !== 0 && d !== 6) c++; cur.setDate(cur.getDate() + 1); } return c; })()
        : null;

      let statsHtml = '';
      const stats = StatsEngine.hasTradeData(example) ? StatsEngine.computeTradeStats(example) : null;

      if (stats) {
        const pctClass = stats.pctGainLoss >= 0 ? 'stat-positive' : 'stat-negative';
        const rClass = stats.rMultiple != null ? (stats.rMultiple >= 0 ? 'stat-positive' : 'stat-negative') : '';
        statsHtml = `
          <div class="stat-cell">
            <span class="stat-label">Direction</span>
            <span class="stat-value">${dirLabel}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Entry</span>
            <span class="stat-value">$${example.entryPrice.toFixed(2)}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Exit</span>
            <span class="stat-value">$${example.exitPrice.toFixed(2)}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Stop</span>
            <span class="stat-value">$${example.stopLoss.toFixed(2)}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Return</span>
            <span class="stat-value ${pctClass}">${stats.pctGainLoss >= 0 ? '+' : ''}${stats.pctGainLoss.toFixed(2)}%</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">R-Multiple</span>
            <span class="stat-value ${rClass}">${stats.rMultiple != null ? stats.rMultiple.toFixed(2) + 'R' : '—'}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Risk</span>
            <span class="stat-value">${stats.riskPct.toFixed(2)}%</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Hold Time</span>
            <span class="stat-value">${stats.holdDays != null ? stats.holdDays + ' days' : '—'}</span>
          </div>`;
      } else {
        // Show what we have even without full trade data
        statsHtml = `
          <div class="stat-cell">
            <span class="stat-label">Direction</span>
            <span class="stat-value">${dirLabel}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Entry</span>
            <span class="stat-value">${example.entryPrice != null ? '$' + example.entryPrice.toFixed(2) : '—'}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Exit</span>
            <span class="stat-value">${example.exitPrice != null ? '$' + example.exitPrice.toFixed(2) : '—'}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Stop</span>
            <span class="stat-value">${example.stopLoss != null ? '$' + example.stopLoss.toFixed(2) : '—'}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Hold Time</span>
            <span class="stat-value">${holdDaysFallback != null ? holdDaysFallback + ' days' : '—'}</span>
          </div>`;
      }

      panel.innerHTML = `
        <h3>Trade Data</h3>
        <div class="trade-stats-grid">${statsHtml}</div>
      `;
      detail.appendChild(panel);
    }

    // Fundamentals Panel
    if (StatsEngine.hasFundamentals(example)) {
      const fundsPanel = document.createElement('div');
      fundsPanel.className = 'trade-stats-panel';
      const marketClass = example.marketCondition === 'uptrend' ? 'market-uptrend'
        : example.marketCondition === 'uptrend-pressure' ? 'market-uptrend-pressure'
        : example.marketCondition === 'correction' ? 'market-correction' : '';
      const marketLabel = example.marketCondition === 'uptrend' ? 'Uptrend'
        : example.marketCondition === 'uptrend-pressure' ? 'Under Pressure'
        : example.marketCondition === 'correction' ? 'Correction' : '—';
      const baseLabel = example.baseNumber != null ? ordinal(example.baseNumber) : '—';

      fundsPanel.innerHTML = `
        <h3>Fundamentals & Context</h3>
        <div class="trade-stats-grid">
          <div class="stat-cell">
            <span class="stat-label">Setup Type</span>
            <span class="stat-value">${example.setupType ? `<span class="badge-setup">${StatsEngine.getSetupLabel(example.setupType)}</span>` : '—'}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">EPS Growth</span>
            <span class="stat-value ${example.epsGrowth != null ? (example.epsGrowth >= 0 ? 'stat-positive' : 'stat-negative') : ''}">${example.epsGrowth != null ? (example.epsGrowth >= 0 ? '+' : '') + example.epsGrowth + '%' : '—'}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Sales Growth</span>
            <span class="stat-value ${example.salesGrowth != null ? (example.salesGrowth >= 0 ? 'stat-positive' : 'stat-negative') : ''}">${example.salesGrowth != null ? (example.salesGrowth >= 0 ? '+' : '') + example.salesGrowth + '%' : '—'}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">RS Rating</span>
            <span class="stat-value">${example.rsRating != null ? example.rsRating : '—'}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Composite</span>
            <span class="stat-value">${example.compositeRating != null ? example.compositeRating : '—'}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">A/D Rating</span>
            <span class="stat-value">${example.adRating || '—'}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Market</span>
            <span class="stat-value ${marketClass}">${marketLabel}</span>
          </div>
          <div class="stat-cell">
            <span class="stat-label">Base #</span>
            <span class="stat-value">${baseLabel}</span>
          </div>
        </div>
      `;
      detail.appendChild(fundsPanel);
    }

    // Chart section — tabbed daily / 5-min
    const chartSection = document.createElement('div');
    chartSection.className = 'example-chart-section';
    chartSection.innerHTML = `
      <div class="chart-container chart-single">
        <div class="chart-container-header">
          <div class="chart-tabs">
            <button class="chart-tab active" data-interval="daily">Daily</button>
            <button class="chart-tab" data-interval="5min">5min</button>
          </div>
        </div>
        <div class="chart-wrapper" id="example-chart-wrapper"></div>
      </div>
    `;
    detail.appendChild(chartSection);

    // Notes
    if (example.notes) {
      const notesSection = document.createElement('div');
      notesSection.className = 'example-notes';
      notesSection.innerHTML = `
        <h3>Notes</h3>
        <p>${escapeHtml(example.notes)}</p>
      `;
      detail.appendChild(notesSection);
    }

    // Images
    if (example.images && example.images.length > 0) {
      const imagesSection = document.createElement('div');
      imagesSection.className = 'example-images';
      imagesSection.innerHTML = `<h3>Annotated Charts</h3>`;

      const imageGrid = document.createElement('div');
      imageGrid.className = 'image-grid';

      example.images.forEach(img => {
        const imgEl = document.createElement('img');
        imgEl.src = `images/examples/${example.id}/${img}`;
        imgEl.alt = img;
        imgEl.loading = 'lazy';
        imgEl.addEventListener('click', () => openLightbox(imgEl.src));
        imageGrid.appendChild(imgEl);
      });

      imagesSection.appendChild(imageGrid);
      detail.appendChild(imagesSection);
    }

    // Navigation (prev/next)
    const nav = document.createElement('div');
    nav.className = 'example-nav';
    nav.innerHTML = `
      ${prev ? `<a href="#/example/${prev.id}" class="btn btn-ghost">&larr; ${prev.symbol}</a>` : '<span></span>'}
      ${next ? `<a href="#/example/${next.id}" class="btn btn-ghost">${next.symbol} &rarr;</a>` : '<span></span>'}
    `;
    detail.appendChild(nav);

    contentArea.appendChild(detail);
    Sidebar.highlightActive();

    // Tab switching
    chartSection.querySelectorAll('.chart-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        chartSection.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        loadExampleChart(example, tab.dataset.interval);
      });
    });

    // Load initial daily chart
    loadExampleChart(example, 'daily');

    return () => {
      if (exampleChart) {
        exampleChart.destroy();
        exampleChart = null;
      }
    };
  }

  async function loadExampleChart(example, interval) {
    const wrapper = document.getElementById('example-chart-wrapper');
    if (!wrapper) return;

    // Destroy previous
    if (exampleChart) {
      exampleChart.destroy();
      exampleChart = null;
    }

    const is5min = interval === '5min';
    const chartOpts = is5min
      ? { timeScale: { timeVisible: true, secondsVisible: false } }
      : {};

    exampleChart = new ChartManager(wrapper, chartOpts);

    const data = is5min
      ? await Store.loadOHLC5min(example.symbol)
      : await Store.loadOHLC(example.symbol);

    if (!data || data.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-state" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div class="icon" style="font-size:32px">—</div>
          <h3>No chart data</h3>
          <p>Run the fetch script to download ${is5min ? '5-min' : 'daily'} data for ${example.symbol}</p>
        </div>`;
      exampleChart = null;
      return;
    }

    exampleChart.setData(data);
    exampleChart.addSMAs(data);

    // Price lines for entry/exit/stop
    if (StatsEngine.hasTradeData(example)) {
      const stats = StatsEngine.computeTradeStats(example);
      const isWin = stats && stats.pctGainLoss >= 0;
      const lines = [];

      if (example.entryPrice != null) {
        lines.push({ price: example.entryPrice, color: '#58a6ff', title: 'Entry', lineStyle: 2 });
      }
      if (example.exitPrice != null) {
        lines.push({ price: example.exitPrice, color: isWin ? '#2ea043' : '#f85149', title: 'Exit', lineStyle: 2 });
      }
      if (example.stopLoss != null) {
        lines.push({ price: example.stopLoss, color: '#f85149', title: 'Stop', lineStyle: 3 });
      }
      exampleChart.addPriceLines(lines);
    }

    // Add start/end date markers on the chart
    const markers = [];
    if (example.startDate) {
      const group = Store.getGroup(example.groupId);
      markers.push({
        time: is5min ? Math.floor(new Date(example.startDate).getTime() / 1000) : example.startDate,
        position: 'belowBar',
        color: group?.color || '#58a6ff',
        shape: 'arrowUp',
        text: 'Start'
      });
    }
    if (example.endDate) {
      markers.push({
        time: is5min ? Math.floor(new Date(example.endDate).getTime() / 1000) : example.endDate,
        position: 'aboveBar',
        color: '#e6edf3',
        shape: 'arrowDown',
        text: 'End'
      });
    }
    if (markers.length > 0) {
      exampleChart.setMarkers(markers);
    }

    // Set visible range around the trade period
    try {
      const padDays = is5min ? 3 : 30;
      if (is5min) {
        const startMs = new Date(example.startDate).getTime();
        const endMs = new Date(example.endDate).getTime();
        const padMs = padDays * 24 * 60 * 60;
        const fromTime = Math.floor(startMs / 1000) - padMs;
        const toTime = Math.floor(endMs / 1000) + padMs;
        exampleChart.setVisibleRange(fromTime, toTime);
      } else {
        const start = new Date(example.startDate);
        const end = new Date(example.endDate);
        start.setDate(start.getDate() - padDays);
        end.setDate(end.getDate() + padDays);
        const from = start.toISOString().split('T')[0];
        const to = end.toISOString().split('T')[0];
        exampleChart.setVisibleRange(from, to);
      }
    } catch (e) {
      exampleChart.fitContent();
    }
  }

  function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function openLightbox(src) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <button class="lightbox-close">&times;</button>
      <img src="${src}" alt="Chart annotation">
    `;
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
        lightbox.remove();
      }
    });
    document.body.appendChild(lightbox);

    const onEsc = (e) => {
      if (e.key === 'Escape') {
        lightbox.remove();
        document.removeEventListener('keydown', onEsc);
      }
    };
    document.addEventListener('keydown', onEsc);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return { render };
})();

/**
 * IndexCharts — Main page view with index chart, global stats bar, and card grid.
 */
const IndexCharts = (() => {
  let chart = null;
  let contentArea = null;
  let activeSymbol = 'SPY';
  let currentMarkers = null;

  const indices = [
    { symbol: 'SPY', name: 'S&P 500' },
    { symbol: 'QQQ', name: 'NASDAQ 100' },
    { symbol: 'IWM', name: 'Russell 2000' }
  ];

  async function render(params) {
    contentArea = document.querySelector('.content-area');
    contentArea.innerHTML = '';

    // Breadcrumbs
    updateBreadcrumbs([{ label: 'Home' }]);

    // Chart container with switcher tabs in the header
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container chart-single';
    chartContainer.innerHTML = `
      <div class="chart-container-header">
        <div class="chart-tabs" id="chart-tabs">
          ${indices.map(idx => `
            <button class="chart-tab ${idx.symbol === activeSymbol ? 'active' : ''}" data-symbol="${idx.symbol}">
              ${idx.symbol}<span class="chart-tab-name">${idx.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="chart-wrapper" id="chart-main"></div>
    `;
    contentArea.appendChild(chartContainer);

    // Tab click handlers
    chartContainer.querySelectorAll('.chart-tab').forEach(tab => {
      tab.addEventListener('click', () => switchChart(tab.dataset.symbol));
    });

    // Marker legend
    const legend = document.createElement('div');
    legend.className = 'marker-legend';
    Store.getGroups().forEach(g => {
      legend.innerHTML += `
        <div class="legend-item">
          <span class="legend-dot" style="background:${g.color}"></span>
          <span>${g.name}</span>
        </div>`;
    });
    contentArea.appendChild(legend);

    // Global stats bar
    renderGlobalStatsBar(contentArea, Store.getExamples());

    // Filter bar
    const filterContainer = document.createElement('div');
    contentArea.appendChild(filterContainer);
    Filters.render(filterContainer, onFilterChange);

    // Section header + card grid container
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'section-header';
    sectionHeader.innerHTML = `
      <h2>All Examples</h2>
      <span class="count" id="example-count">${Store.getExamples().length}</span>
    `;
    contentArea.appendChild(sectionHeader);

    const cardContainer = document.createElement('div');
    cardContainer.id = 'card-container';
    contentArea.appendChild(cardContainer);
    CardGrid.render(cardContainer, Store.getExamples());

    // Load initial chart
    currentMarkers = Store.getMarkers();
    await loadChart(activeSymbol);

    return cleanup;
  }

  function renderGlobalStatsBar(parent, examples) {
    // Remove existing bar
    const existing = parent.querySelector('.global-stats-bar');
    if (existing) existing.remove();

    const groupStats = StatsEngine.computeGroupStats(examples);
    if (!groupStats) return;

    const bar = document.createElement('div');
    bar.className = 'global-stats-bar';
    bar.innerHTML = `
      <div class="global-stat">
        <span class="stat-label">Total Trades</span>
        <span class="stat-value">${groupStats.totalTrades}</span>
      </div>
      <div class="global-stat-divider"></div>
      <div class="global-stat">
        <span class="stat-label">Win Rate</span>
        <span class="stat-value">${groupStats.winRate}%</span>
      </div>
      <div class="global-stat-divider"></div>
      <div class="global-stat">
        <span class="stat-label">Avg Winner</span>
        <span class="stat-value stat-positive">+${groupStats.avgGainPct.toFixed(1)}%</span>
      </div>
      <div class="global-stat-divider"></div>
      <div class="global-stat">
        <span class="stat-label">Avg Loser</span>
        <span class="stat-value stat-negative">-${groupStats.avgLossPct.toFixed(1)}%</span>
      </div>
      <div class="global-stat-divider"></div>
      <div class="global-stat">
        <span class="stat-label">Expectancy</span>
        <span class="stat-value">${groupStats.expectancy.toFixed(2)}R</span>
      </div>
    `;

    // Insert after the legend
    const legendEl = parent.querySelector('.marker-legend');
    if (legendEl && legendEl.nextSibling) {
      parent.insertBefore(bar, legendEl.nextSibling);
    } else {
      parent.appendChild(bar);
    }
  }

  async function loadChart(symbol) {
    const wrapper = document.getElementById('chart-main');
    if (!wrapper) return;

    // Destroy previous chart
    if (chart) {
      chart.destroy();
      chart = null;
    }

    chart = new ChartManager(wrapper);
    const data = await Store.loadOHLC(symbol);
    chart.setData(data);
    chart.addSMAs(data);
    chart.setMarkers(currentMarkers || Store.getMarkers());

    // Default to last ~2 years instead of fitting all history
    if (data.length > 0) {
      try {
        const last = data[data.length - 1].time;
        const from = new Date(last + 'T00:00:00');
        from.setFullYear(from.getFullYear() - 2);
        chart.setVisibleRange(from.toISOString().split('T')[0], last);
      } catch { chart.fitContent(); }
    }

    chart.onClick((param) => {
      if (param.time) {
        const timeStr = typeof param.time === 'string' ? param.time :
          `${param.time.year}-${String(param.time.month).padStart(2,'0')}-${String(param.time.day).padStart(2,'0')}`;
        const markers = currentMarkers || Store.getMarkers();
        const marker = markers.find(m => m.time === timeStr);
        if (marker) {
          Router.navigate(`#/example/${marker.id}`);
        }
      }
    });
  }

  async function switchChart(symbol) {
    if (symbol === activeSymbol) return;
    activeSymbol = symbol;

    // Update active tab
    document.querySelectorAll('.chart-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.symbol === symbol);
    });

    await loadChart(symbol);
  }

  function onFilterChange(filters) {
    const examples = Store.getExamples(filters);
    const cardContainer = document.getElementById('card-container');
    const countEl = document.getElementById('example-count');
    if (cardContainer) CardGrid.render(cardContainer, examples);
    if (countEl) countEl.textContent = examples.length;

    currentMarkers = Store.getMarkers(filters);
    if (chart) chart.setMarkers(currentMarkers);

    // Update global stats bar
    if (contentArea) renderGlobalStatsBar(contentArea, examples);
  }

  function cleanup() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  return { render };
})();

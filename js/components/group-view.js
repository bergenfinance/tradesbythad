/**
 * GroupView — Group page with ETF chart, stats dashboard, and example cards.
 */
const GroupView = (() => {
  let chart = null;

  async function render(params) {
    const { groupId } = params;
    const group = Store.getGroup(groupId);
    const contentArea = document.querySelector('.content-area');
    contentArea.innerHTML = '';

    if (!group) {
      contentArea.innerHTML = `
        <div class="empty-state">
          <div class="icon">?</div>
          <h3>Group not found</h3>
          <p>The group "${groupId}" doesn't exist.</p>
        </div>`;
      return;
    }

    // Breadcrumbs
    updateBreadcrumbs([
      { label: 'Home', href: '#/' },
      { label: group.name }
    ]);

    // Group header
    const header = document.createElement('div');
    header.style.marginBottom = 'var(--space-6)';
    header.innerHTML = `
      <h2 style="font-size:var(--text-xl);font-weight:var(--weight-bold);margin-bottom:var(--space-2);display:flex;align-items:center;gap:var(--space-3)">
        <span style="width:12px;height:12px;border-radius:50%;background:${group.color};display:inline-block"></span>
        ${group.name}
      </h2>
      <p style="color:var(--text-secondary);font-size:var(--text-sm)">${group.description}</p>
    `;
    contentArea.appendChild(header);

    // ETF Chart
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container chart-single';
    chartContainer.innerHTML = `
      <div class="chart-container-header">
        <h3>${group.etfSymbol} — ${group.name} ETF</h3>
      </div>
      <div class="chart-wrapper" id="chart-group-etf"></div>
    `;
    contentArea.appendChild(chartContainer);

    // Load chart
    const wrapper = document.getElementById('chart-group-etf');
    chart = new ChartManager(wrapper);

    const data = await Store.loadOHLC(group.etfSymbol);
    chart.setData(data);
    chart.addSMAs(data);

    const markers = Store.getMarkers({ groupId });
    chart.setMarkers(markers);

    chart.onClick((param) => {
      if (param.time) {
        const timeStr = typeof param.time === 'string' ? param.time :
          `${param.time.year}-${String(param.time.month).padStart(2,'0')}-${String(param.time.day).padStart(2,'0')}`;
        const marker = markers.find(m => m.time === timeStr);
        if (marker) {
          Router.navigate(`#/example/${marker.id}`);
        }
      }
    });

    // Stats Dashboard
    const examples = Store.getExamples({ groupId });
    const groupStats = StatsEngine.computeGroupStats(examples);

    if (groupStats) {
      renderStatsDashboard(contentArea, groupStats);
    }

    // Example cards
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'section-header';
    sectionHeader.innerHTML = `
      <h2>Examples</h2>
      <span class="count">${examples.length}</span>
    `;
    contentArea.appendChild(sectionHeader);

    const cardContainer = document.createElement('div');
    contentArea.appendChild(cardContainer);
    CardGrid.render(cardContainer, examples);

    Sidebar.highlightActive();

    return cleanup;
  }

  function renderStatsDashboard(parent, stats) {
    const dashboard = document.createElement('div');
    dashboard.className = 'stats-dashboard';
    dashboard.innerHTML = `<h3>Performance Dashboard</h3>`;

    // Row 1: Total Trades, Wins, Losses, Win Rate
    dashboard.innerHTML += `
      <div class="stats-row">
        ${statCard('Total Trades', stats.totalTrades)}
        ${statCard('Wins', stats.wins, 'stat-positive')}
        ${statCard('Losses', stats.losses, 'stat-negative')}
        ${statCard('Win Rate', stats.winRate + '%')}
      </div>
    `;

    // Row 2: Avg Winner %, Avg Loser %, Profit Factor, Expectancy
    dashboard.innerHTML += `
      <div class="stats-row">
        ${statCard('Avg Winner', '+' + stats.avgGainPct.toFixed(1) + '%', 'stat-positive')}
        ${statCard('Avg Loser', '-' + stats.avgLossPct.toFixed(1) + '%', 'stat-negative')}
        ${statCard('Profit Factor', stats.profitFactor === Infinity ? '\u221E' : stats.profitFactor.toFixed(2))}
        ${statCard('Expectancy', stats.expectancy.toFixed(2) + 'R')}
      </div>
    `;

    // Row 3: Avg Hold, Shortest, Longest
    dashboard.innerHTML += `
      <div class="stats-row">
        ${statCard('Avg Hold Time', stats.avgHoldDays != null ? stats.avgHoldDays + ' days' : '—')}
        ${statCard('Shortest Trade', stats.shortestTrade != null ? stats.shortestTrade + ' days' : '—')}
        ${statCard('Longest Trade', stats.longestTrade != null ? stats.longestTrade + ' days' : '—')}
        <div></div>
      </div>
    `;

    // Row 4: Best, Worst, Streaks
    dashboard.innerHTML += `
      <div class="stats-row">
        ${statCard('Best Trade', '+' + stats.bestTrade.toFixed(1) + '%', 'stat-positive')}
        ${statCard('Worst Trade', stats.worstTrade.toFixed(1) + '%', 'stat-negative')}
        ${statCard('Max Win Streak', stats.maxWinStreak)}
        ${statCard('Max Loss Streak', stats.maxLossStreak)}
      </div>
    `;

    parent.appendChild(dashboard);

    // Histogram
    if (stats.returns.length > 1) {
      renderHistogram(parent, stats.returns);
    }

    // Returns by period
    if (stats.tradeDetails.length >= 5) {
      renderReturnsByPeriod(parent, stats.tradeDetails);
    }

    // Sortable table
    if (stats.tradeDetails.length > 0) {
      renderStatsTable(parent, stats.tradeDetails);
    }
  }

  function statCard(label, value, cls) {
    return `
      <div class="stat-card">
        <span class="stat-label">${label}</span>
        <span class="stat-value ${cls || ''}">${value}</span>
      </div>
    `;
  }

  function renderHistogram(parent, returns) {
    const container = document.createElement('div');
    container.className = 'histogram-container';
    container.innerHTML = `<h4>Return Distribution</h4>`;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 180;
    container.appendChild(canvas);
    parent.appendChild(container);

    // Draw after append so dimensions are settled
    requestAnimationFrame(() => drawHistogram(canvas, returns));
  }

  function drawHistogram(canvas, returns) {
    const sorted = [...returns].sort((a, b) => a - b);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 10, bottom: 20, left: 10, right: 10 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    const maxAbs = Math.max(Math.abs(Math.min(...sorted)), Math.abs(Math.max(...sorted)), 1);
    const barWidth = Math.max(2, (plotW / sorted.length) - 2);
    const gap = (plotW - barWidth * sorted.length) / (sorted.length + 1);

    // Zero line
    const zeroY = padding.top + plotH / 2;
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(w - padding.right, zeroY);
    ctx.stroke();

    // Bars
    sorted.forEach((ret, i) => {
      const x = padding.left + gap + i * (barWidth + gap);
      const barH = (Math.abs(ret) / maxAbs) * (plotH / 2);
      const y = ret >= 0 ? zeroY - barH : zeroY;

      ctx.fillStyle = ret >= 0 ? '#2ea043' : '#f85149';
      ctx.fillRect(x, y, barWidth, barH);
    });

    // Zero label
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('0%', padding.left, zeroY - 4);
  }

  function renderReturnsByPeriod(parent, tradeDetails) {
    const periods = StatsEngine.getReturnsByPeriod(tradeDetails, 'month');
    if (periods.length < 2) return;

    const section = document.createElement('div');
    section.className = 'returns-period-table';
    section.innerHTML = `<h4>Returns by Period</h4>`;

    let html = `
      <div class="stats-table-wrapper">
        <table class="stats-table">
          <thead><tr>
            <th>Period</th><th>Trades</th><th>Win Rate</th><th>Avg Return</th>
          </tr></thead>
          <tbody>
    `;

    periods.forEach(p => {
      const retClass = p.avgReturn >= 0 ? 'stat-positive' : 'stat-negative';
      html += `
        <tr>
          <td>${p.period}</td>
          <td>${p.trades}</td>
          <td>${p.winRate}%</td>
          <td class="${retClass}">${p.avgReturn >= 0 ? '+' : ''}${p.avgReturn.toFixed(2)}%</td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    section.innerHTML += html;
    parent.appendChild(section);
  }

  function renderStatsTable(parent, tradeDetails) {
    const section = document.createElement('div');
    section.style.marginTop = 'var(--space-4)';

    const columns = [
      { key: 'symbol', label: 'Symbol' },
      { key: 'setupType', label: 'Setup' },
      { key: 'direction', label: 'Dir' },
      { key: 'entryPrice', label: 'Entry' },
      { key: 'exitPrice', label: 'Exit' },
      { key: 'pctGainLoss', label: 'Return %' },
      { key: 'rMultiple', label: 'R-Multiple' },
      { key: 'holdDays', label: 'Hold Days' }
    ];

    let sortKey = 'pctGainLoss';
    let sortDir = 'desc';

    function renderTable() {
      const sorted = [...tradeDetails].sort((a, b) => {
        let va = a[sortKey], vb = b[sortKey];
        if (va == null) va = -Infinity;
        if (vb == null) vb = -Infinity;
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });

      section.innerHTML = `
        <div class="stats-table-wrapper">
          <table class="stats-table" id="group-stats-table">
            <thead><tr>
              ${columns.map(c => {
                const cls = c.key === sortKey ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : '';
                return `<th data-key="${c.key}" class="${cls}">${c.label}</th>`;
              }).join('')}
            </tr></thead>
            <tbody>
              ${sorted.map(t => {
                const retClass = t.pctGainLoss >= 0 ? 'stat-positive' : 'stat-negative';
                const rClass = t.rMultiple != null ? (t.rMultiple >= 0 ? 'stat-positive' : 'stat-negative') : '';
                const setupLabel = t.setupType ? StatsEngine.getSetupLabel(t.setupType) : '—';
                const dir = (t.direction || 'long').charAt(0).toUpperCase();
                return `
                  <tr>
                    <td><a href="#/example/${t.id}">${t.symbol}</a></td>
                    <td style="font-family:var(--font-sans)">${setupLabel}</td>
                    <td>${dir}</td>
                    <td>$${t.entryPrice.toFixed(2)}</td>
                    <td>$${t.exitPrice.toFixed(2)}</td>
                    <td class="${retClass}">${t.pctGainLoss >= 0 ? '+' : ''}${t.pctGainLoss.toFixed(2)}%</td>
                    <td class="${rClass}">${t.rMultiple != null ? t.rMultiple.toFixed(2) + 'R' : '—'}</td>
                    <td>${t.holdDays != null ? t.holdDays : '—'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Sort click handlers
      section.querySelectorAll('th[data-key]').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.key;
          if (sortKey === key) {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            sortKey = key;
            sortDir = 'desc';
          }
          renderTable();
        });
      });
    }

    renderTable();
    parent.appendChild(section);
  }

  function cleanup() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  return { render };
})();

/**
 * CardGrid — Renders a responsive grid of example cards with trade badges.
 */
const CardGrid = (() => {

  function render(container, examples, options = {}) {
    container.innerHTML = '';

    if (examples.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <h3>No examples found</h3>
          <p>Try adjusting your filters or add new examples via the admin panel.</p>
        </div>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'card-grid';

    examples.forEach(ex => {
      const card = createCard(ex);
      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  function createCard(example) {
    const group = Store.getGroup(example.groupId);
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = example.id;

    // Build gain/loss badge
    let gainBadge = '';
    if (StatsEngine.hasTradeData(example)) {
      const stats = StatsEngine.computeTradeStats(example);
      if (stats) {
        const cls = stats.pctGainLoss >= 0 ? 'badge-gain' : 'badge-loss';
        const sign = stats.pctGainLoss >= 0 ? '+' : '';
        gainBadge = `<span class="${cls}">${sign}${stats.pctGainLoss.toFixed(1)}%</span>`;
      }
    }

    // Build setup badge
    let setupBadge = '';
    if (example.setupType) {
      setupBadge = `<span class="badge-setup">${StatsEngine.getSetupLabel(example.setupType)}</span>`;
    }

    card.innerHTML = `
      <div class="card-thumbnail">
        <div class="placeholder-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 3v18h18"/>
            <path d="M7 16l4-8 4 4 4-6"/>
          </svg>
          <span>${example.symbol}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-symbol">${example.symbol} ${gainBadge}</div>
        <div class="card-title">${example.title}</div>
        <div class="card-footer">
          ${group ? `<span class="badge badge-group" style="background:${group.color}">${group.name}</span>` : ''}
          <span class="card-date">${formatDate(example.startDate)}</span>
        </div>
        ${example.tags.length || setupBadge ? `
        <div class="tags" style="margin-top:8px">
          ${setupBadge}
          ${example.tags.slice(0, 3).map(t => `<span class="badge badge-tag">${t}</span>`).join('')}
        </div>` : ''}
      </div>
    `;

    // Check for actual thumbnail image
    if (example.images && example.images.length > 0) {
      const thumb = card.querySelector('.card-thumbnail');
      const img = new Image();
      img.src = `images/examples/${example.id}/${example.images[0]}`;
      img.alt = example.title;
      img.onload = () => {
        thumb.innerHTML = '';
        thumb.appendChild(img);
      };
    }

    card.addEventListener('click', () => {
      Router.navigate(`#/example/${example.id}`);
    });

    return card;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return { render };
})();

/**
 * App — Entry point. Initializes store, router, renders shell.
 */
(async function () {
  // Show loading state
  const app = document.getElementById('app');
  app.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;width:100%;gap:12px;color:var(--text-secondary)">
      <div class="spinner"></div>
      <span>Loading data...</span>
    </div>
  `;

  // Initialize data store
  try {
    await Store.init();
  } catch (e) {
    app.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;width:100%;flex-direction:column;gap:12px;color:var(--text-secondary)">
        <h2 style="color:var(--accent-red)">Failed to load data</h2>
        <p>Make sure you're running this from a local web server (e.g. <code>npx serve</code>).</p>
        <p style="font-size:var(--text-xs);color:var(--text-tertiary)">${e.message}</p>
      </div>
    `;
    return;
  }

  // Render app shell
  app.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1>Stock Studies</h1>
        <button class="sidebar-toggle" title="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.56 7.25h7.69a.75.75 0 010 1.5H4.56l3.22 3.22a.75.75 0 010 1.06z"/>
          </svg>
        </button>
      </div>
      <div class="sidebar-tree"></div>
    </aside>
    <main class="main-content">
      <div class="topbar">
        <div class="topbar-left">
          <button class="mobile-toggle" title="Open sidebar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7.75zM1.75 12a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H1.75z"/>
            </svg>
          </button>
          <nav class="breadcrumbs" id="breadcrumbs"></nav>
        </div>
        <div class="topbar-right">
          <a href="admin.html" class="btn btn-ghost btn-sm" target="_blank">Admin</a>
        </div>
      </div>
      <div class="content-area"></div>
    </main>
  `;

  // Initialize sidebar
  Sidebar.init();

  // Register routes
  Router.register('main', (params) => {
    return IndexCharts.render(params);
  });

  Router.register('group', (params) => {
    return GroupView.render(params);
  });

  Router.register('example', (params) => {
    return ExampleDetail.render(params);
  });

  // Start router
  Router.start();
})();

/**
 * Global helper to update breadcrumbs.
 * @param {Array<{label: string, href?: string}>} items
 */
function updateBreadcrumbs(items) {
  const nav = document.getElementById('breadcrumbs');
  if (!nav) return;
  nav.innerHTML = items.map((item, i) => {
    if (i < items.length - 1 && item.href) {
      return `<a href="${item.href}">${item.label}</a><span class="separator">/</span>`;
    }
    return `<span class="current">${item.label}</span>`;
  }).join('');
}

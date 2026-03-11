/**
 * Sidebar — Collapsible tree navigation with switchable views.
 */
const Sidebar = (() => {
  let sidebarEl = null;
  let treeEl = null;
  let expandedNodes = new Set();
  let isCollapsed = false;
  let currentView = 'group'; // 'group' | 'year' | 'setup'

  function init() {
    sidebarEl = document.querySelector('.sidebar');
    treeEl = document.querySelector('.sidebar-tree');

    // Toggle button in sidebar header
    const toggleBtn = sidebarEl.querySelector('.sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggle);
    }

    // Mobile toggle in topbar
    const mobileToggle = document.querySelector('.mobile-toggle');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', toggle);
    }

    // Insert view toggle below header
    const header = sidebarEl.querySelector('.sidebar-header');
    if (header) {
      const viewToggle = document.createElement('div');
      viewToggle.className = 'sidebar-view-toggle';
      viewToggle.innerHTML = `
        <button data-view="group" class="active">Group</button>
        <button data-view="year">Year</button>
        <button data-view="setup">Setup</button>
      `;
      header.after(viewToggle);

      viewToggle.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          currentView = btn.dataset.view;
          viewToggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          expandedNodes.clear();
          render();
        });
      });
    }

    render();
  }

  function toggle() {
    isCollapsed = !isCollapsed;
    sidebarEl.classList.toggle('collapsed', isCollapsed);
  }

  function getTree() {
    switch (currentView) {
      case 'group': return Store.buildTreeByGroup();
      case 'year': return Store.buildTree();
      case 'setup': return Store.buildTreeBySetup();
      default: return Store.buildTreeByGroup();
    }
  }

  function render() {
    const tree = getTree();
    treeEl.innerHTML = '';
    const ul = createTreeLevel(tree, 0);
    treeEl.appendChild(ul);
    highlightActive();
  }

  function createTreeLevel(nodes, depth) {
    const ul = document.createElement('ul');
    ul.className = depth === 0 ? 'tree' : 'tree-children';

    nodes.forEach(node => {
      const li = document.createElement('li');
      li.className = 'tree-item';

      const div = document.createElement('div');
      div.className = 'tree-node';
      div.dataset.type = node.type;
      div.dataset.id = node.id;

      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes.has(`${node.type}-${node.id}`);

      // Chevron
      const chevron = document.createElement('span');
      chevron.className = `chevron ${hasChildren ? (isExpanded ? 'expanded' : '') : 'hidden'}`;
      chevron.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 4l4 4-4 4z"/></svg>`;
      div.appendChild(chevron);

      // Icon
      const icon = document.createElement('span');
      icon.className = 'icon';
      if (node.type === 'year') {
        icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 1.75a.75.75 0 00-1.5 0V3H1.75A1.75 1.75 0 000 4.75v8.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H13V1.75a.75.75 0 00-1.5 0V3h-7V1.75zM1.5 6.5h13v6.75a.25.25 0 01-.25.25H1.75a.25.25 0 01-.25-.25V6.5z"/></svg>`;
      } else if (node.type === 'group') {
        icon.innerHTML = `<span style="color:${node.color || 'var(--text-tertiary)'}">&#9679;</span>`;
      } else if (node.type === 'setup') {
        icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" opacity="0.6"><path d="M3 3v10h10V3H3zm-1-1h12a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M4 10l3-4 2 2 3-4" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>`;
      } else {
        icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" opacity="0.5"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"/><path d="M8 3.5a.75.75 0 01.75.75v3.19l2.03 2.03a.75.75 0 01-1.06 1.06l-2.25-2.25A.75.75 0 017.25 7.5V4.25A.75.75 0 018 3.5z"/></svg>`;
      }
      div.appendChild(icon);

      // Label
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = node.name;
      div.appendChild(label);

      // Count badge
      if (node.count != null) {
        const badge = document.createElement('span');
        badge.className = 'count-badge';
        badge.textContent = node.count;
        div.appendChild(badge);
      }

      // Click handler
      div.addEventListener('click', (e) => {
        e.stopPropagation();
        handleNodeClick(node, li, chevron);
      });

      li.appendChild(div);

      // Render children
      if (hasChildren) {
        const childUl = createTreeLevel(node.children, depth + 1);
        if (!isExpanded) {
          childUl.classList.add('collapsed');
          childUl.style.maxHeight = '0';
        } else {
          childUl.style.maxHeight = childUl.scrollHeight + 'px';
        }
        li.appendChild(childUl);
      }

      ul.appendChild(li);
    });

    return ul;
  }

  function handleNodeClick(node, li, chevron) {
    const key = `${node.type}-${node.id}`;

    if (node.type === 'year' || node.type === 'setup') {
      // Toggle expand/collapse
      toggleNode(key, li, chevron);
    } else if (node.type === 'group') {
      // Navigate to group, also expand
      if (!expandedNodes.has(key)) {
        toggleNode(key, li, chevron);
      }
      Router.navigate(`#/group/${node.id}`);
    } else if (node.type === 'example') {
      Router.navigate(`#/example/${node.id}`);
    }
  }

  function toggleNode(key, li, chevron) {
    const childUl = li.querySelector(':scope > .tree-children');
    if (!childUl) return;

    if (expandedNodes.has(key)) {
      expandedNodes.delete(key);
      chevron.classList.remove('expanded');
      childUl.style.maxHeight = childUl.scrollHeight + 'px';
      // Force reflow
      childUl.offsetHeight;
      childUl.classList.add('collapsed');
      childUl.style.maxHeight = '0';
    } else {
      expandedNodes.add(key);
      chevron.classList.add('expanded');
      childUl.classList.remove('collapsed');
      childUl.style.maxHeight = childUl.scrollHeight + 'px';
      // After transition, allow natural height
      setTimeout(() => {
        if (expandedNodes.has(key)) {
          childUl.style.maxHeight = 'none';
        }
      }, 300);
    }
  }

  function highlightActive() {
    const { route, params } = Router.getCurrentRoute();
    treeEl.querySelectorAll('.tree-node').forEach(n => n.classList.remove('active'));

    let selector = null;
    if (route === 'group') {
      selector = `.tree-node[data-type="group"][data-id="${params.groupId}"]`;
    } else if (route === 'example') {
      selector = `.tree-node[data-type="example"][data-id="${params.exampleId}"]`;
    }

    if (selector) {
      const activeNode = treeEl.querySelector(selector);
      if (activeNode) {
        activeNode.classList.add('active');
        // Auto-expand parent nodes
        expandParents(activeNode);
      }
    }
  }

  function expandParents(el) {
    let parent = el.closest('.tree-children');
    while (parent) {
      const li = parent.closest('.tree-item');
      if (li) {
        const node = li.querySelector(':scope > .tree-node');
        if (node) {
          const key = `${node.dataset.type}-${node.dataset.id}`;
          if (!expandedNodes.has(key)) {
            expandedNodes.add(key);
            const chevron = node.querySelector('.chevron');
            if (chevron) chevron.classList.add('expanded');
            parent.classList.remove('collapsed');
            parent.style.maxHeight = 'none';
          }
        }
      }
      parent = parent.parentElement?.closest('.tree-children');
    }
  }

  return { init, render, toggle, highlightActive };
})();

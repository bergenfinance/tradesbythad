/**
 * Filters — Year, Group, Tag, and Search filter bar.
 */
const Filters = (() => {
  let currentFilters = {};
  let onChangeCallback = null;

  function render(container, onChange) {
    onChangeCallback = onChange;
    currentFilters = {};

    const bar = document.createElement('div');
    bar.className = 'filter-bar';

    // Year filter
    const years = Store.getYears();
    const yearSelect = createSelect('Year', years.map(y => ({ value: String(y), label: String(y) })));
    yearSelect.addEventListener('change', (e) => {
      currentFilters.year = e.target.value ? Number(e.target.value) : null;
      fireChange();
    });
    bar.appendChild(yearSelect);

    // Group filter
    const groups = Store.getGroups();
    const groupSelect = createSelect('Group', groups.map(g => ({ value: g.id, label: g.name })));
    groupSelect.addEventListener('change', (e) => {
      currentFilters.groupId = e.target.value || null;
      fireChange();
    });
    bar.appendChild(groupSelect);

    // Tag filter
    const tags = Store.getAllTags();
    const tagSelect = createSelect('Tag', tags.map(t => ({ value: t, label: t })));
    tagSelect.addEventListener('change', (e) => {
      currentFilters.tag = e.target.value || null;
      fireChange();
    });
    bar.appendChild(tagSelect);

    // Search input
    const searchInput = document.createElement('input');
    searchInput.className = 'input';
    searchInput.type = 'text';
    searchInput.placeholder = 'Search examples...';
    searchInput.style.minWidth = '200px';
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentFilters.search = e.target.value || null;
        fireChange();
      }, 250);
    });
    bar.appendChild(searchInput);

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-ghost btn-sm';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
      currentFilters = {};
      bar.querySelectorAll('.select').forEach(s => s.value = '');
      searchInput.value = '';
      fireChange();
    });
    bar.appendChild(clearBtn);

    container.appendChild(bar);
  }

  function createSelect(label, options) {
    const select = document.createElement('select');
    select.className = 'select';
    select.innerHTML = `<option value="">All ${label}s</option>` +
      options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    return select;
  }

  function fireChange() {
    // Remove null/undefined entries
    const clean = {};
    for (const [k, v] of Object.entries(currentFilters)) {
      if (v != null && v !== '') clean[k] = v;
    }
    if (onChangeCallback) onChangeCallback(clean);
  }

  function getFilters() {
    return { ...currentFilters };
  }

  return { render, getFilters };
})();

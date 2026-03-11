/**
 * Store — Data layer for loading JSON, querying, and building the sidebar tree.
 */
const Store = (() => {
  let groups = [];
  let examples = [];
  let ohlcCache = {};
  let ohlc5minCache = {};

  async function init() {
    const [groupsRes, examplesRes] = await Promise.all([
      fetch('data/groups.json').then(r => r.json()),
      fetch('data/examples.json').then(r => r.json())
    ]);
    groups = groupsRes.sort((a, b) => a.sortOrder - b.sortOrder);
    examples = examplesRes.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  async function loadOHLC(symbol) {
    if (ohlcCache[symbol]) return ohlcCache[symbol];
    try {
      const data = await fetch(`data/ohlc/${symbol}.json`).then(r => r.json());
      ohlcCache[symbol] = data;
      return data;
    } catch (e) {
      console.warn(`Failed to load OHLC data for ${symbol}:`, e);
      return [];
    }
  }

  async function loadOHLC5min(symbol) {
    if (ohlc5minCache[symbol]) return ohlc5minCache[symbol];
    try {
      const data = await fetch(`data/ohlc/${symbol}-5min.json`).then(r => r.json());
      ohlc5minCache[symbol] = data;
      return data;
    } catch (e) {
      console.warn(`Failed to load 5-min OHLC data for ${symbol}:`, e);
      return [];
    }
  }

  function getGroups() {
    return groups;
  }

  function getGroup(id) {
    return groups.find(g => g.id === id);
  }

  function getExamples(filters = {}) {
    let result = [...examples];
    if (filters.groupId) {
      result = result.filter(e => e.groupId === filters.groupId);
    }
    if (filters.year) {
      result = result.filter(e => e.year === filters.year);
    }
    if (filters.tag) {
      result = result.filter(e => e.tags.includes(filters.tag));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(e =>
        e.symbol.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
      );
    }
    return result;
  }

  function getExample(id) {
    return examples.find(e => e.id === id);
  }

  function getYears() {
    const years = [...new Set(examples.map(e => e.year))];
    return years.sort((a, b) => b - a);
  }

  function getAllTags() {
    const tagSet = new Set();
    examples.forEach(e => e.tags.forEach(t => tagSet.add(t)));
    return [...tagSet].sort();
  }

  /**
   * Build the sidebar tree structure: Year > Group > Examples
   */
  function buildTree() {
    const years = getYears();
    return years.map(year => {
      const yearExamples = examples.filter(e => e.year === year);
      const groupIds = [...new Set(yearExamples.map(e => e.groupId))];
      const groupNodes = groupIds
        .map(gid => {
          const group = getGroup(gid);
          if (!group) return null;
          const exs = yearExamples.filter(e => e.groupId === gid);
          return {
            type: 'group',
            id: group.id,
            name: group.name,
            color: group.color,
            count: exs.length,
            children: exs.map(ex => ({
              type: 'example',
              id: ex.id,
              name: `${ex.symbol} — ${ex.title}`,
              symbol: ex.symbol,
              date: ex.startDate
            }))
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const ga = groups.find(g => g.id === a.id);
          const gb = groups.find(g => g.id === b.id);
          return (ga?.sortOrder || 0) - (gb?.sortOrder || 0);
        });

      return {
        type: 'year',
        id: String(year),
        name: String(year),
        count: yearExamples.length,
        children: groupNodes
      };
    });
  }

  /**
   * Get markers for Lightweight Charts from examples.
   * Each marker is placed at the example's startDate.
   */
  function getMarkers(filters = {}) {
    const exs = getExamples(filters);
    return exs.map(ex => {
      const group = getGroup(ex.groupId);
      return {
        time: ex.startDate,
        position: 'belowBar',
        color: group?.color || '#888',
        shape: 'arrowUp',
        text: ex.symbol,
        id: ex.id
      };
    }).sort((a, b) => a.time.localeCompare(b.time));
  }

  /**
   * Build tree: Group > Year > Examples
   */
  function buildTreeByGroup() {
    return groups.map(group => {
      const groupExamples = examples.filter(e => e.groupId === group.id);
      const years = [...new Set(groupExamples.map(e => e.year))].sort((a, b) => b - a);
      return {
        type: 'group',
        id: group.id,
        name: group.name,
        color: group.color,
        count: groupExamples.length,
        children: years.map(year => {
          const yearExs = groupExamples.filter(e => e.year === year);
          return {
            type: 'year',
            id: `${group.id}-${year}`,
            name: String(year),
            count: yearExs.length,
            children: yearExs.map(ex => ({
              type: 'example',
              id: ex.id,
              name: `${ex.symbol} — ${ex.title}`,
              symbol: ex.symbol,
              date: ex.startDate
            }))
          };
        })
      };
    });
  }

  /**
   * Build tree: Setup Type > Examples
   */
  function buildTreeBySetup() {
    const bySetup = {};
    examples.forEach(ex => {
      const key = ex.setupType || 'unknown';
      if (!bySetup[key]) bySetup[key] = [];
      bySetup[key].push(ex);
    });

    // Get label from StatsEngine if available
    const getLabel = (id) => {
      if (typeof StatsEngine !== 'undefined') return StatsEngine.getSetupLabel(id);
      return id;
    };

    return Object.keys(bySetup).sort().map(setup => ({
      type: 'setup',
      id: setup,
      name: getLabel(setup),
      count: bySetup[setup].length,
      children: bySetup[setup].map(ex => ({
        type: 'example',
        id: ex.id,
        name: `${ex.symbol} — ${ex.title}`,
        symbol: ex.symbol,
        date: ex.startDate
      }))
    }));
  }

  /**
   * Get next and previous examples for navigation.
   */
  function getAdjacentExamples(id) {
    const idx = examples.findIndex(e => e.id === id);
    return {
      prev: idx > 0 ? examples[idx - 1] : null,
      next: idx < examples.length - 1 ? examples[idx + 1] : null
    };
  }

  return {
    init,
    loadOHLC,
    loadOHLC5min,
    getGroups,
    getGroup,
    getExamples,
    getExample,
    getYears,
    getAllTags,
    buildTree,
    buildTreeByGroup,
    buildTreeBySetup,
    getMarkers,
    getAdjacentExamples
  };
})();

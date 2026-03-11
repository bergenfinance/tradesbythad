/**
 * StatsEngine — Pure calculation module for trade statistics.
 * No DOM. Loaded after store.js.
 */
const StatsEngine = (() => {

  const SETUP_TYPES = [
    { id: 'cup-with-handle', label: 'Cup with Handle' },
    { id: 'double-bottom', label: 'Double Bottom' },
    { id: 'flat-base', label: 'Flat Base' },
    { id: 'ascending-base', label: 'Ascending Base' },
    { id: 'high-tight-flag', label: 'High Tight Flag' },
    { id: 'base-on-base', label: 'Base on Base' },
    { id: 'ipo-base', label: 'IPO Base' },
    { id: 'episodic-pivot', label: 'Episodic Pivot' },
    { id: 'power-play', label: 'Power Play' },
    { id: 'pullback-to-ma', label: 'Pullback to MA' },
    { id: 'gap-up-breakout', label: 'Gap-Up Breakout' },
    { id: 'other', label: 'Other' }
  ];

  function getSetupLabel(id) {
    const found = SETUP_TYPES.find(s => s.id === id);
    return found ? found.label : id || '—';
  }

  function hasTradeData(ex) {
    return (
      ex.entryPrice != null && typeof ex.entryPrice === 'number' &&
      ex.exitPrice != null && typeof ex.exitPrice === 'number' &&
      ex.stopLoss != null && typeof ex.stopLoss === 'number'
    );
  }

  function hasFundamentals(ex) {
    return (
      ex.setupType != null ||
      ex.epsGrowth != null ||
      ex.salesGrowth != null ||
      ex.rsRating != null ||
      ex.compositeRating != null ||
      ex.adRating != null ||
      ex.marketCondition != null ||
      ex.baseNumber != null
    );
  }

  /**
   * Count weekdays (Mon–Fri) between two date strings.
   */
  function countWeekdays(startStr, endStr) {
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    if (isNaN(start) || isNaN(end)) return null;
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  function computeTradeStats(ex) {
    if (!hasTradeData(ex)) return null;
    const dir = ex.direction === 'short' ? -1 : 1;
    const entry = ex.entryPrice;
    const exit = ex.exitPrice;
    const stop = ex.stopLoss;

    const pctGainLoss = dir * ((exit - entry) / entry) * 100;
    const risk = dir * (entry - stop);
    const rMultiple = risk !== 0 ? (dir * (exit - entry)) / risk : null;
    const riskPct = Math.abs((entry - stop) / entry) * 100;
    const holdDays = countWeekdays(ex.startDate, ex.endDate);
    const isWin = pctGainLoss > 0;

    return {
      pctGainLoss: Math.round(pctGainLoss * 100) / 100,
      rMultiple: rMultiple != null ? Math.round(rMultiple * 100) / 100 : null,
      holdDays,
      riskPct: Math.round(riskPct * 100) / 100,
      isWin,
      direction: ex.direction || 'long'
    };
  }

  function computeGroupStats(examples) {
    const tradesWithStats = examples
      .filter(hasTradeData)
      .map(ex => ({ example: ex, stats: computeTradeStats(ex) }))
      .filter(t => t.stats);

    const totalTrades = tradesWithStats.length;
    if (totalTrades === 0) {
      return null;
    }

    const wins = tradesWithStats.filter(t => t.stats.isWin);
    const losses = tradesWithStats.filter(t => !t.stats.isWin);

    const winRate = (wins.length / totalTrades) * 100;

    const sumGains = wins.reduce((s, t) => s + t.stats.pctGainLoss, 0);
    const sumLosses = losses.reduce((s, t) => s + Math.abs(t.stats.pctGainLoss), 0);

    const avgGainPct = wins.length > 0 ? sumGains / wins.length : 0;
    const avgLossPct = losses.length > 0 ? sumLosses / losses.length : 0;

    const profitFactor = sumLosses > 0 ? sumGains / sumLosses : (sumGains > 0 ? Infinity : 0);

    const rMultiples = tradesWithStats
      .map(t => t.stats.rMultiple)
      .filter(r => r != null);
    const expectancy = rMultiples.length > 0
      ? rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length
      : 0;

    const holdDays = tradesWithStats
      .map(t => t.stats.holdDays)
      .filter(d => d != null);
    const avgHoldDays = holdDays.length > 0
      ? Math.round(holdDays.reduce((s, d) => s + d, 0) / holdDays.length)
      : null;
    const shortestTrade = holdDays.length > 0 ? Math.min(...holdDays) : null;
    const longestTrade = holdDays.length > 0 ? Math.max(...holdDays) : null;

    const returns = tradesWithStats.map(t => t.stats.pctGainLoss);
    const bestTrade = Math.max(...returns);
    const worstTrade = Math.min(...returns);

    // Streaks
    let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
    tradesWithStats.forEach(t => {
      if (t.stats.isWin) {
        curWin++;
        curLoss = 0;
        if (curWin > maxWinStreak) maxWinStreak = curWin;
      } else {
        curLoss++;
        curWin = 0;
        if (curLoss > maxLossStreak) maxLossStreak = curLoss;
      }
    });

    const tradeDetails = tradesWithStats.map(t => ({
      id: t.example.id,
      symbol: t.example.symbol,
      setupType: t.example.setupType,
      direction: t.stats.direction,
      entryPrice: t.example.entryPrice,
      exitPrice: t.example.exitPrice,
      stopLoss: t.example.stopLoss,
      pctGainLoss: t.stats.pctGainLoss,
      rMultiple: t.stats.rMultiple,
      holdDays: t.stats.holdDays,
      isWin: t.stats.isWin,
      startDate: t.example.startDate,
      endDate: t.example.endDate
    }));

    return {
      totalTrades,
      wins: wins.length,
      losses: losses.length,
      winRate: Math.round(winRate * 10) / 10,
      avgGainPct: Math.round(avgGainPct * 100) / 100,
      avgLossPct: Math.round(avgLossPct * 100) / 100,
      profitFactor: profitFactor === Infinity ? Infinity : Math.round(profitFactor * 100) / 100,
      expectancy: Math.round(expectancy * 100) / 100,
      avgHoldDays,
      shortestTrade,
      longestTrade,
      bestTrade: Math.round(bestTrade * 100) / 100,
      worstTrade: Math.round(worstTrade * 100) / 100,
      maxWinStreak,
      maxLossStreak,
      returns,
      tradeDetails
    };
  }

  function getReturnsByPeriod(tradeDetails, periodType) {
    const buckets = {};
    tradeDetails.forEach(t => {
      let period;
      if (periodType === 'year') {
        period = t.startDate.slice(0, 4);
      } else {
        period = t.startDate.slice(0, 7); // YYYY-MM
      }
      if (!buckets[period]) buckets[period] = [];
      buckets[period].push(t);
    });

    return Object.keys(buckets).sort().map(period => {
      const trades = buckets[period];
      const wins = trades.filter(t => t.isWin).length;
      const avgReturn = trades.reduce((s, t) => s + t.pctGainLoss, 0) / trades.length;
      return {
        period,
        trades: trades.length,
        winRate: Math.round((wins / trades.length) * 1000) / 10,
        avgReturn: Math.round(avgReturn * 100) / 100
      };
    });
  }

  function getStatsBySetupType(examples) {
    const bySetup = {};
    examples.filter(hasTradeData).forEach(ex => {
      const key = ex.setupType || 'unknown';
      if (!bySetup[key]) bySetup[key] = [];
      bySetup[key].push(ex);
    });

    const result = new Map();
    for (const [setup, exs] of Object.entries(bySetup)) {
      const stats = computeGroupStats(exs);
      if (stats) result.set(setup, stats);
    }
    return result;
  }

  return {
    SETUP_TYPES,
    getSetupLabel,
    hasTradeData,
    hasFundamentals,
    computeTradeStats,
    computeGroupStats,
    getReturnsByPeriod,
    getStatsBySetupType
  };
})();

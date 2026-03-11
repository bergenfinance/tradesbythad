/**
 * SMA — Simple Moving Average calculator.
 * Returns data in Lightweight Charts LineSeries format.
 */
const SMA = (() => {
  /**
   * Compute SMA for a given period.
   * @param {Array} ohlcData - [{time, open, high, low, close}, ...]
   * @param {number} period - SMA period (e.g. 10, 20, 50, 200)
   * @returns {Array} [{time, value}, ...] for LineSeries
   */
  function compute(ohlcData, period) {
    if (!ohlcData || ohlcData.length < period) return [];

    const result = [];
    let sum = 0;

    for (let i = 0; i < ohlcData.length; i++) {
      sum += ohlcData[i].close;
      if (i >= period) {
        sum -= ohlcData[i - period].close;
      }
      if (i >= period - 1) {
        result.push({
          time: ohlcData[i].time,
          value: Math.round((sum / period) * 100) / 100
        });
      }
    }

    return result;
  }

  return { compute };
})();

/**
 * ChartManager — Manages Lightweight Charts v5 lifecycle.
 * Handles creation, data loading, markers, resize, and cleanup.
 */
class ChartManager {
  constructor(container, options = {}) {
    this.container = container;
    this.chart = null;
    this.series = null;
    this.markersObj = null;
    this.smaSeriesList = [];
    this.priceLines = [];
    this.resizeObserver = null;
    this.options = options;
    this._createChart();
  }

  _createChart() {
    const LC = window.LightweightCharts;

    this.chart = LC.createChart(this.container, {
      layout: {
        background: { type: 'solid', color: '#0d1117' },
        textColor: '#8b949e',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1c2128' },
        horzLines: { color: '#1c2128' },
      },
      crosshair: {
        mode: 0, // Normal
        vertLine: { color: '#58a6ff', width: 1, style: 2, labelBackgroundColor: '#388bfd' },
        horzLine: { color: '#58a6ff', width: 1, style: 2, labelBackgroundColor: '#388bfd' },
      },
      rightPriceScale: {
        borderColor: '#30363d',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#30363d',
        timeVisible: false,
        secondsVisible: false,
      },
      handleScale: { axisPressedMouseMove: true },
      handleScroll: { pressedMouseMove: true },
      ...this.options,
    });

    // v5 API: addSeries with series type
    this.series = this.chart.addSeries(LC.CandlestickSeries, {
      upColor: '#2ea043',
      downColor: '#f85149',
      borderDownColor: '#f85149',
      borderUpColor: '#2ea043',
      wickDownColor: '#f85149',
      wickUpColor: '#2ea043',
    });

    // ResizeObserver for responsive charts
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.chart.applyOptions({ width, height });
        }
      }
    });
    this.resizeObserver.observe(this.container);
  }

  setData(ohlcData) {
    if (!this.series || !ohlcData?.length) return;
    this.series.setData(ohlcData);
    this.chart.timeScale().fitContent();
  }

  setMarkers(markers) {
    if (!this.series) return;
    const LC = window.LightweightCharts;
    // v5 API: use createSeriesMarkers
    const sorted = [...markers].sort((a, b) => a.time.localeCompare(b.time));

    // Remove old markers object if exists
    if (this.markersObj) {
      this.markersObj.detach();
      this.markersObj = null;
    }

    if (sorted.length > 0) {
      this.markersObj = LC.createSeriesMarkers(this.series, sorted);
    }
  }

  /**
   * Set visible range to a specific date range.
   */
  setVisibleRange(from, to) {
    if (!this.chart) return;
    this.chart.timeScale().setVisibleRange({ from, to });
  }

  fitContent() {
    if (!this.chart) return;
    this.chart.timeScale().fitContent();
  }

  /**
   * Subscribe to crosshair move events.
   */
  onCrosshairMove(callback) {
    if (!this.chart) return;
    this.chart.subscribeCrosshairMove(callback);
  }

  onClick(callback) {
    if (!this.chart) return;
    this.chart.subscribeClick(callback);
  }

  addSMAs(ohlcData) {
    this.removeSMAs();
    if (!this.chart || !ohlcData?.length) return;
    const LC = window.LightweightCharts;

    ChartManager.SMA_CONFIG.forEach(cfg => {
      const smaData = SMA.compute(ohlcData, cfg.period);
      if (smaData.length === 0) return;

      const smaSeries = this.chart.addSeries(LC.LineSeries, {
        color: cfg.color,
        lineWidth: cfg.lineWidth,
        crosshairMarkerVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      smaSeries.setData(smaData);
      this.smaSeriesList.push(smaSeries);
    });
  }

  removeSMAs() {
    if (!this.chart) return;
    this.smaSeriesList.forEach(s => this.chart.removeSeries(s));
    this.smaSeriesList = [];
  }

  addPriceLines(lines) {
    this.removePriceLines();
    if (!this.series) return;
    lines.forEach(cfg => {
      const pl = this.series.createPriceLine({
        price: cfg.price,
        color: cfg.color,
        lineWidth: 1,
        lineStyle: cfg.lineStyle ?? 2, // dashed
        axisLabelVisible: true,
        title: cfg.title || '',
      });
      this.priceLines.push(pl);
    });
  }

  removePriceLines() {
    if (!this.series) return;
    this.priceLines.forEach(pl => this.series.removePriceLine(pl));
    this.priceLines = [];
  }

  destroy() {
    this.removeSMAs();
    this.removePriceLines();
    if (this.markersObj) {
      this.markersObj.detach();
      this.markersObj = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
      this.series = null;
    }
  }
}

ChartManager.SMA_CONFIG = [
  { period: 10,  color: '#e6e64d', lineWidth: 1 },
  { period: 20,  color: '#e67e22', lineWidth: 1 },
  { period: 50,  color: '#a371f7', lineWidth: 1 },
  { period: 200, color: '#58a6ff', lineWidth: 1.5 },
];

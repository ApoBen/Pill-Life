/**
 * Pill-Life — Chart Module
 * Chart.js line chart with annotation plugin for pharmacokinetic visualization
 */

let chartInstance = null;

/**
 * Create and return a Chart.js line chart instance.
 * @param {string} canvasId — the canvas element ID
 * @returns {Chart} chart instance
 */
export function createChart(canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) {
    console.error(`Canvas element #${canvasId} not found`);
    return null;
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Saat',
            color: 'rgba(255, 255, 255, 0.7)',
            font: { family: 'Inter', size: 12, weight: '500' },
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.5)',
            font: { family: 'Inter', size: 11 },
            callback: (value) => {
              if (value === 0) return 'Şimdi';
              const sign = value > 0 ? '+' : '';
              return `${sign}${value}s`;
            },
            stepSize: 2,
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.06)',
            drawTicks: false,
          },
          border: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
        },
        y: {
          title: {
            display: true,
            text: 'Kan Seviyesi (birim)',
            color: 'rgba(255, 255, 255, 0.7)',
            font: { family: 'Inter', size: 12, weight: '500' },
          },
          beginAtZero: true,
          ticks: {
            color: 'rgba(255, 255, 255, 0.5)',
            font: { family: 'Inter', size: 11 },
            maxTicksLimit: 8,
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.06)',
            drawTicks: false,
          },
          border: {
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: 'rgba(255, 255, 255, 0.8)',
            font: { family: 'Inter', size: 12, weight: '500' },
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(10, 10, 30, 0.9)',
          titleColor: 'rgba(255, 255, 255, 0.9)',
          bodyColor: 'rgba(255, 255, 255, 0.8)',
          titleFont: { family: 'Inter', size: 13, weight: '600' },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 12,
          cornerRadius: 10,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const hours = items[0].parsed.x;
              if (Math.abs(hours) < 0.01) return 'Şimdi';
              const sign = hours > 0 ? '+' : '';
              const h = Math.floor(Math.abs(hours));
              const m = Math.round((Math.abs(hours) - h) * 60);
              return `${sign}${hours < 0 ? '-' : ''}${h}s ${m}dk`;
            },
            label: (item) => {
              return ` ${item.dataset.label}: ${item.parsed.y.toFixed(2)} birim`;
            },
          },
        },
        annotation: {
          annotations: {
            nowLine: {
              type: 'line',
              xMin: 0,
              xMax: 0,
              borderColor: 'rgba(255, 255, 255, 0.4)',
              borderWidth: 2,
              borderDash: [6, 4],
              label: {
                display: true,
                content: 'Şimdi',
                position: 'start',
                backgroundColor: 'rgba(139, 92, 246, 0.8)',
                color: '#ffffff',
                font: { family: 'Inter', size: 11, weight: '600' },
                padding: { top: 4, bottom: 4, left: 8, right: 8 },
                borderRadius: 6,
                yAdjust: -10,
              },
            },
          },
        },
      },
      animation: {
        duration: 600,
        easing: 'easeInOutQuart',
      },
    },
  });

  return chartInstance;
}

/**
 * Update chart with new datasets.
 * Timeline is asymmetric: 25% past, 75% future.
 * @param {Chart} chart      — chart instance
 * @param {object[]} datasets — Chart.js dataset objects
 * @param {number} hoursRange — total hours visible (default 24)
 */
export function updateChart(chart, datasets, hoursRange = 24) {
  if (!chart) return;

  const pastHours = hoursRange * 0.25;
  const futureHours = hoursRange * 0.75;

  chart.data.datasets = datasets;
  chart.options.scales.x.min = -pastHours;
  chart.options.scales.x.max = futureHours;

  chart.update('none'); // skip animation for periodic updates
}

export function setChartTheme(isPrintTheme) {
  if (!chartInstance) return;

  const textColor = isPrintTheme ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.7)';
  const tickColor = isPrintTheme ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.5)';
  const gridColor = isPrintTheme ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.06)';
  const borderColor = isPrintTheme ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)';
  const nowLineColor = isPrintTheme ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.4)';

  // x scale
  chartInstance.options.scales.x.title.color = textColor;
  chartInstance.options.scales.x.ticks.color = tickColor;
  chartInstance.options.scales.x.grid.color = gridColor;
  chartInstance.options.scales.x.border.color = borderColor;

  // y scale
  chartInstance.options.scales.y.title.color = textColor;
  chartInstance.options.scales.y.ticks.color = tickColor;
  chartInstance.options.scales.y.grid.color = gridColor;

  // Legend
  chartInstance.options.plugins.legend.labels.color = textColor;

  // Annotation nowLine
  if (chartInstance.options.plugins.annotation?.annotations?.nowLine) {
    chartInstance.options.plugins.annotation.annotations.nowLine.borderColor = nowLineColor;
  }

  chartInstance.update('none');
}

/**
 * Get the current chart instance.
 * @returns {Chart|null}
 */
export function getChart() {
  return chartInstance;
}

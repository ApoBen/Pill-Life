/**
 * Pill Life - Chart Module (Chart.js Entegrasyonu)
 */

class AnalyticsChart {
  constructor() {
    this.chart = null;
    this.selectedHours = 24; // Varsayılan aralık
    this.visibleSubstances = new Set(); // Görünür madde ID'leri
  }

  /**
   * Grafiği sıfırdan oluşturur.
   * @param {string} canvasId 
   */
  init(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Şimdiki zaman çizgisi çizmek için özel bir plugin tanımlıyoruz
    const nowLinePlugin = {
      id: 'nowLine',
      afterDatasetsDraw: (chart) => {
        const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
        
        // "Şimdi" etiketini içeren indeksini bulalım
        const nowIndex = chart.data.labels.findIndex(label => label.includes("ŞİMDİ") || label === "Şimdi");
        if (nowIndex === -1) return;

        const xPos = x.getPixelForValue(nowIndex);

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#a78bfa'; // Morumsu çizgi
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Kesikli çizgi
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.stroke();

        // "Şimdi" yazısı etiketi
        ctx.fillStyle = '#a78bfa';
        ctx.font = 'bold 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('ŞİMDİ', xPos, top - 6);
        ctx.restore();
      }
    };

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 20
          }
        },
        plugins: {
          legend: {
            display: false // Kendi lejantımızı yan panelde listelediğimiz için kapattık
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 15, 30, 0.95)',
            titleColor: '#fff',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            padding: 12,
            titleFont: {
              family: 'Inter',
              size: 13,
              weight: 'bold'
            },
            bodyFont: {
              family: 'Inter',
              size: 12
            },
            callbacks: {
              label: function(context) {
                const dataset = context.dataset;
                const pointIndex = context.dataIndex;
                const dataPoint = dataset.data[pointIndex];
                const rawData = dataset.rawPoints ? dataset.rawPoints[pointIndex] : null;
                
                let label = ` ${dataset.label}: `;
                if (rawData) {
                  label += `%${dataPoint} (${rawData.mg} mg)`;
                } else {
                  label += `%${dataPoint}`;
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.03)',
              tickColor: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#64748b',
              font: {
                family: 'Inter',
                size: 11
              },
              maxRotation: 0,
              autoSkip: true,
              autoSkipPadding: 15
            }
          },
          y: {
            min: 0,
            grid: {
              color: 'rgba(255, 255, 255, 0.03)',
              tickColor: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#64748b',
              font: {
                family: 'Inter',
                size: 11
              },
              callback: function(value) {
                return '%' + value;
              }
            }
          }
        }
      },
      plugins: [nowLinePlugin]
    });
  }

  /**
   * Filtrelerde veya dozlarda bir güncelleme olduğunda grafiği yeniden çizer.
   * @param {Array} doses - Tüm doz kayıtları
   * @param {Array} substances - Tüm maddeler (özelleştirilmiş/özel dahil)
   */
  update(doses, substances) {
    if (!this.chart) return;

    const now = Date.now();
    let pastHours = 6;
    let futureHours = 18;
    let stepMinutes = 30;

    switch (parseInt(this.selectedHours)) {
      case 6:
        pastHours = 2;
        futureHours = 4;
        stepMinutes = 10;
        break;
      case 12:
        pastHours = 4;
        futureHours = 8;
        stepMinutes = 15;
        break;
      case 24:
        pastHours = 6;
        futureHours = 18;
        stepMinutes = 30;
        break;
      case 48:
        pastHours = 12;
        futureHours = 36;
        stepMinutes = 60;
        break;
      case 168: // 7 gün
        pastHours = 24;
        futureHours = 144;
        stepMinutes = 120;
        break;
    }

    const startTime = now - (pastHours * 60 * 60 * 1000);
    const endTime = now + (futureHours * 60 * 60 * 1000);

    // Zaman serisi etiketlerini ve "Şimdi" anını belirleme
    const labels = [];
    const stepMs = stepMinutes * 60 * 1000;
    let nowLabelIndex = -1;
    let minDiff = Infinity;

    // Zaman adımlarını toplayalım
    for (let t = startTime; t <= endTime; t += stepMs) {
      const diff = Math.abs(t - now);
      if (diff < minDiff) {
        minDiff = diff;
        nowLabelIndex = labels.length;
      }
      labels.push(t);
    }

    // Grafik etiketlerini okunabilir tarih formatına dönüştürelim
    const formattedLabels = labels.map((t, idx) => {
      if (idx === nowLabelIndex) {
        return "Şimdi";
      }
      const d = new Date(t);
      const today = new Date(now);
      const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
      
      const hourStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
      
      if (isToday) {
        return hourStr;
      } else {
        const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        return `${days[d.getDay()]} ${hourStr}`;
      }
    });

    const datasets = [];

    // Seçilen veya aktif olan her ilaç için veri kümesi oluştur
    substances.forEach(sub => {
      // Eğer bu madde görünür olarak işaretlenmemişse atla
      if (!this.visibleSubstances.has(sub.id)) return;

      const subDoses = doses.filter(d => d.substanceId === sub.id);
      
      // Eğer hiç dozu yoksa grafiğe eklemeye gerek yok
      if (subDoses.length === 0) return;

      // Zaman serisi verilerini hesapla
      const series = Pharmacokinetics.generateTimeSeries(
        subDoses,
        sub.halfLifeHours,
        sub.absorptionTimeHours || 0,
        sub.doseMg,
        startTime,
        endTime,
        stepMinutes
      );

      const dataPoints = series.map(pt => pt.y);

      datasets.push({
        label: sub.name,
        data: dataPoints,
        rawPoints: series, // Detaylı tooltip için saklıyoruz
        borderColor: sub.color || '#8b5cf6',
        backgroundColor: (sub.color || '#8b5cf6') + '15', // %9 opaklık
        fill: true,
        tension: 0.3,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        shadowColor: sub.color,
        shadowBlur: 10
      });
    });

    this.chart.data.labels = formattedLabels;
    this.chart.data.datasets = datasets;
    this.chart.update('none'); // Animasyonsuz anlık güncelleme (her saniye tetiklendiği için kasmasın)
  }

  /**
   * Bir maddenin görünürlüğünü açar/kapatır
   * @param {string} substanceId 
   * @param {boolean} visible 
   */
  setVisible(substanceId, visible) {
    if (visible) {
      this.visibleSubstances.add(substanceId);
    } else {
      this.visibleSubstances.delete(substanceId);
    }
  }

  /**
   * Tüm maddelerin görünürlük ayarlarını sıfırlar
   * @param {Array} activeSubstanceIds 
   */
  resetVisibleList(activeSubstanceIds) {
    this.visibleSubstances.clear();
    activeSubstanceIds.forEach(id => this.visibleSubstances.add(id));
  }
}

/**
 * Pill Life - Pharmacokinetics Module (Farmakokinetik Hesaplama Motoru)
 */

class Pharmacokinetics {
  /**
   * Eliminasyon hız sabitini (k) hesaplar.
   * k = ln(2) / t½
   * @param {number} halfLifeHours - İlacın yarı ömrü (saat cinsinden)
   * @returns {number}
   */
  static getEliminationConstant(halfLifeHours) {
    if (!halfLifeHours || halfLifeHours <= 0) return 0;
    return Math.LN2 / halfLifeHours;
  }

  /**
   * Kana karışma süresi (Tmax) ve eliminasyon hız sabitinden (Ke)
   * emilim hız sabitini (Ka) sayısal olarak çözer.
   * Tmax = ln(Ka / Ke) / (Ka - Ke)
   * @param {number} ke - Eliminasyon hız sabiti (1/saat)
   * @param {number} tmax - Kana karışma süresi (saat)
   * @returns {number}
   */
  static calculateKa(ke, tmax) {
    if (tmax <= 0.05) return 1000; // Neredeyse anında emilim
    
    // Ka > Ke olmalı. Arama aralığı: [ke + 1e-5, 1000]
    let low = ke + 1e-5;
    let high = Math.max(1000, 100 / tmax);
    
    for (let i = 0; i < 30; i++) {
      let mid = (low + high) / 2;
      let computedTmax = Math.log(mid / ke) / (mid - ke);
      if (computedTmax > tmax) {
        // Hesaplanan Tmax çok büyük, demek ki emilim hızı (Ka) çok yavaş (küçük).
        low = mid;
      } else {
        high = mid;
      }
    }
    return (low + high) / 2;
  }

  /**
   * Belirli bir dozun verilen zaman (saat) sonrasındaki kalan miktarını hesaplar.
   * C(t) = Dose * (e^(-ke * t) - e^(-ka * t)) / (e^(-ke * Tmax) - e^(-ka * Tmax))
   * @param {number} doseMg - Alınan doz miktarı (mg)
   * @param {number} halfLifeHours - Yarı ömür (saat)
   * @param {number} hoursElapsed - Geçen süre (saat)
   * @param {number} absorptionHours - Kana karışma süresi (saat)
   * @returns {number} Kalan miktar (mg)
   */
  static calculateRemainingAmount(doseMg, halfLifeHours, hoursElapsed, absorptionHours = 0) {
    if (hoursElapsed < 0) return 0; // Gelecekteki bir doz
    
    const ke = this.getEliminationConstant(halfLifeHours);
    
    // Kana karışma süresi yoksa veya çok kısaysa doğrudan anlık üstel azalma kullan
    if (absorptionHours <= 0.05) {
      return doseMg * Math.exp(-ke * hoursElapsed);
    }

    const ka = this.calculateKa(ke, absorptionHours);
    const denom = Math.exp(-ke * absorptionHours) - Math.exp(-ka * absorptionHours);
    
    // Paydanın 0 olması durumunda hata almamak için koruma
    if (Math.abs(denom) < 1e-6) {
      return doseMg * Math.exp(-ke * hoursElapsed);
    }

    const factor = (Math.exp(-ke * hoursElapsed) - Math.exp(-ka * hoursElapsed)) / denom;
    return doseMg * Math.max(0, factor);
  }

  /**
   * Tek bir dozun yüzde olarak kalan seviyesini hesaplar.
   * @param {number} halfLifeHours 
   * @param {number} hoursElapsed 
   * @param {number} absorptionHours
   * @returns {number} Kalan yüzde (0-100)
   */
  static calculateRemainingPercentage(halfLifeHours, hoursElapsed, absorptionHours = 0) {
    if (hoursElapsed < 0) return 0;
    const ke = this.getEliminationConstant(halfLifeHours);
    
    if (absorptionHours <= 0.05) {
      return 100 * Math.exp(-ke * hoursElapsed);
    }

    const ka = this.calculateKa(ke, absorptionHours);
    const denom = Math.exp(-ke * absorptionHours) - Math.exp(-ka * absorptionHours);
    
    if (Math.abs(denom) < 1e-6) {
      return 100 * Math.exp(-ke * hoursElapsed);
    }

    const factor = (Math.exp(-ke * hoursElapsed) - Math.exp(-ka * hoursElapsed)) / denom;
    return 100 * Math.max(0, factor);
  }

  /**
   * Belirli bir ilaca ait tüm aktif dozların toplam birikimli kan konsantrasyonunu (mg) hesaplar.
   * (Süperpozisyon İlkesi)
   * @param {Array} doses - İlacın doz geçmişi listesi: [{ doseMg, timestamp }]
   * @param {number} halfLifeHours - İlacın yarı ömrü
   * @param {number} absorptionHours - Kana karışma süresi
   * @param {number} currentTimeMs - Şu anki zaman (ms)
   * @returns {number} Toplam aktif mg seviyesi
   */
  static calculateCumulativeAmount(doses, halfLifeHours, absorptionHours, currentTimeMs) {
    let total = 0;
    doses.forEach(dose => {
      const hoursElapsed = (currentTimeMs - dose.timestamp) / (1000 * 60 * 60);
      if (hoursElapsed >= 0) {
        total += this.calculateRemainingAmount(dose.doseMg, halfLifeHours, hoursElapsed, absorptionHours);
      }
    });
    return total;
  }

  /**
   * Bir ilacın toplam seviyesinin maksimum doza oranını yüzde olarak hesaplar.
   * Genellikle en son alınan dozu veya standart tek dozu temel alır.
   * @param {Array} doses 
   * @param {number} halfLifeHours 
   * @param {number} absorptionHours - Kana karışma süresi (saat)
   * @param {number} singleDoseMg - Temel referans dozu (örneğin ilacın varsayılan dozu)
   * @param {number} currentTimeMs 
   * @returns {number} Yüzde (0-100+)
   */
  static calculateCumulativePercentage(doses, halfLifeHours, absorptionHours, singleDoseMg, currentTimeMs) {
    if (doses.length === 0) return 0;
    const currentMg = this.calculateCumulativeAmount(doses, halfLifeHours, absorptionHours, currentTimeMs);
    const refDose = singleDoseMg || doses[doses.length - 1].doseMg || 100;
    
    // Yüzdeyi hesaplar (örneğin üst üste doz alımında %100'ün üzerine çıkabilir ki bu birikmeyi doğru gösterir)
    return (currentMg / refDose) * 100;
  }

  /**
   * Bir dozun vücuttan tamamen (veya pratik olarak %97 oranında, yani 5 yarı ömürde)
   * atılıp atılmadığını kontrol eder.
   * @param {number} halfLifeHours 
   * @param {number} hoursElapsed 
   * @returns {boolean}
   */
  static isEffectivelyEliminated(halfLifeHours, hoursElapsed) {
    // Genellikle 5 ila 7 yarı ömür sonrasında ilaç elenmiş kabul edilir.
    // 7 yarı ömür = (1/2)^7 = %0.78 kalıntı.
    return hoursElapsed > (halfLifeHours * 7);
  }

  /**
   * Grafik için zaman serisi verisi üretir.
   * @param {Array} doses - Doz listesi
   * @param {number} halfLifeHours - Yarı ömür
   * @param {number} absorptionHours - Kana karışma süresi
   * @param {number} singleDoseMg - Referans doz mg
   * @param {number} startTimeMs - Grafiğin başlangıç zamanı (ms)
   * @param {number} endTimeMs - Grafiğin bitiş zamanı (ms)
   * @param {number} stepMinutes - İki nokta arasındaki süre (dakika)
   * @returns {Array} [{ x: Date, y: percentage, mg: amount }]
   */
  static generateTimeSeries(doses, halfLifeHours, absorptionHours, singleDoseMg, startTimeMs, endTimeMs, stepMinutes = 15) {
    const dataPoints = [];
    const stepMs = stepMinutes * 60 * 1000;
    
    // Dozları zaman damgalarına göre filtrele veya sırala
    const relevantDoses = doses.filter(d => d.timestamp <= endTimeMs);

    for (let timeMs = startTimeMs; timeMs <= endTimeMs; timeMs += stepMs) {
      const amount = this.calculateCumulativeAmount(relevantDoses, halfLifeHours, absorptionHours, timeMs);
      const percentage = singleDoseMg > 0 ? (amount / singleDoseMg) * 100 : 0;
      
      dataPoints.push({
        x: new Date(timeMs),
        y: Math.round(percentage * 10) / 10,
        mg: Math.round(amount * 100) / 100
      });
    }

    return dataPoints;
  }
}

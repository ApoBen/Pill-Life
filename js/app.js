/**
 * Pill Life - App Controller (Ana Uygulama Kontrolörü)
 */

class AppController {
  constructor() {
    this.currentView = "dashboard";
    this.chartManager = null;
    this.updateInterval = null;
    this.clockInterval = null;
  }

  init() {
    // 1. Arayüz saatini başlat ve her saniye güncelle
    UIManager.updateClock();
    this.clockInterval = setInterval(() => UIManager.updateClock(), 1000);

    // 2. Grafiği başlat
    this.chartManager = new AnalyticsChart();
    this.chartManager.init("main-analytics-chart");

    // 3. Olay dinleyicilerini kaydet
    this.registerEventListeners();

    // 4. Navigasyonu / Hash yönlendirmesini yükle
    this.handleRouting();

    // 5. Her saniye seviyeleri ve dashboard'u güncelleyen ana döngüyü başlat
    this.startUpdateLoop();

    // 6. İlk arayüz çizimi
    this.render();
    
    // Grafiğin varsayılan görünürlük listesini aktif ilaçlarla doldur
    const activeIds = this.getActiveSubstanceIds();
    this.chartManager.resetVisibleList(activeIds);
    this.updateAnalyticsTab();
  }

  // --- ANA GÜNCELLEME DÖNGÜSÜ ---
  startUpdateLoop() {
    this.updateInterval = setInterval(() => {
      this.updateActiveLevels();
    }, 1000);
  }

  // --- KAN SEVİYELERİNİ ANLIK GÜNCELLEME ---
  updateActiveLevels() {
    const doses = StorageManager.getDoses();
    const substances = StorageManager.getAllSubstances();
    const activeData = this.calculateActiveSubstancesData(doses, substances);

    // Üst istatistik barını güncelle
    let activeCount = activeData.length;
    let highestLevel = 0;
    activeData.forEach(item => {
      if (item.percentage > highestLevel) highestLevel = item.percentage;
    });

    // Son dozu bul
    let lastDoseText = "--:--";
    if (doses.length > 0) {
      const sorted = [...doses].sort((a, b) => b.timestamp - a.timestamp);
      const lastDoseDate = new Date(sorted[0].timestamp);
      lastDoseText = lastDoseDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    }

    UIManager.updateStats(activeCount, highestLevel, lastDoseText);

    // Eğer şu an Dashboard görünümündeysek, kartlardaki yüzde değerlerini güncelle
    if (this.currentView === "dashboard") {
      UIManager.renderDashboard(
        activeData,
        (sub) => this.openAddDoseModal(sub),
        (sub) => this.openEditSubstanceModal(sub),
        (sub) => this.clearActiveDoses(sub)
      );
    }

    // Grafik görünümündeyse grafiği her saniye güncelle (kesikli çizgi kayması ve değer erimesi için)
    if (this.currentView === "analytics") {
      this.chartManager.update(doses, substances);
    }
  }

  // --- TÜM VERİLERİ HESAPLAMA ---
  calculateActiveSubstancesData(doses, substances) {
    const now = Date.now();
    const activeData = [];

    substances.forEach(sub => {
      const subDoses = doses.filter(d => d.substanceId === sub.id);
      if (subDoses.length === 0) return;

      // Son dozu bulma
      const sortedDoses = [...subDoses].sort((a, b) => b.timestamp - a.timestamp);
      const lastDose = sortedDoses[0];
      const hoursSinceLastDose = (now - lastDose.timestamp) / (1000 * 60 * 60);

      // Kümülatif değerleri hesaplama
      const percentage = Pharmacokinetics.calculateCumulativePercentage(
        subDoses,
        sub.halfLifeHours,
        sub.absorptionTimeHours || 0,
        sub.doseMg,
        now
      );
      
      const amountMg = Pharmacokinetics.calculateCumulativeAmount(
        subDoses,
        sub.halfLifeHours,
        sub.absorptionTimeHours || 0,
        now
      );

      // Eğer kalan seviye hala %3'ün üzerindeyse aktif olarak kabul et
      if (percentage > 3.0) {
        activeData.push({
          substance: sub,
          percentage: percentage,
          amountMg: amountMg,
          lastDose: lastDose,
          hoursSinceLastDose: hoursSinceLastDose
        });
      }
    });

    // Seviyeye göre yüksekten düşüğe sırala
    return activeData.sort((a, b) => b.percentage - a.percentage);
  }

  getActiveSubstanceIds() {
    const doses = StorageManager.getDoses();
    const substances = StorageManager.getAllSubstances();
    const data = this.calculateActiveSubstancesData(doses, substances);
    return data.map(item => item.substance.id);
  }

  // --- ANA YÖNLENDİRME (ROUTING) ---
  handleRouting() {
    const hash = window.location.hash.replace("#", "") || "dashboard";
    this.navigateTo(hash);
  }

  navigateTo(viewId) {
    const validViews = ["dashboard", "library", "analytics"];
    if (!validViews.includes(viewId)) viewId = "dashboard";

    this.currentView = viewId;

    // View HTML elementlerini aç/kapat
    document.querySelectorAll(".content-view").forEach(view => {
      view.classList.remove("active");
    });
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.add("active");

    // Navigasyon menüsünü güncelle
    document.querySelectorAll(".sidebar-menu a").forEach(link => {
      link.classList.remove("active");
    });
    const targetLink = document.getElementById(`nav-${viewId}`);
    if (targetLink) targetLink.classList.add("active");

    // Sayfa başlığını ayarla
    if (viewId === "dashboard") {
      UIManager.setPageHeader("Genel Durum Paneli", "Vücudunuzdaki aktif maddelerin anlık analizi");
    } else if (viewId === "library") {
      UIManager.setPageHeader("İlaç & Takviye Kütüphanesi", "İlaç, vitamin ve mineral listeniz. Buradan doz ekleyebilirsiniz.");
    } else if (viewId === "analytics") {
      UIManager.setPageHeader("Grafik & Analiz", "Kan seviyesi değişim grafiği ve gelecek tahminleri");
      this.updateAnalyticsTab();
    }

    // Anında UI güncellemesi tetikle
    this.updateActiveLevels();
    this.render();
  }

  // --- UI RENDER TETİKLEYİCİSİ ---
  render() {
    const doses = StorageManager.getDoses();
    const substances = StorageManager.getAllSubstances();
    const activeIds = this.getActiveSubstanceIds();

    if (this.currentView === "dashboard") {
      const activeData = this.calculateActiveSubstancesData(doses, substances);
      UIManager.renderDashboard(
        activeData,
        (sub) => this.openAddDoseModal(sub),
        (sub) => this.openEditSubstanceModal(sub),
        (sub) => this.clearActiveDoses(sub)
      );
    } else if (this.currentView === "library") {
      const searchVal = document.getElementById("library-search").value;
      const activeTab = document.querySelector(".category-tabs .tab-btn.active");
      const activeCat = activeTab ? activeTab.dataset.category : "all";

      UIManager.renderLibrary(
        substances,
        activeIds,
        searchVal,
        activeCat,
        (sub) => this.openAddDoseModal(sub),
        (sub) => this.openEditSubstanceModal(sub)
      );
    }
  }

  updateAnalyticsTab() {
    const doses = StorageManager.getDoses();
    const substances = StorageManager.getAllSubstances();
    
    // Aktif (dozu olan) maddeleri bul
    const substancesWithDoses = substances.filter(sub => {
      return doses.some(d => d.substanceId === sub.id);
    });

    UIManager.renderChartFilters(
      substancesWithDoses,
      this.chartManager.visibleSubstances,
      (subId, isVisible) => {
        this.chartManager.setVisible(subId, isVisible);
        this.chartManager.update(doses, substances);
      }
    );

    this.chartManager.update(doses, substances);
  }

  clearActiveDoses(substance) {
    if (confirm(`"${substance.name}" ilacına ait tüm doz kayıtlarını silmek istiyor musunuz?`)) {
      let doses = StorageManager.getDoses();
      doses = doses.filter(d => d.substanceId !== substance.id);
      StorageManager.saveDoses(doses);
      UIManager.showToast(`"${substance.name}" doz geçmişi temizlendi.`, "info");
      
      this.updateActiveLevels();
      this.render();
      this.updateAnalyticsTab();
    }
  }

  // --- MODAL AÇMA YÖNTEMLERİ ---

  openAddDoseModal(substance) {
    document.getElementById("add-dose-substance-id").value = substance.id;
    document.getElementById("add-dose-name-display").value = substance.name;
    document.getElementById("add-dose-mg").value = substance.doseMg || "";
    document.getElementById("add-dose-default-hint").textContent = `Varsayılan: ${substance.doseMg || 0} mg`;

    // Tarih alanına şu anki yerel saati formatlayarak yazalım
    const now = new Date();
    // datetime-local inputu YYYY-MM-DDTHH:MM formatı ister
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    document.getElementById("add-dose-time").value = localISOTime;

    UIManager.showModal("modal-add-dose");
  }

  openEditSubstanceModal(substance) {
    document.getElementById("edit-substance-id").value = substance.id;
    document.getElementById("edit-substance-name").value = substance.name;
    document.getElementById("edit-substance-default-dose").value = substance.doseMg;
    document.getElementById("edit-substance-notes").value = substance.notes || "";

    // Yarı ömür saat/gün ayrımı
    const halfLife = substance.halfLifeHours;
    const isDays = halfLife >= 24 && halfLife % 24 === 0;
    
    const hlVal = isDays ? halfLife / 24 : halfLife;
    const hlUnit = isDays ? "days" : "hours";

    document.getElementById("edit-substance-halflife").value = hlVal;
    document.getElementById("edit-substance-halflife-unit").value = hlUnit;
    
    // Slider min/max sınırlarını ayarla ve değeri eşitle
    this.updateHalfLifeSliderLimits(hlUnit);
    document.getElementById("edit-substance-halflife-slider").value = hlVal;

    // Kana karışma süresi
    const absorption = substance.absorptionTimeHours || 0;
    document.getElementById("edit-substance-absorption").value = absorption;
    document.getElementById("edit-substance-absorption-slider").value = absorption;

    // Kendi ilacı ise "Sil" butonunu göster, default ilaçlarda gizle
    const deleteBtn = document.getElementById("btn-delete-custom-substance");
    if (substance.isCustom) {
      deleteBtn.classList.remove("hidden");
    } else {
      deleteBtn.classList.add("hidden");
    }

    // Renk Presetlerini ve custom pickeri hazırla
    UIManager.setupColorPresets(
      "edit-presets-grid", 
      "edit-substance-color-custom", 
      substance.color
    );

    UIManager.showModal("modal-edit-substance");
  }

  openAddCustomModal() {
    document.getElementById("form-add-custom").reset();
    
    UIManager.setupColorPresets(
      "add-presets-grid",
      "add-custom-color-custom",
      "#3b82f6" // Varsayılan mavi
    );

    UIManager.showModal("modal-add-custom");
  }

  openDoseHistoryModal() {
    const doses = StorageManager.getDoses();
    const substances = StorageManager.getAllSubstances();
    
    UIManager.renderHistoryTable(doses, substances, (doseId) => {
      if (confirm("Bu dozu silmek istediğinizden emin misiniz?")) {
        StorageManager.deleteDose(doseId);
        UIManager.showToast("Doz kaydı silindi.", "info");
        
        // Tabloyu ve tüm görünümleri anında güncelle
        this.openDoseHistoryModal();
        this.updateActiveLevels();
        this.render();
        this.updateAnalyticsTab();
      }
    });

    UIManager.showModal("modal-dose-history");
  }

  updateHalfLifeSliderLimits(unit) {
    const slider = document.getElementById("edit-substance-halflife-slider");
    if (!slider) return;

    if (unit === "days") {
      slider.min = "1";
      slider.max = "30";
      slider.step = "1";
    } else {
      slider.min = "0.5";
      slider.max = "120";
      slider.step = "0.5";
    }
  }

  // --- EVENT LISTENERS KAYDI ---
  registerEventListeners() {
    const self = this;

    // --- MENÜ NAVİGASYONU ---
    window.addEventListener("hashchange", () => this.handleRouting());

    // --- YARDIMCI BUTONLAR VE DIŞ FAB ---
    const fab = document.getElementById("fab-add-dose");
    if (fab) {
      fab.addEventListener("click", () => {
        // Dropdown tarzında veya direkt kütüphaneye yönlendir
        // ya da bir quick add penceresi aç
        const substances = StorageManager.getAllSubstances();
        if (substances.length > 0) {
          // İlk ilacı varsayılan seçip modal açalım
          self.openAddDoseModal(substances[0]);
        } else {
          UIManager.showToast("Kütüphanede kayıtlı ilaç bulunmuyor. Önce ilaç ekleyin.", "error");
        }
      });
    }

    const addCustomBtn = document.getElementById("btn-add-custom-drug");
    if (addCustomBtn) {
      addCustomBtn.addEventListener("click", () => this.openAddCustomModal());
    }

    const historyBtn = document.getElementById("btn-dose-history");
    if (historyBtn) {
      historyBtn.addEventListener("click", () => this.openDoseHistoryModal());
    }

    // --- KÜTÜPHANE ARAMA VE SEKMELER ---
    const searchInput = document.getElementById("library-search");
    if (searchInput) {
      searchInput.addEventListener("input", () => this.render());
    }

    const categoryTabs = document.querySelectorAll(".category-tabs .tab-btn");
    categoryTabs.forEach(btn => {
      btn.addEventListener("click", (e) => {
        categoryTabs.forEach(t => t.classList.remove("active"));
        e.target.classList.add("active");
        self.render();
      });
    });

    // --- GRAFİK ZAMAN ARALIĞI SEÇİCİLERİ ---
    const rangeBtns = document.querySelectorAll(".time-range-selector button");
    rangeBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        rangeBtns.forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        self.chartManager.selectedHours = parseInt(e.target.dataset.hours);
        self.chartManager.update(StorageManager.getDoses(), StorageManager.getAllSubstances());
      });
    });

    // --- MODAL KAPATMA ETKİNLİKLERİ ---
    document.querySelectorAll(".btn-close-modal").forEach(btn => {
      btn.addEventListener("click", (e) => {
        // En yakın modal overlay'i bul ve kapat
        const modal = e.target.closest(".modal-overlay");
        if (modal) {
          self.hideModal(modal.id);
        }
      });
    });

    // Modal dışına tıklayınca kapatma
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          self.hideModal(overlay.id);
        }
      });
    });

    // --- HIZLI ZAMAN BUTONLARI (DOZ EKLE MODALİ) ---
    const setDoseTime = (minutesAgo) => {
      const now = new Date();
      const past = new Date(now.getTime() - minutesAgo * 60000);
      const offset = past.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(past - offset)).toISOString().slice(0, 16);
      document.getElementById("add-dose-time").value = localISOTime;
    };

    document.getElementById("btn-time-now").addEventListener("click", () => setDoseTime(0));
    document.getElementById("btn-time-1h-ago").addEventListener("click", () => setDoseTime(60));
    document.getElementById("btn-time-4h-ago").addEventListener("click", () => setDoseTime(240));

    // --- DÜZENLEME MODALİ SLIDER & INPUT İLİŞKİSİ ---
    const hlInput = document.getElementById("edit-substance-halflife");
    const hlSlider = document.getElementById("edit-substance-halflife-slider");
    const hlUnit = document.getElementById("edit-substance-halflife-unit");

    if (hlInput && hlSlider) {
      hlInput.addEventListener("input", (e) => {
        hlSlider.value = e.target.value;
      });
      hlSlider.addEventListener("input", (e) => {
        hlInput.value = e.target.value;
      });
      hlUnit.addEventListener("change", (e) => {
        this.updateHalfLifeSliderLimits(e.target.value);
        // Değeri sınırla
        if (e.target.value === "days" && parseFloat(hlInput.value) > 30) {
          hlInput.value = 30;
          hlSlider.value = 30;
        } else if (e.target.value === "hours" && parseFloat(hlInput.value) > 120) {
          hlInput.value = 120;
          hlSlider.value = 120;
        }
      });
    // --- KANA KARIŞMA SÜRESİ SLIDER & INPUT İLİŞKİSİ ---
    const absInput = document.getElementById("edit-substance-absorption");
    const absSlider = document.getElementById("edit-substance-absorption-slider");
    if (absInput && absSlider) {
      absInput.addEventListener("input", (e) => {
        absSlider.value = e.target.value;
      });
      absSlider.addEventListener("input", (e) => {
        absInput.value = e.target.value;
      });
    }

    // --- ÖZEL İLAÇ EKLEME FORMU PRESET YÖNETİMİ ---
    // setupColorPresets metodunun 'setup' edilme anı modal açılırken yapılır.

    // --- SUBMITS (FORM GÖNDERİMLERİ) ---

    // 1. Doz Ekleme Formu
    document.getElementById("form-add-dose").addEventListener("submit", (e) => {
      e.preventDefault();
      const subId = document.getElementById("add-dose-substance-id").value;
      const mg = parseFloat(document.getElementById("add-dose-mg").value);
      const timeVal = document.getElementById("add-dose-time").value;
      const timestamp = new Date(timeVal).getTime();

      if (isNaN(mg) || mg <= 0) {
        UIManager.showToast("Lütfen geçerli bir doz miktarı girin.", "error");
        return;
      }

      StorageManager.addDose(subId, mg, timestamp);
      UIManager.showToast("Doz kaydı başarıyla eklendi.");
      self.hideModal("modal-add-dose");

      // UI ve Grafik Güncelleme
      self.updateActiveLevels();
      self.render();
      
      // Eğer bu ilacın grafikte gösterimi kapalıysa otomatik açalım
      self.chartManager.setVisible(subId, true);
      self.updateAnalyticsTab();
    });

    // 2. İlaç Düzenleme Formu
    document.getElementById("form-edit-substance").addEventListener("submit", (e) => {
      e.preventDefault();
      const subId = document.getElementById("edit-substance-id").value;
      const name = document.getElementById("edit-substance-name").value;
      const defaultDose = parseFloat(document.getElementById("edit-substance-default-dose").value);
      const notes = document.getElementById("edit-substance-notes").value;
      
      const hlVal = parseFloat(document.getElementById("edit-substance-halflife").value);
      const hlUnitVal = document.getElementById("edit-substance-halflife-unit").value;
      const halfLifeHours = hlUnitVal === "days" ? hlVal * 24 : hlVal;

      // Seçilen rengi bul
      let color = "#3b82f6";
      const selectedDot = document.querySelector("#edit-presets-grid .color-dot.selected");
      if (selectedDot) {
        color = selectedDot.dataset.color;
      } else {
        color = document.getElementById("edit-substance-color-custom").value;
      }

      const absorptionTimeHours = parseFloat(document.getElementById("edit-substance-absorption").value) || 0;

      StorageManager.saveOverride(subId, {
        name,
        doseMg: defaultDose,
        halfLifeHours,
        absorptionTimeHours,
        color,
        notes
      });

      UIManager.showToast("İlaç ayarları kaydedildi.");
      self.hideModal("modal-edit-substance");
      
      // UI güncelle
      self.updateActiveLevels();
      self.render();
      self.updateAnalyticsTab();
    });

    // 3. Özel İlaç Ekleme Formu
    document.getElementById("form-add-custom").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("add-custom-name").value;
      const category = document.getElementById("add-custom-category").value;
      const defaultDose = parseFloat(document.getElementById("add-custom-dose").value);
      
      const hlVal = parseFloat(document.getElementById("add-custom-halflife").value);
      const hlUnitVal = document.getElementById("add-custom-halflife-unit").value;
      const halfLifeHours = hlUnitVal === "days" ? hlVal * 24 : hlVal;
      const notes = document.getElementById("add-custom-notes").value;

      // Renk seçimi
      let color = "#3b82f6";
      const selectedDot = document.querySelector("#add-presets-grid .color-dot.selected");
      if (selectedDot) {
        color = selectedDot.dataset.color;
      } else {
        color = document.getElementById("add-custom-color-custom").value;
      }

      const absorptionTimeHours = parseFloat(document.getElementById("add-custom-absorption").value) || 0;

      const newSub = StorageManager.addCustomSubstance({
        name,
        category,
        doseMg: defaultDose,
        halfLifeHours,
        absorptionTimeHours,
        color,
        notes,
        activeIngredient: "Özel Madde"
      });

      UIManager.showToast(`${name} kütüphaneye eklendi.`);
      self.hideModal("modal-add-custom");

      // UI Güncelle
      self.render();
    });

    // 4. Özel İlaç Silme Butonu
    document.getElementById("btn-delete-custom-substance").addEventListener("click", () => {
      const subId = document.getElementById("edit-substance-id").value;
      const sub = StorageManager.getSubstanceById(subId);
      if (!sub) return;

      if (confirm(`"${sub.name}" ilacını kütüphaneden tamamen silmek istediğinize emin misiniz?\n(Bu ilaca ait tüm geçmiş dozlar da silinecektir.)`)) {
        StorageManager.deleteCustomSubstance(subId);
        UIManager.showToast("İlaç kütüphaneden silindi.", "info");
        self.hideModal("modal-edit-substance");
        
        // UI Güncelle
        self.updateActiveLevels();
        self.render();
        self.updateAnalyticsTab();
      }
    });
  }

  hideModal(modalId) {
    UIManager.hideModal(modalId);
  }
}

// Global uygulama nesnesi oluşturup tarayıcı penceresine bağlıyoruz
const app = new AppController();
window.onload = () => {
  app.init();
};

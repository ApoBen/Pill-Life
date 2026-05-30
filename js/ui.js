/**
 * Pill Life - UI Module (Dinamik Arayüz Yönetimi)
 */

class UIManager {
  constructor() {
    this.activeTimeouts = {};
  }

  // --- SAAT & TARİH GÜNCELLEME ---
  static updateClock() {
    const timeEl = document.getElementById("live-time");
    const dateEl = document.getElementById("live-date");
    if (!timeEl || !dateEl) return;

    const now = new Date();
    
    // Saat/Dakika/Saniye
    timeEl.textContent = now.toTimeString().split(' ')[0];

    // Gün/Ay/Yıl Okunabilir Türkçe Format
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('tr-TR', options);
  }

  // --- DOKÜMAN BAŞLIKLARINI VE MENÜ ETKİNLİĞİNİ GÜNCELLEME ---
  static setPageHeader(title, subtitle) {
    const titleEl = document.getElementById("page-title");
    const subtitleEl = document.getElementById("page-subtitle");
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;
  }

  // --- TOAST BİLDİRİM SİSTEMİ ---
  static showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "✔️";
    if (type === "error") icon = "❌";
    if (type === "info") icon = "ℹ️";

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Animasyon tamamlanınca elementleri DOM'dan tamamen kaldır
    setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  // --- MODAL AÇMA/KAPAMA ---
  static showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden"; // Arka plan kaymasını engelle
    }
  }

  static hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  // --- STATS BANNER GÜNCELLEME ---
  static updateStats(activeCount, highestLevel, lastDoseTime) {
    const activeCountEl = document.getElementById("stat-active-count");
    const highestLevelEl = document.getElementById("stat-highest-level");
    const lastDoseTimeEl = document.getElementById("stat-last-dose-time");

    if (activeCountEl) activeCountEl.textContent = activeCount;
    if (highestLevelEl) highestLevelEl.textContent = highestLevel > 0 ? `%${Math.round(highestLevel)}` : "%0";
    if (lastDoseTimeEl) lastDoseTimeEl.textContent = lastDoseTime || "--:--";
  }

  // --- DASHBOARD (AKTİF KARTLAR) RENDER ---
  static renderDashboard(activeData, onDoseClick, onSettingsClick, onClearDosesClick) {
    const grid = document.getElementById("active-substances-grid");
    if (!grid) return;

    if (activeData.length === 0) {
      grid.innerHTML = `
        <div class="no-data-placeholder">
          <div class="placeholder-icon">💊</div>
          <h3>Şu an vücudunuzda aktif bir madde bulunmuyor</h3>
          <p>Kandaki anlık seviyeleri izlemek için kütüphaneden bir ilaç seçip doz kaydı ekleyin.</p>
          <button class="btn btn-primary" id="btn-dashboard-go-library">İlaç Kütüphanesine Git</button>
        </div>
      `;
      
      const goLibBtn = document.getElementById("btn-dashboard-go-library");
      if (goLibBtn) {
        goLibBtn.addEventListener("click", () => app.navigateTo("library"));
      }
      return;
    }

    grid.innerHTML = "";

    activeData.forEach(item => {
      const { substance, percentage, amountMg, lastDose, hoursSinceLastDose } = item;
      
      // Kart oluşturma
      const card = document.createElement("div");
      card.className = "glass-card active-card";
      card.style.setProperty("--accent", substance.color);
      
      // Yüzdeye göre progres bar genişliği (en fazla %100 veya üst üste alımda daha yüksek)
      const progressWidth = Math.min(percentage, 100);

      // Kategori emojisi
      let catEmoji = "💊";
      if (substance.category === "vitamin") catEmoji = "🧬";
      if (substance.category === "mineral") catEmoji = "🪨";

      // Geçen süre metni
      let timeText = "Az önce";
      if (hoursSinceLastDose >= 1) {
        const h = Math.floor(hoursSinceLastDose);
        const m = Math.round((hoursSinceLastDose - h) * 60);
        timeText = `${h}s ${m > 0 ? m + 'dk' : ''} önce`;
      } else {
        const m = Math.round(hoursSinceLastDose * 60);
        if (m > 0) timeText = `${m} dk önce`;
      }

      card.innerHTML = `
        <div class="card-top">
          <div class="card-meta">
            <span class="category-tag">${catEmoji} ${this.translateCategory(substance.category)}</span>
            <h3 class="substance-name">${substance.name}</h3>
          </div>
          <div class="card-header-actions">
            <button class="card-settings-btn btn-edit-sub" data-id="${substance.id}" title="Düzenle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button class="card-delete-btn btn-clear-doses" data-id="${substance.id}" title="Aktif Dozları Temizle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="card-level-display">
          <div class="level-percentage-container">
            <span class="level-pct" style="color: ${substance.color}">${Math.round(percentage)}%</span>
            <span class="level-label">Kalan Seviye</span>
          </div>
          <div class="level-amount">${amountMg.toFixed(1)} mg</div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-fill" style="width: ${progressWidth}%; background-color: ${substance.color}; color: ${substance.color}"></div>
        </div>

        <div class="card-bottom-info">
          <span class="halflife-indicator">⏱️ t½: ${substance.halfLifeHours}s | 📥 Tmax: ${substance.absorptionTimeHours || 0}s</span>
          <span>Son Doz: ${timeText}</span>
        </div>

        <button class="btn btn-secondary btn-sm btn-quick-dose" data-id="${substance.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Hızlı Doz Al
        </button>
      `;

      // Event listener'ları bağlama
      card.querySelector(".btn-quick-dose").addEventListener("click", () => onDoseClick(substance));
      card.querySelector(".btn-edit-sub").addEventListener("click", () => onSettingsClick(substance));
      card.querySelector(".btn-clear-doses").addEventListener("click", () => onClearDosesClick(substance));

      grid.appendChild(card);
    });
  }

  // --- KÜTÜPHANE RENDER ---
  static renderLibrary(substances, activeSubstanceIds, searchVal = "", activeCat = "all", onDoseClick, onSettingsClick) {
    const grid = document.getElementById("library-grid");
    if (!grid) return;

    grid.innerHTML = "";

    // Filtreleme
    const filtered = substances.filter(sub => {
      // Arama filtresi
      const searchMatch = sub.name.toLowerCase().includes(searchVal.toLowerCase()) || 
                          (sub.activeIngredient && sub.activeIngredient.toLowerCase().includes(searchVal.toLowerCase()));
      
      // Kategori filtresi
      const categoryMatch = activeCat === "all" || sub.category === activeCat;
      
      return searchMatch && categoryMatch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="no-data-placeholder">
          <h3>Aradığınız kriterlere uygun ilaç bulunamadı</h3>
          <p>Farklı bir kelime deneyebilir veya yeni bir ilaç ekleyebilirsiniz.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(sub => {
      const card = document.createElement("div");
      card.className = "glass-card library-card";
      card.style.setProperty("--accent", sub.color);

      let catEmoji = "💊";
      if (sub.category === "vitamin") catEmoji = "🧬";
      if (sub.category === "mineral") catEmoji = "🪨";

      // Vücutta şu an aktif mi?
      const isActive = activeSubstanceIds.includes(sub.id);
      const activeIndicator = isActive ? `<span class="pulse-dot" style="margin-left: 6px;" title="Şu an aktif"></span>` : "";

      card.innerHTML = `
        <div class="library-card-header">
          <div class="card-meta">
            <span class="category-tag">${catEmoji} ${this.translateCategory(sub.category)}</span>
            <h3 class="substance-name" style="display: inline-flex; align-items: center;">
              ${sub.name} ${activeIndicator}
            </h3>
          </div>
          <button class="card-settings-btn btn-edit-sub" data-id="${sub.id}" title="İlaç Ayarları">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        <div class="ingredient-text">
          <strong>Etken Madde:</strong> ${sub.activeIngredient || "Bilinmiyor"}<br>
          <span class="text-muted text-sm">${sub.notes || "Not eklenmemiş."}</span>
        </div>

        <div class="library-card-actions">
          <span class="halflife-badge" style="font-size: 11px;">t½: ${sub.halfLifeHours}s | Tmax: ${sub.absorptionTimeHours || 0}s</span>
          <button class="btn-card-dose btn-dose-add" data-id="${sub.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Doz Al
          </button>
        </div>
      `;

      card.querySelector(".btn-dose-add").addEventListener("click", () => onDoseClick(sub));
      card.querySelector(".btn-edit-sub").addEventListener("click", () => onSettingsClick(sub));

      grid.appendChild(card);
    });
  }

  // --- ANALİTİK FİLTRELERİ RENDER ---
  static renderChartFilters(activeSubstances, visibleSet, onToggle) {
    const container = document.getElementById("chart-substance-filters");
    if (!container) return;

    if (activeSubstances.length === 0) {
      container.innerHTML = `<p class="text-secondary text-sm">Grafikte listelenecek aktif bir ilaç bulunmuyor.</p>`;
      return;
    }

    container.innerHTML = "";

    activeSubstances.forEach(sub => {
      const isChecked = visibleSet.has(sub.id);
      
      const label = document.createElement("label");
      label.className = "checkbox-item";
      
      label.innerHTML = `
        <input type="checkbox" data-id="${sub.id}" ${isChecked ? "checked" : ""}>
        <span class="checkbox-color-indicator" style="background-color: ${sub.color}"></span>
        <span>${sub.name}</span>
      `;

      label.querySelector("input").addEventListener("change", (e) => {
        onToggle(sub.id, e.target.checked);
      });

      container.appendChild(label);
    });
  }

  // --- DOZ GEÇMİŞİ TABLOSU RENDER ---
  static renderHistoryTable(doses, substances, onDeleteClick) {
    const tbody = document.getElementById("history-table-body");
    const noData = document.getElementById("history-no-data");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (doses.length === 0) {
      noData.classList.remove("hidden");
      return;
    }
    noData.classList.add("hidden");

    // En yeni doz üstte görünecek şekilde ters sıralama yap
    const sortedDoses = [...doses].sort((a, b) => b.timestamp - a.timestamp);

    sortedDoses.forEach(dose => {
      const sub = substances.find(s => s.id === dose.substanceId) || {
        name: "Bilinmeyen İlaç",
        color: "#6b7280",
        halfLifeHours: 1
      };

      const date = new Date(dose.timestamp);
      const dateStr = date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const hoursElapsed = (Date.now() - dose.timestamp) / (1000 * 60 * 60);
      const isEliminated = Pharmacokinetics.isEffectivelyEliminated(sub.halfLifeHours, hoursElapsed);

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>
          <span class="flex items-center gap-2">
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:${sub.color}"></span>
            <strong>${sub.name}</strong>
          </span>
        </td>
        <td><span class="font-mono">${dose.doseMg} mg</span></td>
        <td>${dateStr}</td>
        <td>
          ${isEliminated 
            ? '<span class="status-badge status-eliminated">Elenmiş</span>' 
            : '<span class="status-badge status-active">Aktif</span>'}
        </td>
        <td>
          <button class="btn-icon-delete" data-id="${dose.id}" title="Sil">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </td>
      `;

      tr.querySelector(".btn-icon-delete").addEventListener("click", () => onDeleteClick(dose.id));

      tbody.appendChild(tr);
    });
  }

  // --- MODAL İÇİNDEKİ PRESET RENKLERİ OLUŞTURMA ---
  static setupColorPresets(gridId, customColorInputId, selectedColor) {
    const grid = document.getElementById(gridId);
    const customInput = document.getElementById(customColorInputId);
    if (!grid) return;

    grid.innerHTML = "";

    PRESET_COLORS.forEach(color => {
      const dot = document.createElement("div");
      dot.className = `color-dot ${color.toLowerCase() === selectedColor.toLowerCase() ? "selected" : ""}`;
      dot.style.backgroundColor = color;
      dot.style.color = color;
      dot.dataset.color = color;

      dot.addEventListener("click", () => {
        // Eski seçileni kaldır
        grid.querySelectorAll(".color-dot").forEach(d => d.classList.remove("selected"));
        // Yeni seçileni işaretle
        dot.classList.add("selected");
        // Custom color input'u da güncelle
        if (customInput) customInput.value = color;
      });

      grid.appendChild(dot);
    });

    if (customInput) {
      customInput.value = selectedColor;
      customInput.addEventListener("input", (e) => {
        // Custom color seçildiğinde grid'deki seçimleri kaldır
        grid.querySelectorAll(".color-dot").forEach(d => d.classList.remove("selected"));
        // Eşleşen preset varsa onu seçebiliriz
        const matchingDot = grid.querySelector(`.color-dot[data-color="${e.target.value}"]`);
        if (matchingDot) matchingDot.classList.add("selected");
      });
    }
  }

  // --- METİN ÇEVİRİ VE DİL DESTEĞİ ---
  static translateCategory(category) {
    const dict = {
      medicine: "İlaç",
      vitamin: "Vitamin",
      mineral: "Mineral"
    };
    return dict[category] || category;
  }
}

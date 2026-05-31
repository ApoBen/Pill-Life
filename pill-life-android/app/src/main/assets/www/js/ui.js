/**
 * Pill-Life — UI Module
 * DOM manipulation, modals, toasts, rendering
 */


/* ── Modal ── */

export function showModal(title, bodyHTML, onSubmit) {
  const overlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Focus first input
  requestAnimationFrame(() => {
    const firstInput = modalBody.querySelector('input, select');
    if (firstInput) firstInput.focus();
  });

  // Store submit handler
  overlay._onSubmit = onSubmit;
}

export function hideModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  overlay._onSubmit = null;
}

export function getModalFormData() {
  const body = document.getElementById('modal-body');
  const inputs = body.querySelectorAll('[data-field]');
  const data = {};
  inputs.forEach(input => {
    if (input.type === 'checkbox') {
      data[input.dataset.field] = input.checked;
    } else {
      data[input.dataset.field] = input.value;
    }
  });
  return data;
}

/* ── Drug Form HTML ── */

function drugFormHTML(drug = null) {
  const isEdit = !!drug;
  const name = isEdit ? drug.name : '';
  const color = isEdit ? drug.color : '#8b5cf6';
  const doseMg = isEdit ? drug.doseMg : '';
  const absorptionHours = isEdit ? drug.absorptionHours : '1';
  const halfLifeHours = isEdit ? drug.halfLifeHours : '6';
  const notifyOnPeak = isEdit ? (drug.notifyOnPeak || false) : false;
  const scheduleHours = isEdit ? (drug.scheduleHours || 0) : 0;
  const isScheduled = scheduleHours > 0;

  return `
    <div class="form-group">
      <label class="form-label" for="drug-name">İlaç Adı</label>
      <input class="form-input" type="text" id="drug-name" data-field="name"
             value="${name}" placeholder="ör. İbuprofen" required autocomplete="off">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="drug-dose">Doz (mg)</label>
        <input class="form-input" type="number" id="drug-dose" data-field="doseMg"
               value="${doseMg}" placeholder="400" min="1" step="any" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="drug-color">Renk</label>
        <div class="color-input-wrapper">
          <input class="form-color" type="color" id="drug-color" data-field="color" value="${color}">
          <span class="color-preview" style="background:${color}"></span>
        </div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="drug-absorption">Emilim Süresi (saat)</label>
        <input class="form-input" type="number" id="drug-absorption" data-field="absorptionHours"
               value="${absorptionHours}" placeholder="1" min="0.1" step="0.1" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="drug-halflife">Yarı Ömür (saat)</label>
        <input class="form-input" type="number" id="drug-halflife" data-field="halfLifeHours"
               value="${halfLifeHours}" placeholder="6" min="0.1" step="0.1" required>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex: 2;">
        <label class="schedule-toggle" for="drug-scheduled" style="margin-top: 8px; display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
          <input type="checkbox" id="drug-scheduled" ${isScheduled ? 'checked' : ''} style="accent-color: var(--accent-purple);">
          <span class="notify-toggle-label" style="font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);">Düzenli Kullanım Planı</span>
        </label>
      </div>
      <div class="form-group schedule-hours-group" style="flex: 1; ${isScheduled ? '' : 'display: none'}">
        <label class="form-label" for="drug-schedule-hours">Aralık (saat)</label>
        <input class="form-input" type="number" id="drug-schedule-hours" data-field="scheduleHours"
               value="${scheduleHours || '8'}" placeholder="8" min="1" step="0.5">
      </div>
    </div>
    <div class="form-group form-group-show-future" style="margin-top: 8px; ${isScheduled ? '' : 'display: none'}">
      <label class="notify-toggle" for="drug-show-future">
        <input type="checkbox" id="drug-show-future" data-field="showFutureDoses"
               ${isEdit ? (drug.showFutureDoses ? 'checked' : '') : 'checked'}>
        <span class="notify-toggle-slider"></span>
        <span class="notify-toggle-label">Grafikte gelecek tahminlerini göster</span>
      </label>
    </div>
    <div class="form-group form-group-notify">
      <label class="notify-toggle" for="drug-notify">
        <input type="checkbox" id="drug-notify" data-field="notifyOnPeak"
               ${notifyOnPeak ? 'checked' : ''}>
        <span class="notify-toggle-slider"></span>
        <span class="notify-toggle-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Pik seviyede bildirim al
        </span>
      </label>
    </div>
  `;
}

export function showAddDrugModal(onSubmit) {
  showModal('Yeni İlaç Ekle', drugFormHTML(), onSubmit);
}

export function showEditDrugModal(drug, onSubmit) {
  showModal('İlacı Düzenle', drugFormHTML(drug), onSubmit);
}

/* ── Toast ── */

let toastTimeout = null;

export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  
  // Clear existing toasts
  if (toastTimeout) clearTimeout(toastTimeout);
  container.innerHTML = '';

  const icons = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  toastTimeout = setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
}

/* ── Drug Cards ── */

export function renderDrugCards(drugs) {
  const grid = document.getElementById('drug-cards-grid');
  if (!grid) return;

  if (drugs.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        </div>
        <p class="empty-text">Henüz ilaç eklenmedi</p>
        <p class="empty-subtext">Başlamak için "Yeni İlaç Ekle" butonuna tıklayın</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = drugs.map(drug => {
    const bellActive = drug.notifyOnPeak ? 'bell-active' : '';
    return `
    <div class="drug-card" data-drug-id="${drug.id}" style="--drug-color: ${drug.color}">
      <div class="drug-card-header">
        <div class="drug-card-color" style="background: ${drug.color}"></div>
        <div class="drug-card-info">
          <h3 class="drug-card-name">${escapeHtml(drug.name)}</h3>
          <span class="drug-card-dose">${drug.doseMg} mg</span>
        </div>
        <div class="drug-card-actions">
          <button class="btn-icon btn-pin-drug ${drug.pinnedToWidget ? 'pin-active' : ''}" data-action="toggle-pin" data-drug-id="${drug.id}"
                  title="${drug.pinnedToWidget ? 'Widget sabitlemesini kaldır' : 'Widget\'ta sabitle'}" aria-label="Sabitle">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="${drug.pinnedToWidget ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="8" x2="22" y2="12"></line>
              <line x1="12" y1="2" x2="22" y2="12"></line>
              <path d="M12 2L2 12h5l5 5V12l5-5h-5z"></path>
              <line x1="2" y1="22" x2="7" y2="17"></line>
            </svg>
          </button>
          <button class="btn-icon btn-notify-drug ${bellActive}" data-action="toggle-notify" data-drug-id="${drug.id}"
                  title="${drug.notifyOnPeak ? 'Bildirimi kapat' : 'Pik bildirimi aç'}" aria-label="Bildirim">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${drug.notifyOnPeak ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          <button class="btn-icon btn-edit-drug" data-action="edit-drug" data-drug-id="${drug.id}"
                  title="Düzenle" aria-label="Düzenle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon btn-delete-drug" data-action="delete-drug" data-drug-id="${drug.id}"
                  title="Sil" aria-label="Sil">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="drug-card-meta">
        <div class="drug-meta-item">
          <span class="meta-label">Emilim</span>
          <span class="meta-value">${drug.absorptionHours}s</span>
        </div>
        <div class="drug-meta-item">
          <span class="meta-label">Yarı Ömür</span>
          <span class="meta-value">${drug.halfLifeHours}s</span>
        </div>
        ${drug.scheduleHours > 0 ? `
        <div class="drug-meta-item">
          <span class="meta-label">Plan</span>
          <span class="meta-value">Her ${drug.scheduleHours}s</span>
        </div>
        ` : ''}
      </div>
      <button class="btn btn-dose" data-action="take-dose" data-drug-id="${drug.id}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Doz Al
      </button>
    </div>
  `}).join('');
}

/* ── Dose History ── */

export function renderDoseHistory(doses, drugs) {
  const container = document.getElementById('dose-history-list');
  if (!container) return;

  if (doses.length === 0) {
    container.innerHTML = `
      <div class="empty-state empty-state-sm">
        <p class="empty-text">Henüz doz alınmadı</p>
        <p class="empty-subtext">İlaç kartlarındaki "Doz Al" butonunu kullanın</p>
      </div>
    `;
    return;
  }

  // Create drug lookup map
  const drugMap = {};
  drugs.forEach(d => { drugMap[d.id] = d; });

  // Sort doses by time descending
  const sorted = [...doses].sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt));

  // Group by date
  const groups = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  sorted.forEach(dose => {
    const dt = new Date(dose.takenAt);
    let label;
    if (isSameDay(dt, today)) {
      label = 'Bugün';
    } else if (isSameDay(dt, yesterday)) {
      label = 'Dün';
    } else {
      label = dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(dose);
  });

  let html = '';
  for (const [label, groupDoses] of Object.entries(groups)) {
    html += `<div class="history-group">`;
    html += `<div class="history-date-label">${label}</div>`;
    html += `<div class="history-items">`;

    for (const dose of groupDoses) {
      const drug = drugMap[dose.drugId];
      const drugName = drug ? escapeHtml(drug.name) : 'Silinmiş İlaç';
      const drugColor = drug ? drug.color : '#666';
      const time = new Date(dose.takenAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      html += `
        <div class="history-item" data-dose-id="${dose.id}">
          <div class="history-item-line" style="background: ${drugColor}"></div>
          <div class="history-item-dot" style="background: ${drugColor}; box-shadow: 0 0 8px ${drugColor}80"></div>
          <div class="history-item-content">
            <div class="history-item-header">
              <span class="history-drug-name" style="color: ${drugColor}">${drugName}</span>
              <span class="history-dose-amount">${dose.doseMg} mg</span>
            </div>
            <span class="history-time">${time}</span>
          </div>
          <button class="btn-delete-dose" data-action="delete-dose" data-dose-id="${dose.id}"
                  title="Dozu sil" aria-label="Dozu sil">&times;</button>
        </div>
      `;
    }

    html += `</div></div>`;
  }

  container.innerHTML = html;
}

/* ── Helpers ── */

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function showWidgetSettingsModal(drugs, onSubmit) {
  if (drugs.length === 0) {
    showModal(
      'Widget Ayarları',
      '<p style="color: var(--text-secondary); text-align: center; padding: 20px 0;">Widget\'ta sabitlemek için önce en az bir ilaç eklemelisiniz.</p>',
      () => hideModal()
    );
    return;
  }

  const listHTML = drugs.map(drug => {
    return `
      <div class="widget-settings-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="width: 12px; height: 12px; border-radius: 50%; background: ${drug.color}; box-shadow: 0 0 8px ${drug.color}80; display: inline-block;"></span>
          <span style="font-weight: 500; font-size: 0.95rem; color: var(--text-primary);">${escapeHtml(drug.name)}</span>
        </div>
        <label class="notify-toggle" style="margin: 0; cursor: pointer; display: flex; align-items: center;">
          <input type="checkbox" class="widget-drug-pin-checkbox" data-drug-id="${drug.id}" ${drug.pinnedToWidget ? 'checked' : ''} style="display: none;">
          <span class="notify-toggle-slider"></span>
        </label>
      </div>
    `;
  }).join('');

  const bodyHTML = `
    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">
      Widget üzerinde görünmesini istediğiniz ilaçları seçin. Seçilenler üst sırada gösterilecektir.
    </p>
    <div style="max-height: 250px; overflow-y: auto; padding-right: 4px;">
      ${listHTML}
    </div>
  `;

  showModal('Widget Ayarları', bodyHTML, onSubmit);
}

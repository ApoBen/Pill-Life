/**
 * Pill-Life — Main Application
 * Initialization, event wiring, periodic updates, peak notifications
 */

import * as Store from './store.js';
import * as Pharma from './pharma.js';
import { createChart, updateChart, setChartTheme } from './chart.js';
import {
  renderDrugCards,
  renderDoseHistory,
  showAddDrugModal,
  showEditDrugModal,
  hideModal,
  getModalFormData,
  showToast,
  showWidgetSettingsModal,
} from './ui.js';

let chart = null;
let refreshInterval = null;
const scheduledNotifications = new Map(); // doseId → timeoutId

/* ── Init ── */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof AndroidBridge !== 'undefined') {
    document.body.classList.add('android-app');
  } else if ('serviceWorker' in navigator) {
    // Only register Service Worker if we are not in Android app (PWA mode)
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registered', reg))
      .catch(err => console.error('Service Worker registration failed', err));
  }
  
  Store.syncWithNative();
  chart = createChart('pharma-chart');
  refreshAll();
  wireEvents();
  initChartResize();

  // Refresh chart every 60 seconds
  refreshInterval = setInterval(() => {
    refreshChart();
  }, 60000);
});

/* ── Refresh helpers ── */

let currentFilterMode = 'all'; // 'all', '24h', 'custom'
let customStartDate = '';
let customEndDate = '';

function getFilteredDoses(doses) {
  if (currentFilterMode === '24h') {
    const cutoff = Date.now() - 24 * 3600 * 1000;
    return doses.filter(d => new Date(d.takenAt).getTime() >= cutoff);
  } else if (currentFilterMode === 'custom') {
    const start = customStartDate ? new Date(customStartDate + 'T00:00:00').getTime() : 0;
    const end = customEndDate ? new Date(customEndDate + 'T23:59:59').getTime() : Infinity;
    return doses.filter(d => {
      const time = new Date(d.takenAt).getTime();
      return time >= start && time <= end;
    });
  }
  return doses;
}

function refreshAll() {
  const drugs = Store.getDrugs();
  const doses = Store.getDoses();

  renderDrugCards(drugs);
  
  const filtered = getFilteredDoses(doses);
  renderDoseHistory(filtered, drugs);
  refreshChart();
}

function getSelectedHoursRange() {
  const selector = document.getElementById('hours-range');
  return selector ? parseInt(selector.value, 10) : 24;
}

function refreshChart() {
  updateAndroidWidget();

  if (!chart) return;
  const drugs = Store.getDrugs();
  const doses = Store.getDoses();
  const hours = getSelectedHoursRange();
  const { datasets } = Pharma.calculateAllDrugsTimeline(drugs, doses, hours);
  updateChart(chart, datasets, hours);
}

/* ── Chart Resize Widget ── */

function initChartResize() {
  const handle = document.getElementById('chart-resize-handle');
  const wrapper = document.querySelector('.chart-wrapper');
  if (!handle || !wrapper) return;

  let startY = 0;
  let startHeight = 0;
  let isDragging = false;

  function onPointerDown(e) {
    isDragging = true;
    startY = e.clientY || e.touches?.[0]?.clientY || 0;
    startHeight = wrapper.offsetHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    const delta = clientY - startY;
    const newHeight = Math.max(200, Math.min(800, startHeight + delta));
    wrapper.style.height = `${newHeight}px`;
    chart?.resize();
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  handle.addEventListener('mousedown', onPointerDown);
  handle.addEventListener('touchstart', onPointerDown, { passive: false });
  document.addEventListener('mousemove', onPointerMove);
  document.addEventListener('touchmove', onPointerMove, { passive: false });
  document.addEventListener('mouseup', onPointerUp);
  document.addEventListener('touchend', onPointerUp);
}

/* ── Peak Notification System ── */

let permissionResolve = null;
window.onAndroidPermissionResult = (granted) => {
  if (permissionResolve) {
    permissionResolve(granted);
    permissionResolve = null;
  }
};

async function requestNotificationPermission() {
  if (typeof AndroidBridge !== 'undefined') {
    if (AndroidBridge.hasPermission()) {
      return true;
    }
    return new Promise((resolve) => {
      permissionResolve = resolve;
      AndroidBridge.requestPermission();
    });
  }

  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function schedulePeakNotification(drug, dose) {
  if (!drug.notifyOnPeak) return;

  const peakHours = Pharma.calculatePeakTime(drug.absorptionHours, drug.halfLifeHours);
  const takenAt = new Date(dose.takenAt).getTime();
  const peakTimeMs = takenAt + peakHours * 3600 * 1000;
  const delayMs = peakTimeMs - Date.now();

  if (delayMs <= 0) return; // already past peak

  const peakMinutes = Math.round(peakHours * 60);
  const title = `💊 ${drug.name} — Pik Seviye!`;
  const body = `${drug.doseMg}mg dozunuz ${peakMinutes} dakika sonra pik kan seviyesine ulaştı.`;

  if (typeof AndroidBridge !== 'undefined') {
    // Schedule native background alarm
    AndroidBridge.scheduleNotification(dose.id, title, body, delayMs);

    // Also schedule a local timeout to show in-app toast if the app is still open
    const timeoutId = setTimeout(() => {
      scheduledNotifications.delete(dose.id);
      showToast(`🔔 ${drug.name} pik seviyeye ulaştı!`, 'info');
    }, delayMs);
    scheduledNotifications.set(dose.id, timeoutId);
  } else {
    // Standard Web Notification fallback
    const timeoutId = setTimeout(async () => {
      scheduledNotifications.delete(dose.id);

      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        showToast(`🔔 ${drug.name} şu an pik seviyede!`, 'info');
        return;
      }

      new Notification(title, {
        body: body,
        icon: '💊',
        tag: `peak-${dose.id}`,
        requireInteraction: false,
      });

      showToast(`🔔 ${drug.name} pik seviyeye ulaştı!`, 'info');
    }, delayMs);

    scheduledNotifications.set(dose.id, timeoutId);
  }
}

function cancelPeakNotification(doseId) {
  if (typeof AndroidBridge !== 'undefined') {
    AndroidBridge.cancelNotification(doseId);
  }
  const tid = scheduledNotifications.get(doseId);
  if (tid) {
    clearTimeout(tid);
    scheduledNotifications.delete(doseId);
  }
}

function scheduleReminderNotification(drug) {
  if (!drug.scheduleHours || drug.scheduleHours <= 0) return;

  const delayMs = drug.scheduleHours * 3600 * 1000;
  const title = `💊 Doz Zamanı — ${drug.name}`;
  const body = `${drug.name} için yeni doz zamanınız geldi (${drug.doseMg} mg).`;
  const reminderId = `reminder-${drug.id}`;

  if (typeof AndroidBridge !== 'undefined') {
    AndroidBridge.scheduleNotification(reminderId, title, body, delayMs, drug.id, drug.doseMg);
  } else {
    const timeoutId = setTimeout(async () => {
      scheduledNotifications.delete(reminderId);

      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        showToast(`🔔 ${drug.name} doz zamanı!`, 'info');
        return;
      }

      new Notification(title, {
        body: body,
        icon: '💊',
        tag: reminderId,
        requireInteraction: true,
      });

      showToast(`🔔 ${drug.name} doz zamanı!`, 'info');
    }, delayMs);

    scheduledNotifications.set(reminderId, timeoutId);
  }
}

/* ── Event wiring ── */

function wireEvents() {
  // --- Add Drug button ---
  const addDrugBtn = document.getElementById('btn-add-drug');
  if (addDrugBtn) {
    addDrugBtn.addEventListener('click', () => {
      showAddDrugModal(handleAddDrug);
    });
  }

  // --- Widget Settings button ---
  const widgetSettingsBtn = document.getElementById('btn-widget-settings');
  if (widgetSettingsBtn) {
    widgetSettingsBtn.addEventListener('click', () => {
      showWidgetSettingsModal(Store.getDrugs(), handleWidgetSettingsSubmit);
    });
  }

  // --- Modal submit / cancel ---
  const modalSubmitBtn = document.getElementById('modal-submit-btn');
  if (modalSubmitBtn) {
    modalSubmitBtn.addEventListener('click', () => {
      const overlay = document.getElementById('modal-overlay');
      if (overlay._onSubmit) {
        overlay._onSubmit();
      }
    });
  }

  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', hideModal);
  }

  const modalOverlay = document.getElementById('modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) hideModal();
    });
  }

  // --- Keyboard: Escape closes modal ---
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideModal();
  });

  // --- Event delegation for drug cards & history ---
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;

    switch (action) {
      case 'take-dose': {
        const drugId = target.dataset.drugId;
        handleTakeDose(drugId);
        break;
      }
      case 'edit-drug': {
        const drugId = target.dataset.drugId;
        handleEditDrugClick(drugId);
        break;
      }
      case 'delete-drug': {
        const drugId = target.dataset.drugId;
        handleDeleteDrug(drugId);
        break;
      }
      case 'delete-dose': {
        const doseId = target.dataset.doseId;
        handleDeleteDose(doseId);
        break;
      }
      case 'toggle-notify': {
        const drugId = target.dataset.drugId;
        handleToggleNotify(drugId);
        break;
      }
      case 'toggle-pin': {
        const drugId = target.dataset.drugId;
        handleTogglePin(drugId);
        break;
      }
    }
  });

  // --- Color picker live preview ---
  document.addEventListener('input', (e) => {
    if (e.target.id === 'drug-color') {
      const preview = e.target.parentElement.querySelector('.color-preview');
      if (preview) preview.style.background = e.target.value;
    }
  });

  // --- Schedule toggles change listener ---
  document.addEventListener('change', (e) => {
    if (e.target.id === 'drug-scheduled') {
      const hoursGroup = document.querySelector('.schedule-hours-group');
      const showFutureGroup = document.querySelector('.form-group-show-future');
      if (hoursGroup) hoursGroup.style.display = e.target.checked ? 'block' : 'none';
      if (showFutureGroup) showFutureGroup.style.display = e.target.checked ? 'block' : 'none';
    }
  });

  // --- Print report & History filters ---
  document.addEventListener('click', (e) => {

    // Filter - All
    const filterAll = e.target.closest('#btn-filter-all');
    if (filterAll) {
      currentFilterMode = 'all';
      updateFilterButtons(filterAll);
      document.getElementById('date-filter-panel').style.display = 'none';
      refreshAll();
      return;
    }

    // Filter - 24h
    const filter24h = e.target.closest('#btn-filter-24h');
    if (filter24h) {
      currentFilterMode = '24h';
      updateFilterButtons(filter24h);
      document.getElementById('date-filter-panel').style.display = 'none';
      refreshAll();
      return;
    }

    // Filter - Custom
    const filterCustom = e.target.closest('#btn-filter-custom');
    if (filterCustom) {
      const panel = document.getElementById('date-filter-panel');
      const isVisible = panel.style.display === 'flex';
      panel.style.display = isVisible ? 'none' : 'flex';
      updateFilterButtons(filterCustom);
      return;
    }

    // Apply custom date filter
    const applyFilter = e.target.closest('#btn-apply-date-filter');
    if (applyFilter) {
      const startVal = document.getElementById('filter-start-date').value;
      const endVal = document.getElementById('filter-end-date').value;
      if (!startVal && !endVal) {
        showToast('Lütfen tarih girin', 'error');
        return;
      }
      customStartDate = startVal;
      customEndDate = endVal;
      currentFilterMode = 'custom';
      refreshAll();
    }
  });

  function updateFilterButtons(activeBtn) {
    const buttons = document.querySelectorAll('.history-controls button');
    buttons.forEach(btn => {
      if (btn.id !== 'btn-print-report') {
        btn.classList.remove('active');
        btn.classList.add('btn-secondary');
        btn.classList.remove('btn-primary');
      }
    });
    activeBtn.classList.add('active');
    activeBtn.classList.remove('btn-secondary');
    activeBtn.classList.add('btn-primary');
  }

  // --- Hours range selector ---
  const rangeSelector = document.getElementById('hours-range');
  if (rangeSelector) {
    rangeSelector.addEventListener('change', () => {
      refreshChart();
    });
  }
}

/* ── Handlers ── */

function handleAddDrug() {
  const data = getModalFormData();

  if (!data.name || !data.name.trim()) {
    showToast('İlaç adı gerekli', 'error');
    return;
  }
  if (!data.doseMg || Number(data.doseMg) <= 0) {
    showToast('Geçerli bir doz girin', 'error');
    return;
  }
  if (!data.absorptionHours || Number(data.absorptionHours) <= 0) {
    showToast('Geçerli bir emilim süresi girin', 'error');
    return;
  }
  if (!data.halfLifeHours || Number(data.halfLifeHours) <= 0) {
    showToast('Geçerli bir yarı ömür girin', 'error');
    return;
  }

  const isScheduled = document.getElementById('drug-scheduled')?.checked || false;
  const scheduleHours = isScheduled ? Number(data.scheduleHours) : 0;
  const showFutureDoses = isScheduled ? (document.getElementById('drug-show-future')?.checked || false) : false;

  const drug = Store.addDrug({
    name: data.name.trim(),
    color: data.color,
    doseMg: data.doseMg,
    absorptionHours: data.absorptionHours,
    halfLifeHours: data.halfLifeHours,
    notifyOnPeak: data.notifyOnPeak || false,
    scheduleHours: scheduleHours,
    showFutureDoses: showFutureDoses,
  });

  // If notification or schedule enabled, request permission proactively
  if (drug.notifyOnPeak || drug.scheduleHours > 0) {
    requestNotificationPermission();
  }

  hideModal();
  showToast(`${data.name.trim()} eklendi`, 'success');
  refreshAll();
}

function handleEditDrugClick(drugId) {
  const drug = Store.getDrugById(drugId);
  if (!drug) return;

  showEditDrugModal(drug, () => {
    const data = getModalFormData();

    if (!data.name || !data.name.trim()) {
      showToast('İlaç adı gerekli', 'error');
      return;
    }
    if (!data.doseMg || Number(data.doseMg) <= 0) {
      showToast('Geçerli bir doz girin', 'error');
      return;
    }

    const isScheduled = document.getElementById('drug-scheduled')?.checked || false;
    const scheduleHours = isScheduled ? Number(data.scheduleHours) : 0;
    const showFutureDoses = isScheduled ? (document.getElementById('drug-show-future')?.checked || false) : false;

    if (!isScheduled || scheduleHours !== drug.scheduleHours) {
      cancelPeakNotification("reminder-" + drugId);
    }

    Store.updateDrug(drugId, {
      name: data.name.trim(),
      color: data.color,
      doseMg: data.doseMg,
      absorptionHours: data.absorptionHours,
      halfLifeHours: data.halfLifeHours,
      notifyOnPeak: data.notifyOnPeak || false,
      scheduleHours: scheduleHours,
      showFutureDoses: showFutureDoses,
    });

    hideModal();
    showToast(`${data.name.trim()} güncellendi`, 'success');
    refreshAll();
  });
}

function handleTakeDose(drugId) {
  const dose = Store.addDose(drugId);
  if (!dose) {
    showToast('İlaç bulunamadı', 'error');
    return;
  }

  const drug = Store.getDrugById(drugId);
  const name = drug ? drug.name : 'İlaç';
  showToast(`${name} — ${dose.doseMg} mg doz alındı`, 'success');

  // Cancel any outstanding reminder for this drug since we just took it
  cancelPeakNotification("reminder-" + drugId);

  // Schedule peak notification if enabled
  if (drug && drug.notifyOnPeak) {
    schedulePeakNotification(drug, dose);
    const peakHours = Pharma.calculatePeakTime(drug.absorptionHours, drug.halfLifeHours);
    const peakMinutes = Math.round(peakHours * 60);
    showToast(`🔔 ~${peakMinutes}dk sonra pik bildirimi alacaksınız`, 'info');
  }

  // Schedule next scheduled dose reminder if active
  if (drug && drug.scheduleHours > 0) {
    scheduleReminderNotification(drug);
    showToast(`🔔 ~${drug.scheduleHours} saat sonra yeni doz hatırlatması alacaksınız`, 'info');
  }

  // Pulse animation on the card
  const card = document.querySelector(`.drug-card[data-drug-id="${drugId}"]`);
  if (card) {
    card.classList.add('dose-taken-pulse');
    setTimeout(() => card.classList.remove('dose-taken-pulse'), 600);
  }

  refreshAll();
}

function handleDeleteDrug(drugId) {
  const drug = Store.getDrugById(drugId);
  // Cancel any pending peak notifications for this drug's doses
  const doses = Store.getDosesByDrug(drugId);
  doses.forEach(d => cancelPeakNotification(d.id));

  Store.deleteDrug(drugId);
  showToast(`${drug ? drug.name : 'İlaç'} silindi`, 'info');
  refreshAll();
}

function handleDeleteDose(doseId) {
  cancelPeakNotification(doseId);
  Store.deleteDose(doseId);
  showToast('Doz silindi', 'info');
  refreshAll();
}

async function handleToggleNotify(drugId) {
  const drug = Store.getDrugById(drugId);
  if (!drug) return;

  const newState = !drug.notifyOnPeak;

  if (newState) {
    const permitted = await requestNotificationPermission();
    if (!permitted) {
      showToast('Bildirim izni reddedildi. Cihaz ayarlarından izin verin.', 'error');
      return;
    }
  }

  Store.updateDrug(drugId, { notifyOnPeak: newState });
  showToast(
    newState
      ? `🔔 ${drug.name} — pik bildirimi açıldı`
      : `🔕 ${drug.name} — pik bildirimi kapatıldı`,
    'info'
  );
  refreshAll();
}

function handleTogglePin(drugId) {
  const drug = Store.getDrugById(drugId);
  if (!drug) return;

  const newState = !drug.pinnedToWidget;
  Store.updateDrug(drugId, { pinnedToWidget: newState });

  showToast(
    newState
      ? `📌 ${drug.name} — widget'a sabitlendi`
      : `📌 ${drug.name} — sabitleme kaldırıldı`,
    'info'
  );
  refreshAll();
}

/* ── Android Widget Integration ── */

function calculateCurrentDrugLevel(drug, doses) {
  const now = Date.now();
  let totalLevel = 0;
  const drugDoses = doses.filter(d => d.drugId === drug.id);

  for (const dose of drugDoses) {
    const takenAt = new Date(dose.takenAt).getTime();
    const hoursElapsed = (now - takenAt) / (3600 * 1000);
    if (hoursElapsed > 0) {
      totalLevel += Pharma.calculateBloodLevel(
        dose.doseMg,
        hoursElapsed,
        drug.absorptionHours,
        drug.halfLifeHours
      );
    }
  }
  return totalLevel;
}

function updateAndroidWidget() {
  if (typeof AndroidBridge === 'undefined') return;

  const drugs = Store.getDrugs();
  const doses = Store.getDoses();

  const pinnedDrugs = drugs.filter(d => d.pinnedToWidget);
  const usePinnedOnly = pinnedDrugs.length > 0;

  const activeLevels = [];
  for (const drug of drugs) {
    const currentLevel = calculateCurrentDrugLevel(drug, doses);
    const pinned = drug.pinnedToWidget || false;

    if (usePinnedOnly) {
      if (pinned) {
        activeLevels.push({
          id: drug.id,
          name: drug.name,
          color: drug.color,
          doseMg: drug.doseMg,
          level: `${currentLevel.toFixed(1)} mg`,
          pinned: true
        });
      }
    } else {
      if (currentLevel > 0.01) {
        activeLevels.push({
          id: drug.id,
          name: drug.name,
          color: drug.color,
          doseMg: drug.doseMg,
          level: `${currentLevel.toFixed(1)} mg`,
          pinned: false
        });
      }
    }
  }

  // Sort: pinned first, then by concentration level descending
  activeLevels.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return parseFloat(b.level) - parseFloat(a.level);
  });

  // Send to native bridge (all active items)
  AndroidBridge.updateWidgetData(JSON.stringify(activeLevels));
}

function handleWidgetSettingsSubmit() {
  const checkboxes = document.querySelectorAll('.widget-drug-pin-checkbox');

  checkboxes.forEach(cb => {
    const drugId = cb.dataset.drugId;
    Store.updateDrug(drugId, { pinnedToWidget: cb.checked });
  });

  hideModal();
  showToast('Widget ayarları kaydedildi', 'success');
  refreshAll();
}

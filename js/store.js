/**
 * Pill-Life — Store Module
 * localStorage CRUD for drugs and doses
 */

const DRUGS_KEY = 'pilllife_drugs';
const DOSES_KEY = 'pilllife_doses';

/* ── Helpers ── */

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

export function syncWithNative() {
  if (typeof AndroidBridge !== 'undefined' && AndroidBridge.getRawDrugs && AndroidBridge.getRawDoses) {
    try {
      const nativeDrugs = JSON.parse(AndroidBridge.getRawDrugs()) || [];
      const nativeDoses = JSON.parse(AndroidBridge.getRawDoses()) || [];
      if (nativeDrugs.length > 0) {
        localStorage.setItem(DRUGS_KEY, JSON.stringify(nativeDrugs));
      }
      if (nativeDoses.length > 0) {
        localStorage.setItem(DOSES_KEY, JSON.stringify(nativeDoses));
      }
    } catch (e) {
      console.error("Native sync failed", e);
    }
  }
}

function write(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  if (typeof AndroidBridge !== 'undefined' && AndroidBridge.updateRawData) {
    try {
      const drugs = read(DRUGS_KEY);
      const doses = read(DOSES_KEY);
      AndroidBridge.updateRawData(JSON.stringify(drugs), JSON.stringify(doses));
    } catch (e) {
      console.error("Failed to sync raw data to Android", e);
    }
  }
}

/* ── Drugs ── */

/**
 * Drug model:
 * { id, name, color, doseMg, absorptionHours, halfLifeHours, notifyOnPeak, createdAt }
 */

export function getDrugs() {
  return read(DRUGS_KEY);
}

export function getDrugById(id) {
  return getDrugs().find(d => d.id === id) || null;
}

export function addDrug(drug) {
  const drugs = getDrugs();
  const newDrug = {
    id: generateId(),
    name: drug.name,
    color: drug.color || '#8b5cf6',
    doseMg: Number(drug.doseMg),
    absorptionHours: Number(drug.absorptionHours),
    halfLifeHours: Number(drug.halfLifeHours),
    notifyOnPeak: drug.notifyOnPeak || false,
    scheduleHours: Number(drug.scheduleHours || 0),
    showFutureDoses: drug.showFutureDoses || false,
    pinnedToWidget: drug.pinnedToWidget || false,
    createdAt: new Date().toISOString(),
  };
  drugs.push(newDrug);
  write(DRUGS_KEY, drugs);
  return newDrug;
}

export function updateDrug(id, data) {
  const drugs = getDrugs();
  const idx = drugs.findIndex(d => d.id === id);
  if (idx === -1) return null;

  const updated = { ...drugs[idx] };
  if (data.name !== undefined) updated.name = data.name;
  if (data.color !== undefined) updated.color = data.color;
  if (data.doseMg !== undefined) updated.doseMg = Number(data.doseMg);
  if (data.absorptionHours !== undefined) updated.absorptionHours = Number(data.absorptionHours);
  if (data.halfLifeHours !== undefined) updated.halfLifeHours = Number(data.halfLifeHours);
  if (data.notifyOnPeak !== undefined) updated.notifyOnPeak = data.notifyOnPeak;
  if (data.scheduleHours !== undefined) updated.scheduleHours = Number(data.scheduleHours || 0);
  if (data.showFutureDoses !== undefined) updated.showFutureDoses = data.showFutureDoses;
  if (data.pinnedToWidget !== undefined) updated.pinnedToWidget = data.pinnedToWidget;

  drugs[idx] = updated;
  write(DRUGS_KEY, drugs);
  return updated;
}

export function deleteDrug(id) {
  const drugs = getDrugs().filter(d => d.id !== id);
  write(DRUGS_KEY, drugs);
  // Also remove all doses for this drug
  const doses = getDoses().filter(d => d.drugId !== id);
  write(DOSES_KEY, doses);
}

/* ── Doses ── */

/**
 * Dose model:
 * { id, drugId, doseMg, takenAt }
 */

export function getDoses() {
  return read(DOSES_KEY);
}

export function getDosesByDrug(drugId) {
  return getDoses().filter(d => d.drugId === drugId);
}

export function addDose(drugId) {
  const drug = getDrugById(drugId);
  if (!drug) return null;

  const doses = getDoses();
  const newDose = {
    id: generateId(),
    drugId,
    doseMg: drug.doseMg,
    takenAt: new Date().toISOString(),
  };
  doses.push(newDose);
  write(DOSES_KEY, doses);
  return newDose;
}

export function deleteDose(id) {
  const doses = getDoses().filter(d => d.id !== id);
  write(DOSES_KEY, doses);
}

/**
 * Pill Life - Storage Module (localStorage Yönetimi)
 */

const STORAGE_KEYS = {
  DOSES: "pill_life_doses",
  CUSTOM_SUBSTANCES: "pill_life_custom_substances",
  OVERRIDES: "pill_life_substance_overrides"
};

class StorageManager {
  // --- DOZ İŞLEMLERİ (DOSES) ---
  
  static getDoses() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DOSES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Dozlar yüklenirken hata oluştu:", e);
      return [];
    }
  }

  static saveDoses(doses) {
    try {
      localStorage.setItem(STORAGE_KEYS.DOSES, JSON.stringify(doses));
      return true;
    } catch (e) {
      console.error("Dozlar kaydedilirken hata oluştu:", e);
      return false;
    }
  }

  static addDose(substanceId, doseMg, timestamp = Date.now()) {
    const doses = this.getDoses();
    const newDose = {
      id: "dose_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now(),
      substanceId,
      doseMg: parseFloat(doseMg),
      timestamp: parseInt(timestamp)
    };
    doses.push(newDose);
    this.saveDoses(doses);
    return newDose;
  }

  static deleteDose(doseId) {
    let doses = this.getDoses();
    doses = doses.filter(d => d.id !== doseId);
    this.saveDoses(doses);
  }

  // --- ÖZEL İLAÇ İŞLEMLERİ (CUSTOM SUBSTANCES) ---

  static getCustomSubstances() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_SUBSTANCES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Özel ilaçlar yüklenirken hata oluştu:", e);
      return [];
    }
  }

  static saveCustomSubstances(substances) {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_SUBSTANCES, JSON.stringify(substances));
      return true;
    } catch (e) {
      console.error("Özel ilaçlar kaydedilirken hata oluştu:", e);
      return false;
    }
  }

  static addCustomSubstance(substance) {
    const customSubstances = this.getCustomSubstances();
    const newSubstance = {
      ...substance,
      id: "custom_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now(),
      isCustom: true
    };
    customSubstances.push(newSubstance);
    this.saveCustomSubstances(customSubstances);
    return newSubstance;
  }

  static deleteCustomSubstance(substanceId) {
    // Özel ilacı sil
    let customSubstances = this.getCustomSubstances();
    customSubstances = customSubstances.filter(s => s.id !== substanceId);
    this.saveCustomSubstances(customSubstances);

    // O ilaca ait dozları da temizle (veya sakla, hesaplamada görünmesin diye silmek en doğrusu)
    let doses = this.getDoses();
    doses = doses.filter(d => d.substanceId !== substanceId);
    this.saveDoses(doses);

    // Varsa override'ını da sil
    this.deleteOverride(substanceId);
  }

  // --- AYAR / DEĞİŞİKLİK ÜZERİNE YAZMA İŞLEMLERİ (OVERRIDES) ---

  static getOverrides() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OVERRIDES);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error("İlaç ayarları yüklenirken hata oluştu:", e);
      return {};
    }
  }

  static saveOverrides(overrides) {
    try {
      localStorage.setItem(STORAGE_KEYS.OVERRIDES, JSON.stringify(overrides));
      return true;
    } catch (e) {
      console.error("İlaç ayarları kaydedilirken hata oluştu:", e);
      return false;
    }
  }

  static saveOverride(substanceId, data) {
    const overrides = this.getOverrides();
    overrides[substanceId] = {
      ...(overrides[substanceId] || {}),
      ...data
    };
    this.saveOverrides(overrides);
  }

  static deleteOverride(substanceId) {
    const overrides = this.getOverrides();
    if (overrides[substanceId]) {
      delete overrides[substanceId];
      this.saveOverrides(overrides);
    }
  }

  // --- GENEL BİRLEŞİK İLAÇ LİSTESİ ALMA ---

  static getAllSubstances() {
    const custom = this.getCustomSubstances();
    const overrides = this.getOverrides();

    // Hazır ilaçlarla özelleştirilmiş ve yeni eklenmiş olanları birleştirir
    const mergedDefaults = DEFAULT_SUBSTANCES.map(sub => {
      if (overrides[sub.id]) {
        return { ...sub, ...overrides[sub.id] };
      }
      return sub;
    });

    // Özel ilaçlarda da override olabilir (ör. sonradan düzenlenmişse)
    const mergedCustom = custom.map(sub => {
      if (overrides[sub.id]) {
        return { ...sub, ...overrides[sub.id] };
      }
      return sub;
    });

    return [...mergedDefaults, ...mergedCustom];
  }

  static getSubstanceById(id) {
    const all = this.getAllSubstances();
    return all.find(s => s.id === id);
  }
}

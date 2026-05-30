/**
 * Pill Life - Substance Library (Hazır İlaç Veritabanı)
 */

const DEFAULT_SUBSTANCES = [
  {
    id: "metformin",
    name: "Metformin",
    activeIngredient: "Metformin HCl",
    category: "medicine", // medicine, vitamin, mineral
    halfLifeHours: 6.5,
    absorptionTimeHours: 2.5,
    color: "#10b981", // Yeşil
    doseMg: 850,
    notes: "Tip 2 diyabet tedavisi için kullanılır. Genellikle yemeklerle birlikte alınır.",
    isCustom: false
  },
  {
    id: "galvusmet",
    name: "Galvus Met",
    activeIngredient: "Vildagliptin + Metformin",
    category: "medicine",
    halfLifeHours: 3.0,
    absorptionTimeHours: 1.5,
    color: "#8b5cf6", // Mor
    doseMg: 50,
    notes: "Diyabet kontrolü için vildagliptin ve metformin kombinasyonu.",
    isCustom: false
  },
  {
    id: "glifixplus",
    name: "Glifix Plus",
    activeIngredient: "Pioglitazon + Metformin",
    category: "medicine",
    halfLifeHours: 5.0,
    absorptionTimeHours: 2.0,
    color: "#f59e0b", // Kehribar
    doseMg: 15,
    notes: "Pioglitazon ve metformin kombinasyonu, insülin duyarlılığını artırır.",
    isCustom: false
  },
  {
    id: "proviron",
    name: "Proviron",
    activeIngredient: "Mesterolon",
    category: "medicine",
    halfLifeHours: 12.0,
    absorptionTimeHours: 1.5,
    color: "#ef4444", // Kırmızı
    doseMg: 25,
    notes: "Androjen eksikliği tedavisinde kullanılan oral aktif bir hormondur.",
    isCustom: false
  },
  {
    id: "nootropil",
    name: "Nootropil",
    activeIngredient: "Pirasetam",
    category: "medicine",
    halfLifeHours: 5.0,
    absorptionTimeHours: 1.0,
    color: "#3b82f6", // Mavi
    doseMg: 800,
    notes: "Bilişsel fonksiyonları destekleyici (nootropik) bir maddedir.",
    isCustom: false
  },
  {
    id: "lipantyl",
    name: "Lipantyl",
    activeIngredient: "Fenofibrat",
    category: "medicine",
    halfLifeHours: 20.0,
    absorptionTimeHours: 4.0,
    color: "#ec4899", // Pembe
    doseMg: 267,
    notes: "Kolesterol ve trigliserid seviyelerini düşürmeye yardımcı olur.",
    isCustom: false
  },
  {
    id: "paxera",
    name: "Paxera",
    activeIngredient: "Paroksetin",
    category: "medicine",
    halfLifeHours: 21.0,
    absorptionTimeHours: 5.0,
    color: "#6366f1", // İndigo
    doseMg: 20,
    notes: "SSRI grubu antidepresan. Yarı ömrü kişiden kişiye değişebilir.",
    isCustom: false
  },
  {
    id: "aripa",
    name: "Aripa",
    activeIngredient: "Aripiprazol",
    category: "medicine",
    halfLifeHours: 75.0,
    absorptionTimeHours: 4.0,
    color: "#14b8a6", // Teal
    doseMg: 10,
    notes: "Atipik antipsikotik. Yarı ömrü oldukça uzundur (yaklaşık 3 gün).",
    isCustom: false
  },
  {
    id: "urikoliz",
    name: "Ürikoliz",
    activeIngredient: "Febuksostat",
    category: "medicine",
    halfLifeHours: 9.0,
    absorptionTimeHours: 1.5,
    color: "#f97316", // Turuncu
    doseMg: 80,
    notes: "Gut hastalarında ürik asit seviyesini düşürmek amacıyla kullanılır.",
    isCustom: false
  },
  {
    id: "redepra",
    name: "Redepra",
    activeIngredient: "Desvenlafaksin",
    category: "medicine",
    halfLifeHours: 11.0,
    absorptionTimeHours: 6.0,
    color: "#a855f7", // Violet
    doseMg: 50,
    notes: "SNRI grubu antidepresan. Kan basıncı takibi önerilir.",
    isCustom: false
  },
  {
    id: "prednol",
    name: "Prednol",
    activeIngredient: "Prednizolon",
    category: "medicine",
    halfLifeHours: 3.0,
    absorptionTimeHours: 1.5,
    color: "#eab308", // Sarı
    doseMg: 16,
    notes: "Kortikosteroid (iltihap giderici). Sabah saatlerinde alınması önerilir.",
    isCustom: false
  },
  {
    id: "kolsisin",
    name: "Kolşisin",
    activeIngredient: "Kolşisin",
    category: "medicine",
    halfLifeHours: 27.0,
    absorptionTimeHours: 1.0,
    color: "#06b6d4", // Cyan
    doseMg: 0.5,
    notes: "FMF (Ailevi Akdeniz Ateşi) ve gut ataklarının tedavisinde kullanılır.",
    isCustom: false
  }
];

// Uygulama içinde kullanılacak renk paleti seçenekleri
const PRESET_COLORS = [
  "#10b981", // Emerald
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#a855f7", // Purple
  "#eab308", // Yellow
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#84cc16", // Lime
  "#d946ef", // Fuchsia
  "#6b7280"  // Gray
];

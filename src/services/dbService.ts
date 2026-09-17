import { ClassGroup, Assignment } from '../types';
import { INITIAL_CLASSES } from '../data/initialData';

export interface DatabasePayload {
  classes: ClassGroup[];
  assignments: Assignment[];
  availableYears?: string[];
  selectedYear?: string;
}

export interface SaveResult {
  success: boolean;
  message: string;
  error?: string;
}

const LOCAL_STORAGE_BACKUP_KEY = 'srsm_db_cache_v5';

/**
 * Memuatkan rekod dari database server pusat (dikongsi antara Safari iPhone, Chrome Mobile, dan Desktop).
 */
export async function loadRecordsFromDatabase(): Promise<{
  classes: ClassGroup[];
  assignments: Assignment[];
  availableYears: string[];
  selectedYear: string;
}> {
  try {
    const res = await fetch('/api/records', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store', // Pastikan mobile Safari sentiasa dapat data terkini tanpa HTTP 304 stale cache
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data && data.classes && Array.isArray(data.classes)) {
      // Simpan salinan sandaran setempat (offline fallback cache)
      try {
        localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('Gagal menyimpan cache setempat:', e);
      }

      return {
        classes: data.classes,
        assignments: data.assignments || [],
        availableYears: data.availableYears || ['2026', '2027', '2028', '2029'],
        selectedYear: data.selectedYear || '2026',
      };
    }

    throw new Error('Format data tidak sah diterima daripada pelayan.');
  } catch (err: any) {
    console.error('Ralat ketika memuatkan rekod dari pangkalan data:', err);

    // Fallback ke cache setempat jika sambungan pelayan gagal buat sementara waktu
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          classes: parsed.classes || INITIAL_CLASSES,
          assignments: parsed.assignments || [],
          availableYears: parsed.availableYears || ['2026', '2027', '2028', '2029'],
          selectedYear: parsed.selectedYear || '2026',
        };
      }
    } catch {
      // Ignore cache errors
    }

    // Default fallback
    return {
      classes: INITIAL_CLASSES,
      assignments: [],
      availableYears: ['2026', '2027', '2028', '2029'],
      selectedYear: '2026',
    };
  }
}

let isSavingInFlight = false;
let pendingPayload: DatabasePayload | null = null;
let pendingResolvers: Array<(result: SaveResult) => void> = [];

async function executeNetworkSave(payload: DatabasePayload, attempt = 1): Promise<SaveResult> {
  try {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      // Retry once on 500 or network glitch
      if (attempt < 2 && res.status >= 500) {
        await new Promise((r) => setTimeout(r, 400));
        return executeNetworkSave(payload, attempt + 1);
      }
      throw new Error(`Pelayan HTTP ${res.status}: ${errText}`);
    }

    const json = await res.json();
    if (json.success) {
      return {
        success: true,
        message: 'Rekod berjaya disimpan',
      };
    } else {
      throw new Error(json.error || 'Pelayan menolak penyimpanan rekod.');
    }
  } catch (err: any) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 400));
      return executeNetworkSave(payload, attempt + 1);
    }
    console.error('Ralat simpan ke database sebenar:', err);
    return {
      success: false,
      message: 'Gagal menyimpan rekod. Sila cuba semula.',
      error: err?.message || String(err),
    };
  }
}

async function processQueue() {
  if (isSavingInFlight || !pendingPayload) return;

  isSavingInFlight = true;
  const currentPayload = pendingPayload;
  const currentResolvers = [...pendingResolvers];
  pendingPayload = null;
  pendingResolvers = [];

  const result = await executeNetworkSave(currentPayload);

  isSavingInFlight = false;
  currentResolvers.forEach((resolve) => resolve(result));

  // If new updates arrived while the previous request was in flight, process next
  if (pendingPayload) {
    processQueue();
  }
}

/**
 * Menyimpan rekod secara berterusan terus ke database pelayan menggunakan async/await.
 * Menunggu pengesahan daripada database sebelum memaparkan status kejayaan.
 */
export async function saveRecordsToDatabase(payload: DatabasePayload): Promise<SaveResult> {
  // Kemaskini sandaran setempat segera (offline fallback cache)
  try {
    localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Gagal mengemas kini sandaran setempat:', e);
  }

  return new Promise<SaveResult>((resolve) => {
    pendingPayload = payload;
    pendingResolvers.push(resolve);
    processQueue();
  });
}

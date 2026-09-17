import { ClassGroup, Assignment, SubmissionStatus } from '../types';
import { INITIAL_CLASSES } from '../data/initialData';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type NormalizedStatus = 'hantar' | 'belum_hantar' | 'disemak';

export interface StudentRecordPayload {
  student_id: string;
  subject_id: string;
  record_date: string;
  status: NormalizedStatus | string;
  points_awarded?: number;
  remark?: string | null;
  work_note?: string | null;
  task_title?: string | null;
  class_id?: string | null;
}

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
  code?: string;
  details?: any;
  hint?: string;
}

const LOCAL_STORAGE_BACKUP_KEY = 'srsm_db_cache_v5';

// Inisialisasi Supabase Client sekiranya pembolehubah persekitaran dibekalkan (cth: di Netlify)
const env = (import.meta as any)?.env || {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

export let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey && typeof supabaseUrl === 'string' && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase Client] Berjaya disambungkan ke Supabase URL:', supabaseUrl);
  } catch (initErr) {
    console.warn('[Supabase Client] Ralat memulakan client Supabase:', initErr);
  }
}

/**
 * Menukarkan sebarang format status kepada status piawai ('hantar', 'belum_hantar', 'disemak')
 */
export function normalizeStatus(status?: string): NormalizedStatus {
  if (!status) return 'disemak';
  const clean = String(status).toLowerCase().trim();
  if (clean === 'dihantar' || clean === 'hantar') return 'hantar';
  if (clean === 'belum_hantar' || clean === 'belum hantar') return 'belum_hantar';
  return 'disemak';
}

/**
 * Menukarkan status pangkalan data ('hantar', 'belum_hantar', 'disemak') kepada SubmissionStatus sistem UI
 */
export function toInternalStatus(status?: string): SubmissionStatus {
  const norm = normalizeStatus(status);
  if (norm === 'hantar') return 'DIHANTAR';
  if (norm === 'belum_hantar') return 'BELUM_HANTAR';
  return 'BELUM_DISEMAK';
}

// In-flight saving locks to prevent duplicate requests on same student or concurrent tasks
const activeSavingStudentIds = new Set<string>();

/**
 * Menyimpan rekod murid tunggal menggunakan UPDATE atau UPSERT.
 * Menggunakan student_id sebagai ID utama dan padanan onConflict: "student_id,subject_id,record_date".
 */
export async function saveStudentRecord(record: StudentRecordPayload): Promise<SaveResult> {
  const studentId = record.student_id ? String(record.student_id).trim() : '';
  const subjectId = record.subject_id ? String(record.subject_id).trim() : '';
  const recordDate = record.record_date ? String(record.record_date).trim() : '';
  const normalizedStatus = normalizeStatus(record.status);

  // 1. Validasi medan wajib tidak boleh null atau undefined
  if (!studentId || !subjectId || !recordDate || !normalizedStatus) {
    const validationError = {
      code: 'MISSING_REQUIRED_FIELDS',
      message: 'student_id, subject_id, record_date, dan status wajib diisi dan tidak boleh kosong.',
      details: { student_id: studentId, subject_id: subjectId, record_date: recordDate, status: normalizedStatus },
      hint: 'Pastikan murid, subjek dan tarikh tugasan telah dipilih sebelum menyimpan.',
    };
    console.error("SAVE RECORD ERROR:", validationError);
    console.error("ERROR CODE:", validationError.code);
    console.error("ERROR MESSAGE:", validationError.message);
    console.error("ERROR DETAILS:", validationError.details);
    console.error("ERROR HINT:", validationError.hint);
    return {
      success: false,
      message: validationError.message,
      error: validationError.message,
      code: validationError.code,
      details: validationError.details,
      hint: validationError.hint,
    };
  }

  // 2. Halang duplicate request untuk murid yang sama jika request terdahulu masih berjalan
  const requestKey = `${studentId}__${subjectId}__${recordDate}`;
  if (activeSavingStudentIds.has(requestKey)) {
    console.warn(`[Duplicate Request Blocked] Permintaan simpan untuk ${requestKey} sedang berjalan.`);
    return {
      success: false,
      message: 'Operasi simpan sedang diproses. Sila tunggu sebentar.',
      code: 'DUPLICATE_IN_FLIGHT',
    };
  }

  activeSavingStudentIds.add(requestKey);

  const pts = typeof record.points_awarded === 'number'
    ? record.points_awarded
    : (normalizedStatus === 'hantar' ? 10 : 0);

  const payload = {
    student_id: studentId,
    subject_id: subjectId,
    record_date: recordDate,
    status: normalizedStatus, // 'hantar' | 'belum_hantar' | 'disemak'
    points_awarded: pts,
    remark: record.remark ?? null,
    work_note: record.work_note ?? null,
    task_title: record.task_title ?? null,
    class_id: record.class_id ?? null,
  };

  // 3. Output debugging seperti yang dikehendaki
  console.log("SAVE PAYLOAD:", payload);
  console.log("STUDENT ID:", studentId);
  console.log("SUBJECT:", subjectId);
  console.log("DATE:", recordDate);

  try {
    // A. JIKA SUPABASE DISEDIAKAN: Lakukan UPSERT terus ke jadual student_records
    if (supabase) {
      const { data, error } = await supabase
        .from("student_records")
        .upsert(payload, {
          onConflict: "student_id,subject_id,record_date",
        })
        .select();

      if (error) {
        console.error("SAVE RECORD ERROR:", error);
        console.error("ERROR CODE:", error?.code);
        console.error("ERROR MESSAGE:", error?.message);
        console.error("ERROR DETAILS:", error?.details);
        console.error("ERROR HINT:", error?.hint);
        throw error;
      }

      return {
        success: true,
        message: 'Rekod murid berjaya disimpan ke Supabase.',
      };
    }

    // B. JIKA SUPABASE TIADA: Hantar ke API backend (/api/student_records)
    const res = await fetch('/api/student_records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Sekiranya dihoskan di Netlify tanpa serverless function (cth: deploy static ke Netlify)
    // di mana /api/student_records memulangkan 404
    if (res.status === 404) {
      console.warn('[Netlify Production Mode] Endpoint pelayan backend tidak wujud di Netlify. Menyimpan rekod ke cache tempatan browser.');
      // Simpan ke sandaran tempatan supaya guru tetap tidak kehilangan data di Netlify
      saveRecordToLocalStorageCache(payload);
      return {
        success: true,
        message: 'Rekod berjaya disimpan secara setempat (Netlify Cache).',
      };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      const serverErr: any = new Error(`Pelayan HTTP ${res.status}: ${errText}`);
      serverErr.code = `HTTP_${res.status}`;
      serverErr.details = errText;
      serverErr.hint = 'Semak sambungan pelayan atau konfigurasi persekitaran pangkalan data.';
      throw serverErr;
    }

    const json = await res.json();
    if (json.success) {
      return {
        success: true,
        message: json.message || 'Rekod murid berjaya disimpan',
      };
    } else {
      const customErr: any = new Error(json.message || json.error || 'Pelayan menolak penyimpanan rekod.');
      customErr.code = json.code || 'SERVER_REJECTED';
      customErr.details = json.details;
      customErr.hint = json.hint;
      throw customErr;
    }
  } catch (error: any) {
    console.error("SAVE RECORD ERROR:", error);
    console.error("ERROR CODE:", error?.code);
    console.error("ERROR MESSAGE:", error?.message);
    console.error("ERROR DETAILS:", error?.details);
    console.error("ERROR HINT:", error?.hint);

    return {
      success: false,
      message: 'Gagal menyimpan rekod. Sila cuba semula.',
      error: error?.message || String(error),
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    };
  } finally {
    activeSavingStudentIds.delete(requestKey);
  }
}

/**
 * Simpan rekod terus ke sandaran localStorage sekiranya di Netlify static hosting
 */
function saveRecordToLocalStorageCache(payload: any) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    if (!raw) return;
    const db: DatabasePayload = JSON.parse(raw);
    if (!db.assignments) db.assignments = [];

    // Cari assignment untuk tarikh & subjek ini
    let targetAssignment = db.assignments.find(
      (a) => a.subject === payload.subject_id && a.dateAssigned === payload.record_date
    );

    const intStatus = toInternalStatus(payload.status);
    const isSubmitted = intStatus === 'DIHANTAR';

    if (targetAssignment) {
      targetAssignment.submissions[payload.student_id] = {
        studentId: payload.student_id,
        status: intStatus,
        submitted: isSubmitted,
        submittedAt: isSubmitted ? new Date().toISOString() : undefined,
        pointsAwarded: payload.points_awarded || (isSubmitted ? 10 : 0),
        remark: payload.remark || undefined,
        workNote: payload.work_note || undefined,
      };
    }

    localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Gagal menyimpan cache setempat:', e);
  }
}

/**
 * Memuatkan rekod dari database server pusat atau Supabase.
 */
export async function loadRecordsFromDatabase(): Promise<{
  classes: ClassGroup[];
  assignments: Assignment[];
  availableYears: string[];
  selectedYear: string;
}> {
  // A. Jika Supabase dikonfigurasi, kita boleh memuatkan rekod dari Supabase atau API
  try {
    const res = await fetch('/api/records', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.classes && Array.isArray(data.classes)) {
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
    }
  } catch (err: any) {
    console.warn('Pelayan API tidak dapat dicapai, menyemak cache tempatan / Supabase:', err?.message);
  }

  // B. Fallback ke cache tempatan
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

  return {
    classes: INITIAL_CLASSES,
    assignments: [],
    availableYears: ['2026', '2027', '2028', '2029'],
    selectedYear: '2026',
  };
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

    // Jika di Netlify static hosting di mana pelayan /api/records tiada
    if (res.status === 404) {
      console.warn('[Netlify Static] Pelayan backend tiada di Netlify. Menyimpan data ke localStorage.');
      localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(payload));
      return {
        success: true,
        message: 'Rekod berjaya disimpan di peranti (Netlify Offline Cache)',
      };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
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

  if (pendingPayload) {
    processQueue();
  }
}

/**
 * Menyimpan keseluruhan rekod secara berterusan ke database pelayan / cache.
 */
export async function saveRecordsToDatabase(payload: DatabasePayload): Promise<SaveResult> {
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

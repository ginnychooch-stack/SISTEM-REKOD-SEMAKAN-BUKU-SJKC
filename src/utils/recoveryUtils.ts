import { ClassGroup, Assignment, Student } from '../types';

export interface RecoveredSnapshot {
  id: string;
  sourceKey: string;
  timestamp: string;
  classes: ClassGroup[];
  assignments: Assignment[];
  availableYears?: string[];
  selectedYear?: string;
  stats: {
    totalAssignments: number;
    totalSubmissionsMarked: number;
    totalPoints: number;
    totalStars: number;
    classesCount: number;
  };
}

const HISTORICAL_ARCHIVE_KEY = 'srsm_historical_archives_v1';

/**
 * Checks whether a dataset is empty / default (0 points, 0 assignments, no recorded submissions)
 */
export function hasMeaningfulData(classes?: ClassGroup[], assignments?: Assignment[]): boolean {
  if (assignments && assignments.length > 0) {
    // Check if any assignment has submissions marked
    for (const a of assignments) {
      if (!a.submissions) continue;
      for (const sub of Object.values(a.submissions)) {
        if (sub.status === 'DIHANTAR' || sub.status === 'BELUM_HANTAR' || sub.submitted || sub.workNote || sub.remark) {
          return true;
        }
      }
    }
    return true;
  }

  if (classes && classes.length > 0) {
    for (const cls of classes) {
      for (const student of cls.students || []) {
        if ((student.points && student.points > 0) || (student.stars && student.stars > 0)) {
          return true;
        }
        if (student.subjectPoints && Object.values(student.subjectPoints).some((pts) => pts > 0)) {
          return true;
        }
        if (student.subjectStars && Object.values(student.subjectStars).some((st) => st > 0)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Calculate statistical summary of a classes + assignments set
 */
export function calculateDatasetStats(classes: ClassGroup[], assignments: Assignment[]) {
  let totalPoints = 0;
  let totalStars = 0;
  classes.forEach((cls) => {
    cls.students?.forEach((st) => {
      totalPoints += st.points || 0;
      totalStars += st.stars || 0;
    });
  });

  let totalSubmissionsMarked = 0;
  assignments.forEach((a) => {
    if (a.submissions) {
      Object.values(a.submissions).forEach((sub) => {
        if (sub.status === 'DIHANTAR' || sub.status === 'BELUM_HANTAR' || sub.submitted) {
          totalSubmissionsMarked++;
        }
      });
    }
  });

  return {
    totalAssignments: assignments.length,
    totalSubmissionsMarked,
    totalPoints,
    totalStars,
    classesCount: classes.length,
  };
}

/**
 * Save an archival snapshot to prevent future data loss (maintains last 15 snapshots)
 */
export function archiveCurrentSnapshot(
  classes: ClassGroup[],
  assignments: Assignment[],
  label: string = 'Autosave'
): void {
  try {
    if (!hasMeaningfulData(classes, assignments)) return;

    const existingStr = localStorage.getItem(HISTORICAL_ARCHIVE_KEY);
    const existing: RecoveredSnapshot[] = existingStr ? JSON.parse(existingStr) : [];

    const stats = calculateDatasetStats(classes, assignments);
    const newSnapshot: RecoveredSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceKey: `Arkib Simpanan (${label})`,
      timestamp: new Date().toLocaleString('ms-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      classes,
      assignments,
      stats,
    };

    // Keep up to 15 recent snapshots
    const updated = [newSnapshot, ...existing.slice(0, 14)];
    localStorage.setItem(HISTORICAL_ARCHIVE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Gagal menyimpan arkib sejarah:', err);
  }
}

/**
 * Scans ALL localStorage and sessionStorage keys to find ANY recoverable records
 */
export function scanAllStorageForRecoverableData(): RecoveredSnapshot[] {
  const recovered: RecoveredSnapshot[] = [];
  const visitedSignatures = new Set<string>();

  // 1. Check historical archive first
  try {
    const archiveStr = localStorage.getItem(HISTORICAL_ARCHIVE_KEY);
    if (archiveStr) {
      const archives: RecoveredSnapshot[] = JSON.parse(archiveStr);
      if (Array.isArray(archives)) {
        archives.forEach((snap) => {
          if (hasMeaningfulData(snap.classes, snap.assignments)) {
            const sig = `${snap.stats.totalAssignments}-${snap.stats.totalPoints}-${snap.stats.totalSubmissionsMarked}`;
            if (!visitedSignatures.has(sig)) {
              visitedSignatures.add(sig);
              recovered.push(snap);
            }
          }
        });
      }
    }
  } catch (e) {
    console.warn(e);
  }

  // Known candidate key pairs (classes key, assignments key)
  const candidatePairs = [
    { classesKey: 'srsm_classes_v4', assignmentsKey: 'srsm_assignments_v4', label: 'Storan Utama (v4)' },
    { classesKey: 'srsm_classes_v3', assignmentsKey: 'srsm_assignments_v3', label: 'Sandaran Semalam (v3)' },
    { classesKey: 'srsm_classes_v2', assignmentsKey: 'srsm_assignments_v2', label: 'Sandaran Versi 2 (v2)' },
    { classesKey: 'srsm_classes_v1', assignmentsKey: 'srsm_assignments_v1', label: 'Sandaran Versi 1 (v1)' },
    { classesKey: 'srsm_classes', assignmentsKey: 'srsm_assignments', label: 'Sandaran Asal (Tanpa Versi)' },
  ];

  candidatePairs.forEach(({ classesKey, assignmentsKey, label }) => {
    try {
      const cRaw = localStorage.getItem(classesKey);
      const aRaw = localStorage.getItem(assignmentsKey);

      let classes: ClassGroup[] = [];
      let assignments: Assignment[] = [];

      if (cRaw) {
        const parsed = JSON.parse(cRaw);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.students) {
          classes = parsed;
        }
      }
      if (aRaw) {
        const parsed = JSON.parse(aRaw);
        if (Array.isArray(parsed)) {
          assignments = parsed;
        }
      }

      if (hasMeaningfulData(classes, assignments)) {
        const stats = calculateDatasetStats(classes, assignments);
        const sig = `${stats.totalAssignments}-${stats.totalPoints}-${stats.totalSubmissionsMarked}`;
        if (!visitedSignatures.has(sig)) {
          visitedSignatures.add(sig);
          recovered.push({
            id: `rec-${classesKey}`,
            sourceKey: `${label} [${classesKey}]`,
            timestamp: 'Storan Pelayar Tempatan',
            classes,
            assignments,
            stats,
          });
        }
      }
    } catch {}
  });

  // Check cache keys
  const cacheKeys = [
    'srsm_db_cache_v5',
    'srsm_db_cache_v4',
    'srsm_db_cache_v3',
    'srsm_db_cache_v2',
    'srsm_db_cache_v1',
    'srsm_db_cache',
  ];

  cacheKeys.forEach((k) => {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.classes || parsed.assignments)) {
        const classes = Array.isArray(parsed.classes) ? parsed.classes : [];
        const assignments = Array.isArray(parsed.assignments) ? parsed.assignments : [];
        if (hasMeaningfulData(classes, assignments)) {
          const stats = calculateDatasetStats(classes, assignments);
          const sig = `${stats.totalAssignments}-${stats.totalPoints}-${stats.totalSubmissionsMarked}`;
          if (!visitedSignatures.has(sig)) {
            visitedSignatures.add(sig);
            recovered.push({
              id: `rec-${k}`,
              sourceKey: `Cache Pangkalan Data [${k}]`,
              timestamp: 'Cache Luar Talian (Offline Cache)',
              classes,
              assignments,
              availableYears: parsed.availableYears,
              selectedYear: parsed.selectedYear,
              stats,
            });
          }
        }
      }
    } catch {}
  });

  // Brute-force inspection of ALL keys in localStorage for any missed JSON data
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const keyName = localStorage.key(i);
      if (!keyName) continue;
      // Skip keys already examined
      if (
        keyName.startsWith('srsm_classes') ||
        keyName.startsWith('srsm_assignments') ||
        keyName.startsWith('srsm_db_cache') ||
        keyName === HISTORICAL_ARCHIVE_KEY
      ) {
        continue;
      }

      try {
        const val = localStorage.getItem(keyName);
        if (!val || (!val.startsWith('{') && !val.startsWith('['))) continue;
        const parsed = JSON.parse(val);

        let c: ClassGroup[] = [];
        let a: Assignment[] = [];

        if (Array.isArray(parsed)) {
          if (parsed[0]?.students) c = parsed;
          else if (parsed[0]?.submissions) a = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          if (Array.isArray(parsed.classes)) c = parsed.classes;
          if (Array.isArray(parsed.assignments)) a = parsed.assignments;
        }

        if (hasMeaningfulData(c, a)) {
          const stats = calculateDatasetStats(c, a);
          const sig = `${stats.totalAssignments}-${stats.totalPoints}-${stats.totalSubmissionsMarked}`;
          if (!visitedSignatures.has(sig)) {
            visitedSignatures.add(sig);
            recovered.push({
              id: `rec-key-${keyName}`,
              sourceKey: `Kunci Storan [${keyName}]`,
              timestamp: 'Storan Tambahan',
              classes: c,
              assignments: a,
              stats,
            });
          }
        }
      } catch {}
    }
  } catch {}

  // Sort candidates: ones with most marked submissions and points first
  recovered.sort((a, b) => {
    const scoreA = a.stats.totalSubmissionsMarked * 10 + a.stats.totalAssignments * 5 + a.stats.totalPoints;
    const scoreB = b.stats.totalSubmissionsMarked * 10 + b.stats.totalAssignments * 5 + b.stats.totalPoints;
    return scoreB - scoreA;
  });

  return recovered;
}

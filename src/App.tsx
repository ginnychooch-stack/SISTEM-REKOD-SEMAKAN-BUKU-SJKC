import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  INITIAL_CLASSES, 
  INITIAL_ASSIGNMENTS, 
  getMainSubjectsForGrade 
} from './data/initialData';
import { 
  ActiveTab, 
  Assignment, 
  BookType, 
  ClassGroup, 
  RemarkType, 
  SubmissionItem, 
  SubmissionStatus 
} from './types';
import { Header } from './components/Header';
import { RecordView } from './components/RecordView';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { RewardRoom } from './components/RewardRoom';
import { NewTaskModal } from './components/NewTaskModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { RecoveryModal } from './components/RecoveryModal';
import { RotateCcw, Shield, CheckCircle2, AlertTriangle, X, History } from 'lucide-react';
import { 
  loadRecordsFromDatabase, 
  saveRecordsToDatabase, 
  saveStudentRecord 
} from './services/dbService';
import { 
  hasMeaningfulData, 
  scanAllStorageForRecoverableData, 
  archiveCurrentSnapshot 
} from './utils/recoveryUtils';
import { getSubmissionStatus, getNextStatus } from './utils/statusUtils';

const sumNumbers = (obj?: Record<string, number>): number => {
  if (!obj) return 0;
  return Object.values(obj).reduce<number>((acc, val) => acc + (Number(val) || 0), 0);
};

const STORAGE_CLASSES_KEY = 'srsm_classes_v4';
const STORAGE_ASSIGNMENTS_KEY = 'srsm_assignments_v4';
const STORAGE_SOUND_KEY = 'srsm_sound_v1';
const STORAGE_YEAR_KEY = 'srsm_active_year_v1';
const STORAGE_AVAILABLE_YEARS_KEY = 'srsm_available_years_v1';

export default function App() {
  // Load stored state or use initial zeroed data
  const [classes, setClasses] = useState<ClassGroup[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CLASSES_KEY);
      if (saved) {
        const parsed: ClassGroup[] = JSON.parse(saved);
        return parsed.map((c) => ({
          ...c,
          teacherName: 'Choo Chee Hong',
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_CLASSES;
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ASSIGNMENTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ASSIGNMENTS;
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SOUND_KEY);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return true;
  });

  // Default to Tahun 1A to highlight Year 1 subjects immediately
  const [selectedClassId, setSelectedClassId] = useState<string>('class-1a');
  const [selectedSubject, setSelectedSubject] = useState<string>('Bahasa Melayu');
  const [activeTab, setActiveTab] = useState<ActiveTab>('rekod');
  const [activeAssignmentId, setActiveAssignmentId] = useState<string>('');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // Admin and Academic Year states
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('srsm_admin_auth') === 'true';
  });
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const [availableYears, setAvailableYears] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AVAILABLE_YEARS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return ['2026', '2027', '2028', '2029'];
  });

  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return localStorage.getItem(STORAGE_YEAR_KEY) || '2026';
  });

  // Database persistence state & notification
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [dbNotification, setDbNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

  // Synchronous Refs to prevent stale closure data loss and race conditions during rapid taps
  const classesRef = useRef<ClassGroup[]>(classes);
  const assignmentsRef = useRef<Assignment[]>(assignments);
  const availableYearsRef = useRef<string[]>(availableYears);
  const selectedYearRef = useRef<string>(selectedYear);
  const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    classesRef.current = classes;
  }, [classes]);
  useEffect(() => {
    assignmentsRef.current = assignments;
  }, [assignments]);
  useEffect(() => {
    availableYearsRef.current = availableYears;
  }, [availableYears]);
  useEffect(() => {
    selectedYearRef.current = selectedYear;
  }, [selectedYear]);

  // Load from Central Server Database or Local Storage Safely on Mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await loadRecordsFromDatabase();
        if (!isMounted) return;

        const serverHasData = hasMeaningfulData(data.classes, data.assignments);
        const localHasData = hasMeaningfulData(classesRef.current, assignmentsRef.current);

        if (serverHasData) {
          // Server has active data
          if (data.classes && data.classes.length > 0) {
            classesRef.current = data.classes;
            setClasses(data.classes);
          }
          if (data.assignments && data.assignments.length > 0) {
            assignmentsRef.current = data.assignments;
            setAssignments(data.assignments);
          }
          if (data.availableYears && data.availableYears.length > 0) {
            availableYearsRef.current = data.availableYears;
            setAvailableYears(data.availableYears);
          }
          if (data.selectedYear) {
            selectedYearRef.current = data.selectedYear;
            setSelectedYear(data.selectedYear);
          }
          archiveCurrentSnapshot(data.classes, data.assignments, 'Server Load');
        } else if (localHasData) {
          // Server restarted or empty, but local device has records!
          // NEVER wipe local data with blank server data.
          console.warn('[Safe Sync] Pangkalan data pelayan kosong. Memelihara data tempatan dan menyegerakkan semula...');
          archiveCurrentSnapshot(classesRef.current, assignmentsRef.current, 'Penyelamatan Tempatan');
          await saveRecordsToDatabase({
            classes: classesRef.current,
            assignments: assignmentsRef.current,
            availableYears: availableYearsRef.current,
            selectedYear: selectedYearRef.current,
          });
        } else {
          // Both current server and active local storage key appear empty.
          // AUTO-SCAN all browser storage for previous version keys (v3, v2, cache, etc.)
          console.log('[Recovery Auto-Scan] Mengimbas storan pelayar bagi mencari rekod terdahulu...');
          const candidates = scanAllStorageForRecoverableData();
          if (candidates.length > 0) {
            const best = candidates[0];
            console.log('[Auto-Recovered] Rekod sandaran ditemui daripada:', best.sourceKey);
            classesRef.current = best.classes;
            assignmentsRef.current = best.assignments;
            setClasses(best.classes);
            setAssignments(best.assignments);
            if (best.availableYears) {
              availableYearsRef.current = best.availableYears;
              setAvailableYears(best.availableYears);
            }
            if (best.selectedYear) {
              selectedYearRef.current = best.selectedYear;
              setSelectedYear(best.selectedYear);
            }

            // Immediately persist recovered data to current keys and backend
            triggerSave(best.classes, best.assignments, best.availableYears, best.selectedYear, true);
            archiveCurrentSnapshot(best.classes, best.assignments, 'Dipulihkan Automatik');

            setDbNotification({
              type: 'success',
              message: `Rekod semalam berjaya dipulihkan secara automatik (${best.stats.totalAssignments} tugasan, ${best.stats.totalSubmissionsMarked} semakan)!`,
            });
            setTimeout(() => setDbNotification(null), 8000);
          }
        }
      } catch (err) {
        console.error('Ralat memuatkan rekod dari database:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronously update state and persist to backend
  const triggerSave = useCallback((
    nextClasses: ClassGroup[],
    nextAssignments: Assignment[],
    customYears?: string[],
    customSelectedYear?: string,
    immediate = false
  ): Promise<boolean> => {
    // 1. Immediately update refs & React state for 0ms lag
    classesRef.current = nextClasses;
    assignmentsRef.current = nextAssignments;
    if (customYears) availableYearsRef.current = customYears;
    if (customSelectedYear) selectedYearRef.current = customSelectedYear;

    setClasses(nextClasses);
    setAssignments(nextAssignments);
    if (customYears) setAvailableYears(customYears);
    if (customSelectedYear) setSelectedYear(customSelectedYear);

    // 2. Immediate local cache & snapshot archive
    try {
      localStorage.setItem(STORAGE_CLASSES_KEY, JSON.stringify(nextClasses));
      localStorage.setItem(STORAGE_ASSIGNMENTS_KEY, JSON.stringify(nextAssignments));
      if (customYears) localStorage.setItem(STORAGE_AVAILABLE_YEARS_KEY, JSON.stringify(customYears));
      if (customSelectedYear) localStorage.setItem(STORAGE_YEAR_KEY, customSelectedYear);
      archiveCurrentSnapshot(nextClasses, nextAssignments, 'Simpanan Auto');
    } catch {}

    // 3. Clear existing debounce timer
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
      saveDebounceTimerRef.current = null;
    }

    const doPersist = async (): Promise<boolean> => {
      setIsSavingDb(true);
      try {
        const result = await saveRecordsToDatabase({
          classes: classesRef.current,
          assignments: assignmentsRef.current,
          availableYears: availableYearsRef.current,
          selectedYear: selectedYearRef.current,
        });

        if (result.success) {
          setDbNotification({ type: 'success', message: 'Rekod berjaya disimpan' });
          setTimeout(() => {
            setDbNotification((prev) => (prev?.message === 'Rekod berjaya disimpan' ? null : prev));
          }, 3000);
          return true;
        } else {
          console.error('Ralat menyimpan rekod ke database:', result.error);
          setDbNotification({ type: 'error', message: 'Gagal menyimpan rekod. Sila cuba semula.' });
          setTimeout(() => {
            setDbNotification((prev) => (prev?.type === 'error' ? null : prev));
          }, 4500);
          return false;
        }
      } catch (err) {
        console.error('Ralat simpan ke database sebenar:', err);
        setDbNotification({ type: 'error', message: 'Gagal menyimpan rekod. Sila cuba semula.' });
        setTimeout(() => {
          setDbNotification((prev) => (prev?.type === 'error' ? null : prev));
        }, 4500);
        return false;
      } finally {
        setIsSavingDb(false);
      }
    };

    if (immediate) {
      return doPersist();
    } else {
      return new Promise<boolean>((resolve) => {
        saveDebounceTimerRef.current = setTimeout(async () => {
          const ok = await doPersist();
          resolve(ok);
        }, 200);
      });
    }
  }, []);

  const handleRestoreFromRecovery = async (data: {
    classes: ClassGroup[];
    assignments: Assignment[];
    availableYears?: string[];
    selectedYear?: string;
  }) => {
    const nextClasses = data.classes && data.classes.length > 0 ? data.classes : classesRef.current;
    const nextAssignments = data.assignments || [];
    const nextYears = data.availableYears || availableYearsRef.current;
    const nextYear = data.selectedYear || selectedYearRef.current;

    await triggerSave(nextClasses, nextAssignments, nextYears, nextYear, true);
    archiveCurrentSnapshot(nextClasses, nextAssignments, 'Pemulihan Pengguna');
    setDbNotification({
      type: 'success',
      message: `Rekod berjaya dipulihkan (${nextAssignments.length} tugasan, ${nextClasses.length} kelas)!`,
    });
    setTimeout(() => setDbNotification(null), 5000);
  };

  // Helper function to persist changes to the backend database
  const persistChanges = async (
    nextClasses: ClassGroup[],
    nextAssignments: Assignment[],
    customYears?: string[],
    customSelectedYear?: string
  ): Promise<boolean> => {
    return await triggerSave(nextClasses, nextAssignments, customYears, customSelectedYear, true);
  };

  // Current class
  const currentClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  // Keep selectedSubject valid for currentClass
  useEffect(() => {
    const available = getMainSubjectsForGrade(currentClass.grade);
    if (!available.includes(selectedSubject)) {
      setSelectedSubject(available[0] || 'Bahasa Melayu');
    }
  }, [currentClass.id, currentClass.grade, selectedSubject]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CLASSES_KEY, JSON.stringify(classes));
    } catch (e) {
      console.error(e);
    }
  }, [classes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ASSIGNMENTS_KEY, JSON.stringify(assignments));
    } catch (e) {
      console.error(e);
    }
  }, [assignments]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SOUND_KEY, JSON.stringify(soundEnabled));
    } catch (e) {
      console.error(e);
    }
  }, [soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_AVAILABLE_YEARS_KEY, JSON.stringify(availableYears));
    } catch (e) {
      console.error(e);
    }
  }, [availableYears]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_YEAR_KEY, selectedYear);
    } catch (e) {
      console.error(e);
    }
  }, [selectedYear]);

  // Admin handlers
  const handleOpenAdmin = () => {
    if (isAdmin) {
      setIsAdminPanelOpen(true);
    } else {
      setIsAdminAuthOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    setIsAdmin(true);
    sessionStorage.setItem('srsm_admin_auth', 'true');
    setIsAdminAuthOpen(false);
    setIsAdminPanelOpen(true);
  };

  const handleLogoutAdmin = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('srsm_admin_auth');
    setIsAdminPanelOpen(false);
  };

  const handleAddYear = (newYear: string) => {
    if (!availableYears.includes(newYear)) {
      setAvailableYears((prev) => [...prev, newYear].sort());
    }
  };

  const handleSelectYear = (yr: string) => {
    setSelectedYear(yr);
    if (yr !== 'all') {
      const classesInYear = classes.filter((c) => c.year === yr);
      if (classesInYear.length > 0 && !classesInYear.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(classesInYear[0].id);
      }
    }
  };

  const handleUpdateClasses = (updatedClasses: ClassGroup[]) => {
    setClasses(updatedClasses);
    const allYears = Array.from(
      new Set([...availableYears, ...updatedClasses.map((c) => c.year)])
    ).sort();
    setAvailableYears(allYears);
  };

  // Available assignments for current class & selected subject
  const currentClassSubjectAssignments = assignments.filter(
    (a) => a.classId === selectedClassId && a.subject === selectedSubject
  );

  const activeAssignment: Assignment | null =
    currentClassSubjectAssignments.find((a) => a.id === activeAssignmentId) ||
    currentClassSubjectAssignments[0] ||
    null;

  // Handler to create or update active task title & book type & date (debounced for typing)
  const handleCreateOrUpdateTask = async (
    title: string, 
    bookType: BookType, 
    dateAssigned?: string,
    forceAsNew = false
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const targetDate = dateAssigned || today;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    let nextAssignments = [...assignmentsRef.current];
    const currentClsSubjectAssignments = nextAssignments.filter(
      (a) => a.classId === selectedClassId && a.subject === selectedSubject
    );
    const active = (!forceAsNew && activeAssignmentId)
      ? currentClsSubjectAssignments.find((a) => a.id === activeAssignmentId)
      : null;

    if (active && active.subject === selectedSubject && active.classId === selectedClassId) {
      nextAssignments = nextAssignments.map((a) =>
        a.id === active.id ? { ...a, title, bookType, dateAssigned: targetDate } : a
      );
    } else {
      // Create new assignment record for this subject
      const newId = `task-${selectedClassId}-${selectedSubject.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      const initialSubs: Record<string, SubmissionItem> = {};
      currentClass.students.forEach((s) => {
        initialSubs[s.id] = {
          studentId: s.id,
          status: 'BELUM_DISEMAK',
          submitted: false,
          pointsAwarded: 0,
        };
      });

      const newTask: Assignment = {
        id: newId,
        classId: selectedClassId,
        subject: selectedSubject,
        title: title || `Semakan ${selectedSubject} (${targetDate.split('-').reverse().join('/')})`,
        bookType,
        dateAssigned: targetDate,
        dueDate: tomorrow,
        pointsValue: 10,
        submissions: initialSubs,
      };

      nextAssignments = [newTask, ...nextAssignments];
      setActiveAssignmentId(newId);
    }

    // Debounced triggerSave to avoid server flooding while typing
    await triggerSave(classesRef.current, nextAssignments, undefined, undefined, false);
  };

  // Dedicated Save handler triggered by "Simpan Rekod Semakan" button
  const handleSaveActiveRecord = async (
    title: string, 
    bookType: BookType, 
    dateAssigned: string,
    saveAsNew = false
  ): Promise<boolean> => {
    let nextAssignments = [...assignmentsRef.current];
    const currentClsSubjectAssignments = nextAssignments.filter(
      (a) => a.classId === selectedClassId && a.subject === selectedSubject
    );
    const active = (!saveAsNew && activeAssignmentId)
      ? currentClsSubjectAssignments.find((a) => a.id === activeAssignmentId)
      : null;

    if (active && active.subject === selectedSubject && active.classId === selectedClassId) {
      nextAssignments = nextAssignments.map((a) =>
        a.id === active.id ? { ...a, title, bookType, dateAssigned } : a
      );
    } else {
      // Save as brand new assignment record without overwriting previous records
      const newId = `task-${selectedClassId}-${selectedSubject.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      // Preserve student submission state that teacher just marked on screen
      const currentDisplayedTask = currentClsSubjectAssignments.find((a) => a.id === activeAssignmentId) || currentClsSubjectAssignments[0];
      const initialSubs: Record<string, SubmissionItem> = {};
      currentClass.students.forEach((s) => {
        const existingSub = currentDisplayedTask?.submissions?.[s.id];
        if (existingSub) {
          initialSubs[s.id] = { ...existingSub };
        } else {
          initialSubs[s.id] = { studentId: s.id, status: 'BELUM_DISEMAK', submitted: false, pointsAwarded: 0 };
        }
      });

      const newTask: Assignment = {
        id: newId,
        classId: selectedClassId,
        subject: selectedSubject,
        title: title || `Semakan ${selectedSubject} (${dateAssigned.split('-').reverse().join('/')})`,
        bookType,
        dateAssigned,
        dueDate: tomorrow,
        pointsValue: 10,
        submissions: initialSubs,
      };

      nextAssignments = [newTask, ...nextAssignments];
      setActiveAssignmentId(newId);
    }

    return await triggerSave(classesRef.current, nextAssignments, undefined, undefined, true);
  };

  // Handler to start a fresh blank task record for the subject
  const handleNewTaskRequest = () => {
    const today = new Date().toISOString().split('T')[0];
    const formattedDate = today.split('-').reverse().join('/');
    const newId = `task-${selectedClassId}-${selectedSubject.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const initialSubs: Record<string, SubmissionItem> = {};
    currentClass.students.forEach((s) => {
      initialSubs[s.id] = {
        studentId: s.id,
        status: 'BELUM_DISEMAK',
        submitted: false,
        pointsAwarded: 0,
      };
    });

    const newTask: Assignment = {
      id: newId,
      classId: selectedClassId,
      subject: selectedSubject,
      title: `Semakan ${selectedSubject} (${formattedDate})`,
      bookType: 'Buku Latihan (Tulis/Kira)',
      dateAssigned: today,
      dueDate: tomorrow,
      pointsValue: 10,
      submissions: initialSubs,
    };

    const nextAssignments = [newTask, ...assignmentsRef.current];
    setActiveAssignmentId(newId);
    triggerSave(classesRef.current, nextAssignments, undefined, undefined, true);
  };

  // Toggle single student's submission status through 3-state cycle:
  // BELUM_DISEMAK -> DIHANTAR -> BELUM_HANTAR -> BELUM_DISEMAK
  const handleToggleSubmission = async (
    studentId: string, 
    nextExplicitStatus?: SubmissionStatus,
    taskMeta?: { title?: string; bookType?: BookType; date?: string }
  ): Promise<boolean> => {
    let nextAssignments = [...assignmentsRef.current];
    const currentClsSubjectAssignments = nextAssignments.filter(
      (a) => a.classId === selectedClassId && a.subject === selectedSubject
    );
    let targetAssignment = currentClsSubjectAssignments.find((a) => a.id === activeAssignmentId) || currentClsSubjectAssignments[0];

    // If activeAssignment doesn't exist yet for current class & subject, auto-create it
    if (!targetAssignment) {
      const newId = `task-${selectedClassId}-${selectedSubject.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const initialSubs: Record<string, SubmissionItem> = {};
      currentClass.students.forEach((s) => {
        initialSubs[s.id] = {
          studentId: s.id,
          status: 'BELUM_DISEMAK',
          submitted: false,
          pointsAwarded: 0,
        };
      });

      targetAssignment = {
        id: newId,
        classId: selectedClassId,
        subject: selectedSubject,
        title: taskMeta?.title || `Semakan ${selectedSubject}`,
        bookType: taskMeta?.bookType || 'Buku Latihan (Tulis/Kira)',
        dateAssigned: taskMeta?.date || today,
        dueDate: tomorrow,
        pointsValue: 10,
        submissions: initialSubs,
      };

      nextAssignments = [targetAssignment, ...nextAssignments];
      setActiveAssignmentId(newId);
    } else if (taskMeta?.title && targetAssignment.title !== taskMeta.title) {
      targetAssignment = {
        ...targetAssignment,
        title: taskMeta.title,
        bookType: taskMeta.bookType || targetAssignment.bookType,
        dateAssigned: taskMeta.date || targetAssignment.dateAssigned,
      };
    }

    const currentSub = targetAssignment.submissions[studentId];
    const currentStatus: SubmissionStatus = getSubmissionStatus(currentSub);

    let nextStatus: SubmissionStatus;
    if (nextExplicitStatus) {
      nextStatus = nextExplicitStatus;
    } else {
      nextStatus = getNextStatus(currentStatus);
    }

    const wasFullSubmitted = currentStatus === 'DIHANTAR';
    const isNowFullSubmitted = nextStatus === 'DIHANTAR';
    const isBookSubmitted = nextStatus === 'DIHANTAR' || nextStatus === 'TIDAK_SIAP';
    const pts = isNowFullSubmitted ? (targetAssignment.pointsValue || 10) : 0;
    const taskSubject = targetAssignment.subject || selectedSubject;
    const recordDate = taskMeta?.date || targetAssignment.dateAssigned || new Date().toISOString().split('T')[0];
    const normStatus = 
      nextStatus === 'DIHANTAR' ? 'hantar' :
      nextStatus === 'TIDAK_SIAP' ? 'tidak_siap' :
      nextStatus === 'BELUM_HANTAR' ? 'belum_hantar' : 'disemak';

    // 1. Simpan rekod murid terus ke pangkalan data (UPSERT berasaskan student_id, subject_id, record_date)
    const activeIncompleteNote = currentSub?.incompleteNote || currentSub?.workNote || null;
    const saveResult = await saveStudentRecord({
      student_id: studentId,
      subject_id: taskSubject,
      record_date: recordDate,
      status: normStatus,
      points_awarded: pts,
      remark: currentSub?.remark || null,
      work_note: currentSub?.workNote || null,
      incomplete_note: nextStatus === 'TIDAK_SIAP' ? activeIncompleteNote : (currentSub?.incompleteNote || null),
      task_title: taskMeta?.title || targetAssignment.title || `Semakan ${taskSubject}`,
      class_id: selectedClassId,
    });

    // 2. JIKA SAVE GAGAL: Jangan update paparan UI sebagai berjaya! Kekalkan status asal pada kad.
    if (!saveResult.success) {
      setDbNotification({
        type: 'error',
        message: saveResult.message || 'Gagal menyimpan rekod. Sila cuba semula.',
      });
      setTimeout(() => {
        setDbNotification((prev) => (prev?.type === 'error' ? null : prev));
      }, 4500);
      return false;
    }

    // 3. JIKA BERJAYA: Kemas kini data submission tugasan dalam memori
    nextAssignments = nextAssignments.map((a) => {
      if (a.id !== targetAssignment!.id) return a;
      return {
        ...a,
        submissions: {
          ...a.submissions,
          [studentId]: {
            studentId,
            status: nextStatus,
            submitted: isBookSubmitted,
            submittedAt: isBookSubmitted ? (currentSub?.submittedAt || new Date().toISOString()) : undefined,
            pointsAwarded: pts,
            remark: currentSub?.remark,
            workNote: currentSub?.workNote,
            incompleteNote: nextStatus === 'TIDAK_SIAP' ? (currentSub?.incompleteNote || currentSub?.workNote) : currentSub?.incompleteNote,
          },
        },
      };
    });

    // Update student subject points & stars (Data per subjek diasingkan sepenuhnya)
    let nextClasses = classesRef.current;
    if (wasFullSubmitted !== isNowFullSubmitted) {
      nextClasses = classesRef.current.map((cls) => {
        if (cls.id !== selectedClassId) return cls;
        return {
          ...cls,
          students: cls.students.map((st) => {
            if (st.id !== studentId) return st;
            const currentSubjPoints = st.subjectPoints?.[taskSubject] || 0;
            const currentSubjStars = st.subjectStars?.[taskSubject] || 0;
            const pointDiff = isNowFullSubmitted ? (targetAssignment!.pointsValue || 10) : -(targetAssignment!.pointsValue || 10);
            const starDiff = isNowFullSubmitted ? 1 : -1;
            const nextSubjPoints = Math.max(0, currentSubjPoints + pointDiff);
            const nextSubjStars = Math.max(0, currentSubjStars + starDiff);

            const updatedSubjectPoints = {
              ...(st.subjectPoints || {}),
              [taskSubject]: nextSubjPoints,
            };
            const updatedSubjectStars = {
              ...(st.subjectStars || {}),
              [taskSubject]: nextSubjStars,
            };

            // Total overall points is sum across subjects
            const totalPoints = sumNumbers(updatedSubjectPoints);
            const totalStars = sumNumbers(updatedSubjectStars);

            return {
              ...st,
              points: totalPoints,
              stars: totalStars,
              subjectPoints: updatedSubjectPoints,
              subjectStars: updatedSubjectStars,
            };
          }),
        };
      });
    }

    // Kemaskini state memori
    setAssignments(nextAssignments);
    assignmentsRef.current = nextAssignments;
    if (wasFullSubmitted !== isNowFullSubmitted) {
      setClasses(nextClasses);
      classesRef.current = nextClasses;
    }

    // Simpan sandaran keseluruhan secara asynchronous di latar belakang tanpa menghalang UI
    saveRecordsToDatabase({
      classes: nextClasses,
      assignments: nextAssignments,
      availableYears: availableYearsRef.current,
      selectedYear: selectedYearRef.current,
    }).catch((err) => {
      console.warn('Latar belakang penyelarasan keseluruhan gagal:', err);
    });

    return true;
  };

  // Update teacher remark on a submission
  const handleUpdateRemark = async (studentId: string, remark: RemarkType) => {
    let nextAssignments = [...assignmentsRef.current];
    const currentClsSubjectAssignments = nextAssignments.filter(
      (a) => a.classId === selectedClassId && a.subject === selectedSubject
    );
    const target = currentClsSubjectAssignments.find((a) => a.id === activeAssignmentId) || currentClsSubjectAssignments[0];
    if (!target) return;

    nextAssignments = nextAssignments.map((a) => {
      if (a.id !== target.id) return a;
      const existing = a.submissions[studentId] || {
        studentId,
        status: 'BELUM_DISEMAK',
        submitted: false,
        pointsAwarded: 0,
      };
      return {
        ...a,
        submissions: {
          ...a.submissions,
          [studentId]: {
            ...existing,
            remark: remark || undefined,
          },
        },
      };
    });

    await triggerSave(classesRef.current, nextAssignments, undefined, undefined, false);
  };

  // Update student work note / ruang menaip kerja murid
  const handleUpdateWorkNote = async (studentId: string, workNote: string) => {
    let nextAssignments = [...assignmentsRef.current];
    const currentClsSubjectAssignments = nextAssignments.filter(
      (a) => a.classId === selectedClassId && a.subject === selectedSubject
    );
    const target = currentClsSubjectAssignments.find((a) => a.id === activeAssignmentId) || currentClsSubjectAssignments[0];
    if (!target) return;

    nextAssignments = nextAssignments.map((a) => {
      if (a.id !== target.id) return a;
      const existing = a.submissions[studentId] || {
        studentId,
        status: 'BELUM_DISEMAK',
        submitted: false,
        pointsAwarded: 0,
      };
      return {
        ...a,
        submissions: {
          ...a.submissions,
          [studentId]: {
            ...existing,
            workNote: workNote,
            incompleteNote: existing.status === 'TIDAK_SIAP' ? workNote : existing.incompleteNote,
          },
        },
      };
    });

    await triggerSave(classesRef.current, nextAssignments, undefined, undefined, false);
  };

  // Mark all students as submitted for active task
  const handleMarkAllSubmitted = async () => {
    let nextAssignments = [...assignmentsRef.current];
    const currentClsSubjectAssignments = nextAssignments.filter(
      (a) => a.classId === selectedClassId && a.subject === selectedSubject
    );
    const target = currentClsSubjectAssignments.find((a) => a.id === activeAssignmentId) || currentClsSubjectAssignments[0];
    if (!target) return;

    const pts = target.pointsValue || 10;
    const taskSubject = target.subject || selectedSubject;
    const updatedSubmissions: Record<string, SubmissionItem> = {
      ...target.submissions,
    };
    const nowIso = new Date().toISOString();
    const studentsGainedPoints: Record<string, number> = {};

    currentClass.students.forEach((student) => {
      const currentSub = target.submissions[student.id];
      const wasFullySubmitted = currentSub?.status === 'DIHANTAR';
      if (!wasFullySubmitted) {
        studentsGainedPoints[student.id] = pts;
      }
      updatedSubmissions[student.id] = {
        studentId: student.id,
        status: 'DIHANTAR',
        submitted: true,
        submittedAt: nowIso,
        pointsAwarded: pts,
        remark: currentSub?.remark,
        workNote: currentSub?.workNote,
        incompleteNote: currentSub?.incompleteNote,
      };
    });

    nextAssignments = nextAssignments.map((a) =>
      a.id === target.id ? { ...a, submissions: updatedSubmissions } : a
    );

    const nextClasses = classesRef.current.map((cls) => {
      if (cls.id !== selectedClassId) return cls;
      return {
        ...cls,
        students: cls.students.map((st) => {
          const extra = studentsGainedPoints[st.id] || 0;
          const currentSubjPoints = st.subjectPoints?.[taskSubject] || 0;
          const currentSubjStars = st.subjectStars?.[taskSubject] || 0;
          const nextSubjPoints = currentSubjPoints + extra;
          const nextSubjStars = currentSubjStars + (extra > 0 ? 1 : 0);

          const updatedSubjectPoints = {
            ...(st.subjectPoints || {}),
            [taskSubject]: nextSubjPoints,
          };
          const updatedSubjectStars = {
            ...(st.subjectStars || {}),
            [taskSubject]: nextSubjStars,
          };

          const totalPoints = sumNumbers(updatedSubjectPoints);
          const totalStars = sumNumbers(updatedSubjectStars);

          return {
            ...st,
            points: totalPoints,
            stars: totalStars,
            subjectPoints: updatedSubjectPoints,
            subjectStars: updatedSubjectStars,
          };
        }),
      };
    });

    await triggerSave(nextClasses, nextAssignments, undefined, undefined, true);
  };

  // Reset all submissions for active task back to BELUM_DISEMAK
  const handleResetSubmissions = async () => {
    let nextAssignments = [...assignmentsRef.current];
    const currentClsSubjectAssignments = nextAssignments.filter(
      (a) => a.classId === selectedClassId && a.subject === selectedSubject
    );
    const target = currentClsSubjectAssignments.find((a) => a.id === activeAssignmentId) || currentClsSubjectAssignments[0];
    if (!target) return;

    const taskSubject = target.subject || selectedSubject;
    const studentsLostPoints: Record<string, number> = {};

    currentClass.students.forEach((student) => {
      const sub = target.submissions[student.id];
      if (sub?.status === 'DIHANTAR') {
        studentsLostPoints[student.id] = sub.pointsAwarded || target.pointsValue || 10;
      }
    });

    nextAssignments = nextAssignments.map((a) => {
      if (a.id !== target.id) return a;
      const resetSubs: Record<string, SubmissionItem> = {};
      currentClass.students.forEach((s) => {
        resetSubs[s.id] = { studentId: s.id, status: 'BELUM_DISEMAK', submitted: false, pointsAwarded: 0 };
      });
      return { ...a, submissions: resetSubs };
    });

    const nextClasses = classesRef.current.map((cls) => {
      if (cls.id !== selectedClassId) return cls;
      return {
        ...cls,
        students: cls.students.map((st) => {
          const lost = studentsLostPoints[st.id] || 0;
          const currentSubjPoints = st.subjectPoints?.[taskSubject] || 0;
          const currentSubjStars = st.subjectStars?.[taskSubject] || 0;
          const nextSubjPoints = Math.max(0, currentSubjPoints - lost);
          const nextSubjStars = Math.max(0, currentSubjStars - (lost > 0 ? 1 : 0));

          const updatedSubjectPoints = {
            ...(st.subjectPoints || {}),
            [taskSubject]: nextSubjPoints,
          };
          const updatedSubjectStars = {
            ...(st.subjectStars || {}),
            [taskSubject]: nextSubjStars,
          };

          const totalPoints = sumNumbers(updatedSubjectPoints);
          const totalStars = sumNumbers(updatedSubjectStars);

          return {
            ...st,
            points: totalPoints,
            stars: totalStars,
            subjectPoints: updatedSubjectPoints,
            subjectStars: updatedSubjectStars,
          };
        }),
      };
    });

    await triggerSave(nextClasses, nextAssignments, undefined, undefined, true);
  };

  // Create new task from Modal
  const handleCreateTask = async (taskData: Omit<Assignment, 'id' | 'submissions'>) => {
    const newId = `task-${Date.now()}`;
    const initialSubs: Record<string, SubmissionItem> = {};
    currentClass.students.forEach((s) => {
      initialSubs[s.id] = { studentId: s.id, status: 'BELUM_DISEMAK', submitted: false, pointsAwarded: 0 };
    });

    const newTask: Assignment = {
      ...taskData,
      id: newId,
      submissions: initialSubs,
    };

    const nextAssignments = [newTask, ...assignmentsRef.current];
    setSelectedSubject(taskData.subject);
    setActiveAssignmentId(newId);
    setActiveTab('rekod');
    await triggerSave(classesRef.current, nextAssignments, undefined, undefined, true);
  };

  // Add bonus points strictly to specific subject
  const handleAddStudentPoints = async (studentId: string, amount: number, subject: string) => {
    const nextClasses = classesRef.current.map((cls) => {
      if (cls.id !== selectedClassId) return cls;
      return {
        ...cls,
        students: cls.students.map((s) => {
          if (s.id !== studentId) return s;
          const currentSubjPoints = s.subjectPoints?.[subject] || 0;
          const nextSubjPoints = currentSubjPoints + amount;
          const updatedSubjectPoints = {
            ...(s.subjectPoints || {}),
            [subject]: nextSubjPoints,
          };
          const totalPoints = sumNumbers(updatedSubjectPoints);
          return {
            ...s,
            points: totalPoints,
            subjectPoints: updatedSubjectPoints,
          };
        }),
      };
    });
    await triggerSave(nextClasses, assignmentsRef.current, undefined, undefined, false);
  };

  // Deduct points (e.g. redemption) strictly from specific subject
  const handleDeductStudentPoints = async (studentId: string, amount: number, subject: string) => {
    const nextClasses = classesRef.current.map((cls) => {
      if (cls.id !== selectedClassId) return cls;
      return {
        ...cls,
        students: cls.students.map((s) => {
          if (s.id !== studentId) return s;
          const currentSubjPoints = s.subjectPoints?.[subject] || 0;
          const nextSubjPoints = Math.max(0, currentSubjPoints - amount);
          const updatedSubjectPoints = {
            ...(s.subjectPoints || {}),
            [subject]: nextSubjPoints,
          };
          const totalPoints = sumNumbers(updatedSubjectPoints);
          return {
            ...s,
            points: totalPoints,
            subjectPoints: updatedSubjectPoints,
          };
        }),
      };
    });
    await triggerSave(nextClasses, assignmentsRef.current, undefined, undefined, false);
  };

  // Reset all to clean initial state
  const handleRestoreDemoData = async () => {
    if (confirm('Adakah anda ingin mengembalikan data asal dan set semula sistem?')) {
      localStorage.clear();
      setSelectedClassId('class-1a');
      setSelectedSubject('Bahasa Melayu');
      setActiveAssignmentId('');
      setSelectedYear('2026');
      setAvailableYears(['2026', '2027', '2028', '2029']);
      await persistChanges(INITIAL_CLASSES, INITIAL_ASSIGNMENTS, ['2026', '2027', '2028', '2029'], '2026');
    }
  };

  const handleRestoreBackup = async (backup: {
    classes: ClassGroup[];
    assignments: Assignment[];
    availableYears?: string[];
    selectedYear?: string;
  }) => {
    const nextClasses = backup.classes && backup.classes.length > 0 ? backup.classes : classes;
    const nextAssignments = backup.assignments || assignments;
    const nextYears = backup.availableYears && backup.availableYears.length > 0 ? backup.availableYears : availableYears;
    const nextYear = backup.selectedYear || selectedYear;

    if (backup.classes && backup.classes.length > 0) {
      setSelectedClassId(backup.classes[0].id);
    }
    await persistChanges(nextClasses, nextAssignments, nextYears, nextYear);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* Database Persistence Notification Toast (Z-index 9999, non-blocking) */}
      {dbNotification && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none px-4 w-full max-w-md"
        >
          <div
            className={`pointer-events-auto px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-sm font-bold text-white border transition-all ${
              dbNotification.type === 'success'
                ? 'bg-emerald-600 border-emerald-400/90 shadow-emerald-950/30'
                : 'bg-rose-600 border-rose-400/90 shadow-rose-950/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {dbNotification.type === 'success' ? (
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </span>
              ) : (
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </span>
              )}
              <span className="text-sm font-extrabold">{dbNotification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setDbNotification(null)}
              className="text-white/80 hover:text-white text-xs p-1 rounded-lg bg-black/20 hover:bg-black/30 cursor-pointer touch-manipulation flex items-center justify-center"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Visual Header with Subject Selection & Hero Banner */}
      <Header
        currentTab={activeTab}
        onTabChange={setActiveTab}
        classes={classes}
        selectedClassId={selectedClassId}
        onSelectClass={(id) => {
          setSelectedClassId(id);
          const cls = classes.find((c) => c.id === id);
          if (cls) {
            const available = getMainSubjectsForGrade(cls.grade);
            setSelectedSubject(available[0] || 'Bahasa Melayu');
          }
        }}
        selectedSubject={selectedSubject}
        onSelectSubject={setSelectedSubject}
        activeAssignment={activeAssignment}
        onOpenNewTaskModal={() => setIsNewTaskModalOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        selectedYear={selectedYear}
        onSelectYear={handleSelectYear}
        availableYears={availableYears}
        isAdmin={isAdmin}
        onOpenAdmin={handleOpenAdmin}
        onOpenRecovery={() => setIsRecoveryModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'rekod' && (
          <RecordView
            currentClass={currentClass}
            selectedSubject={selectedSubject}
            onSelectSubject={setSelectedSubject}
            activeAssignment={activeAssignment}
            assignments={currentClassSubjectAssignments}
            onSelectAssignment={setActiveAssignmentId}
            onCreateOrUpdateTask={handleCreateOrUpdateTask}
            onNewTaskRequest={handleNewTaskRequest}
            onToggleSubmission={handleToggleSubmission}
            onUpdateRemark={handleUpdateRemark}
            onUpdateWorkNote={handleUpdateWorkNote}
            onMarkAllSubmitted={handleMarkAllSubmitted}
            onResetSubmissions={handleResetSubmissions}
            soundEnabled={soundEnabled}
            isSaving={isSavingDb}
            onSaveRecord={handleSaveActiveRecord}
            onOpenRecovery={() => setIsRecoveryModalOpen(true)}
          />
        )}

        {activeTab === 'prestasi' && (
          <PerformanceDashboard
            currentClass={currentClass}
            assignments={assignments}
            selectedSubject={selectedSubject}
            onSelectSubject={setSelectedSubject}
          />
        )}

        {activeTab === 'ganjaran' && (
          <RewardRoom
            currentClass={currentClass}
            selectedSubject={selectedSubject}
            onSelectSubject={setSelectedSubject}
            onAddStudentPoints={handleAddStudentPoints}
            onDeductStudentPoints={handleDeductStudentPoints}
            soundEnabled={soundEnabled}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2.5 text-slate-600">
            <span className="font-bold text-slate-800">Sistem Rekod Semakan Buku</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span>
              Dibangunkan untuk <strong className="text-indigo-900 font-bold">Cikgu Ginny Choo</strong> <span className="text-indigo-600 font-semibold">- Ginny Ai Lab</span>
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="font-medium text-slate-500">
              Hak Cipta Terpelihara • SJK(C) Alor Pongsu
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRestoreDemoData}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors font-medium cursor-pointer"
              title="Set semula data"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Set Semula Data</span>
            </button>

            <button
              onClick={handleOpenAdmin}
              className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                isAdmin ? 'text-indigo-600 hover:text-indigo-800' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Panel Pentadbir"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Admin Aktif' : 'Log Masuk Admin'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* New Task Creation Modal */}
      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        currentClass={currentClass}
        selectedSubject={selectedSubject}
        onCreateTask={handleCreateTask}
      />

      {/* Admin Authentication Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Admin Panel Drawer / Modal */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        classes={classes}
        onUpdateClasses={handleUpdateClasses}
        selectedYear={selectedYear}
        onSelectYear={handleSelectYear}
        availableYears={availableYears}
        onAddYear={handleAddYear}
        selectedClassId={selectedClassId}
        onSelectClass={setSelectedClassId}
        assignments={assignments}
        onRestoreBackup={handleRestoreBackup}
        onLogout={handleLogoutAdmin}
      />

      {/* Pusat Pemulihan Rekod Modal */}
      <RecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        onRestore={handleRestoreFromRecovery}
      />
    </div>
  );
}

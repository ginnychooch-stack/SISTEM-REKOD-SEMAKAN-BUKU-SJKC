import React, { useState, useEffect } from 'react';
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
import { RotateCcw, Shield } from 'lucide-react';

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

  // Handler to create or update active task title & book type & date
  const handleCreateOrUpdateTask = (title: string, bookType: BookType, dateAssigned?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const targetDate = dateAssigned || today;
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    if (activeAssignment && activeAssignment.subject === selectedSubject && activeAssignment.classId === selectedClassId) {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === activeAssignment.id ? { ...a, title, bookType, dateAssigned: targetDate } : a
        )
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
        title,
        bookType,
        dateAssigned: targetDate,
        dueDate: tomorrow,
        pointsValue: 10,
        submissions: initialSubs,
      };

      setAssignments((prev) => [newTask, ...prev]);
      setActiveAssignmentId(newId);
    }
  };

  // Handler to start a fresh blank task record for the subject
  const handleNewTaskRequest = () => {
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

    const newTask: Assignment = {
      id: newId,
      classId: selectedClassId,
      subject: selectedSubject,
      title: '',
      bookType: 'Buku Latihan (Tulis/Kira)',
      dateAssigned: today,
      dueDate: tomorrow,
      pointsValue: 10,
      submissions: initialSubs,
    };

    setAssignments((prev) => [newTask, ...prev]);
    setActiveAssignmentId(newId);
  };

  // Toggle single student's submission status through 3-state cycle:
  // BELUM_DISEMAK -> DIHANTAR -> BELUM_HANTAR -> BELUM_DISEMAK
  const handleToggleSubmission = (studentId: string, nextExplicitStatus?: SubmissionStatus) => {
    if (!activeAssignment) return;

    const currentSub = activeAssignment.submissions[studentId];
    const currentStatus: SubmissionStatus = 
      (currentSub?.status === 'DIHANTAR' || currentSub?.status === 'BELUM_HANTAR' || currentSub?.status === 'BELUM_DISEMAK')
        ? currentSub.status
        : currentSub?.submitted ? 'DIHANTAR' : 'BELUM_DISEMAK';

    let nextStatus: SubmissionStatus;
    if (nextExplicitStatus) {
      nextStatus = nextExplicitStatus;
    } else {
      if (currentStatus === 'BELUM_DISEMAK') nextStatus = 'DIHANTAR';
      else if (currentStatus === 'DIHANTAR') nextStatus = 'BELUM_HANTAR';
      else nextStatus = 'BELUM_DISEMAK';
    }

    const wasSubmitted = currentStatus === 'DIHANTAR';
    const isNowSubmitted = nextStatus === 'DIHANTAR';
    const pts = activeAssignment.pointsValue || 10;
    const taskSubject = activeAssignment.subject || selectedSubject;

    // Update assignment submission
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== activeAssignment.id) return a;
        return {
          ...a,
          submissions: {
            ...a.submissions,
            [studentId]: {
              studentId,
              status: nextStatus,
              submitted: isNowSubmitted,
              submittedAt: isNowSubmitted ? (currentSub?.submittedAt || new Date().toISOString()) : undefined,
              pointsAwarded: isNowSubmitted ? pts : 0,
              remark: currentSub?.remark,
              workNote: currentSub?.workNote,
            },
          },
        };
      })
    );

    // Update student subject points & stars (Data per subjek diasingkan sepenuhnya)
    if (wasSubmitted !== isNowSubmitted) {
      setClasses((prevClasses) =>
        prevClasses.map((cls) => {
          if (cls.id !== selectedClassId) return cls;
          return {
            ...cls,
            students: cls.students.map((st) => {
              if (st.id !== studentId) return st;
              const currentSubjPoints = st.subjectPoints?.[taskSubject] || 0;
              const currentSubjStars = st.subjectStars?.[taskSubject] || 0;
              const pointDiff = isNowSubmitted ? pts : -pts;
              const starDiff = isNowSubmitted ? 1 : -1;
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
        })
      );
    }
  };

  // Update teacher remark on a submission
  const handleUpdateRemark = (studentId: string, remark: RemarkType) => {
    if (!activeAssignment) return;

    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== activeAssignment.id) return a;
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
      })
    );
  };

  // Update student work note / ruang menaip kerja murid
  const handleUpdateWorkNote = (studentId: string, workNote: string) => {
    if (!activeAssignment) return;

    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== activeAssignment.id) return a;
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
            },
          },
        };
      })
    );
  };

  // Mark all students as submitted for active task
  const handleMarkAllSubmitted = () => {
    if (!activeAssignment) return;

    const pts = activeAssignment.pointsValue || 10;
    const taskSubject = activeAssignment.subject || selectedSubject;
    const updatedSubmissions: Record<string, SubmissionItem> = {
      ...activeAssignment.submissions,
    };
    const nowIso = new Date().toISOString();
    const studentsGainedPoints: Record<string, number> = {};

    currentClass.students.forEach((student) => {
      const currentSub = activeAssignment.submissions[student.id];
      const wasSubmitted = currentSub?.status === 'DIHANTAR' || !!currentSub?.submitted;
      if (!wasSubmitted) {
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
      };
    });

    setAssignments((prev) =>
      prev.map((a) => (a.id === activeAssignment.id ? { ...a, submissions: updatedSubmissions } : a))
    );

    setClasses((prevClasses) =>
      prevClasses.map((cls) => {
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
      })
    );
  };

  // Reset all submissions for active task back to BELUM_DISEMAK
  const handleResetSubmissions = () => {
    if (!activeAssignment) return;

    const taskSubject = activeAssignment.subject || selectedSubject;
    const studentsLostPoints: Record<string, number> = {};

    currentClass.students.forEach((student) => {
      const sub = activeAssignment.submissions[student.id];
      if (sub?.submitted || sub?.status === 'DIHANTAR') {
        studentsLostPoints[student.id] = sub.pointsAwarded || activeAssignment.pointsValue || 10;
      }
    });

    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== activeAssignment.id) return a;
        const resetSubs: Record<string, SubmissionItem> = {};
        currentClass.students.forEach((s) => {
          resetSubs[s.id] = { studentId: s.id, status: 'BELUM_DISEMAK', submitted: false, pointsAwarded: 0 };
        });
        return { ...a, submissions: resetSubs };
      })
    );

    setClasses((prevClasses) =>
      prevClasses.map((cls) => {
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
      })
    );
  };

  // Create new task from Modal
  const handleCreateTask = (taskData: Omit<Assignment, 'id' | 'submissions'>) => {
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

    setAssignments((prev) => [newTask, ...prev]);
    setSelectedSubject(taskData.subject);
    setActiveAssignmentId(newId);
    setActiveTab('rekod');
  };

  // Add bonus points strictly to specific subject
  const handleAddStudentPoints = (studentId: string, amount: number, subject: string) => {
    setClasses((prev) =>
      prev.map((cls) => {
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
      })
    );
  };

  // Deduct points (e.g. redemption) strictly from specific subject
  const handleDeductStudentPoints = (studentId: string, amount: number, subject: string) => {
    setClasses((prev) =>
      prev.map((cls) => {
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
      })
    );
  };

  // Reset all to clean initial state
  const handleRestoreDemoData = () => {
    if (confirm('Adakah anda ingin mengembalikan data asal dan set semula sistem?')) {
      localStorage.clear();
      setClasses(INITIAL_CLASSES);
      setAssignments(INITIAL_ASSIGNMENTS);
      setSelectedClassId('class-1a');
      setSelectedSubject('Bahasa Melayu');
      setActiveAssignmentId('');
      setSelectedYear('2026');
      setAvailableYears(['2026', '2027', '2028', '2029']);
    }
  };

  const handleRestoreBackup = (backup: {
    classes: ClassGroup[];
    assignments: Assignment[];
    availableYears?: string[];
    selectedYear?: string;
  }) => {
    if (backup.classes && backup.classes.length > 0) {
      setClasses(backup.classes);
      setSelectedClassId(backup.classes[0].id);
    }
    if (backup.assignments) {
      setAssignments(backup.assignments);
    }
    if (backup.availableYears && backup.availableYears.length > 0) {
      setAvailableYears(backup.availableYears);
    }
    if (backup.selectedYear) {
      setSelectedYear(backup.selectedYear);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
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
    </div>
  );
}

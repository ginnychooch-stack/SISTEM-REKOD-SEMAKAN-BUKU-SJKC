import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Search, 
  MessageSquare, 
  CheckCheck, 
  RotateCcw, 
  Sparkles, 
  Star, 
  BookMarked, 
  PenTool, 
  Clock, 
  AlertCircle, 
  XCircle,
  PlusCircle,
  Save,
  BookOpen,
  Calendar,
  History,
  Check,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Assignment, BookType, ClassGroup, RemarkType, Student, SubmissionStatus } from '../types';
import { REMARKS_LIST, getMainSubjectsForGrade } from '../data/initialData';
import { playSuccessDing, playToggleOff, playCelebrationFanfare } from '../utils/audio';
import { getSubmissionStatus, getNextStatus } from '../utils/statusUtils';

interface RecordViewProps {
  currentClass: ClassGroup;
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
  activeAssignment: Assignment | null;
  assignments: Assignment[]; // Assignments for current class & subject
  onSelectAssignment: (assignmentId: string) => void;
  onCreateOrUpdateTask: (title: string, bookType: BookType, dateAssigned?: string) => void;
  onNewTaskRequest: () => void;
  onToggleSubmission: (
    studentId: string, 
    nextStatus?: SubmissionStatus,
    taskMeta?: { title: string; bookType: BookType; date: string }
  ) => void;
  onUpdateRemark: (studentId: string, remark: RemarkType) => void;
  onUpdateWorkNote?: (studentId: string, workNote: string) => void;
  onMarkAllSubmitted: () => void;
  onResetSubmissions: () => void;
  soundEnabled: boolean;
  isSaving?: boolean;
  onSaveRecord?: (title: string, bookType: BookType, dateAssigned: string, saveAsNew?: boolean) => Promise<boolean>;
  onOpenRecovery?: () => void;
}

const BOOK_TYPES: BookType[] = [
  'Buku Latihan (Tulis/Kira)',
  'Buku Aktiviti/Modul',
  'Lembaran Kerja / Worksheet',
  'Buku Nota / Rumusan',
  'Buku Teks',
];

export const RecordView: React.FC<RecordViewProps> = ({
  currentClass,
  selectedSubject,
  onSelectSubject,
  activeAssignment,
  assignments,
  onSelectAssignment,
  onCreateOrUpdateTask,
  onNewTaskRequest,
  onToggleSubmission,
  onUpdateRemark,
  onUpdateWorkNote,
  onMarkAllSubmitted,
  onResetSubmissions,
  soundEnabled,
  isSaving,
  onSaveRecord,
  onOpenRecovery,
}) => {
  const availableSubjects = getMainSubjectsForGrade(currentClass.grade);

  // Task title, book type, and date inputs
  const [taskTitle, setTaskTitle] = useState(activeAssignment?.title || '');
  const [bookType, setBookType] = useState<BookType>(
    activeAssignment?.bookType || 'Buku Latihan (Tulis/Kira)'
  );
  const [taskDate, setTaskDate] = useState<string>(() => {
    return activeAssignment?.dateAssigned || new Date().toISOString().split('T')[0];
  });
  const [titleError, setTitleError] = useState<string | null>(null);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sync title and date when active assignment changes
  useEffect(() => {
    setTaskTitle(activeAssignment?.title || '');
    setBookType(activeAssignment?.bookType || 'Buku Latihan (Tulis/Kira)');
    setTaskDate(activeAssignment?.dateAssigned || new Date().toISOString().split('T')[0]);
    setTitleError(null);
  }, [activeAssignment?.id, activeAssignment?.title, activeAssignment?.dateAssigned, selectedSubject]);

  const [filter, setFilter] = useState<'all' | 'dihantar' | 'belum_hantar' | 'belum_disemak'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentForRemark, setSelectedStudentForRemark] = useState<string | null>(null);

  // Helper to format YYYY-MM-DD to DD/MM/YYYY
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getDayNameMalay = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const days = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
      return days[d.getDay()];
    } catch {
      return '';
    }
  };

  // Format today's date
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const formattedToday = `${day}/${month}/${year}`;

  // Current submissions count
  const dihantarList = currentClass.students.filter(
    (s) => getSubmissionStatus(activeAssignment?.submissions[s.id]) === 'DIHANTAR'
  );
  const belumHantarList = currentClass.students.filter(
    (s) => getSubmissionStatus(activeAssignment?.submissions[s.id]) === 'BELUM_HANTAR'
  );
  const belumDisemakList = currentClass.students.filter(
    (s) => getSubmissionStatus(activeAssignment?.submissions[s.id]) === 'BELUM_DISEMAK'
  );

  // Filter students based on active filter tab and search
  const filteredStudents = currentClass.students.filter((student) => {
    const status = getSubmissionStatus(activeAssignment?.submissions[student.id]);
    
    // Status filter
    if (filter === 'dihantar' && status !== 'DIHANTAR') return false;
    if (filter === 'belum_hantar' && status !== 'BELUM_HANTAR') return false;
    if (filter === 'belum_disemak' && status !== 'BELUM_DISEMAK') return false;

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = student.name.toLowerCase().includes(q);
      const matchChinese = student.chineseName ? student.chineseName.includes(searchQuery.trim()) : false;
      return matchName || matchChinese;
    }
    return true;
  });

  const getEffectiveTitle = (): string => {
    return taskTitle.trim() || `Semakan ${selectedSubject} (${formatDisplayDate(taskDate) || 'Tugasan'})`;
  };

  // Verify Title Required Validation
  const validateTitle = (): boolean => {
    const effective = getEffectiveTitle();
    if (!taskTitle.trim()) {
      setTaskTitle(effective);
      onCreateOrUpdateTask(effective, bookType, taskDate);
    }
    setTitleError(null);
    return true;
  };

  const handleTitleChange = (val: string) => {
    setTaskTitle(val);
    if (val.trim()) {
      setTitleError(null);
    }
  };

  const handleTitleBlur = () => {
    if (taskTitle.trim()) {
      const effective = getEffectiveTitle();
      onCreateOrUpdateTask(effective, bookType, taskDate);
    }
  };

  const handleBookTypeChange = (val: BookType) => {
    setBookType(val);
    const effective = getEffectiveTitle();
    onCreateOrUpdateTask(effective, val, taskDate);
  };

  const handleDateChange = (val: string) => {
    setTaskDate(val);
    const effective = getEffectiveTitle();
    onCreateOrUpdateTask(effective, bookType, val);
  };

  const handleStatusSelect = (studentId: string, status: SubmissionStatus) => {
    const effective = getEffectiveTitle();
    if (!taskTitle.trim()) {
      setTaskTitle(effective);
      onCreateOrUpdateTask(effective, bookType, taskDate);
    }
    if (status === 'DIHANTAR') {
      playSuccessDing(soundEnabled);
      if (dihantarList.length + 1 === currentClass.students.length) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        playCelebrationFanfare(soundEnabled);
      }
    } else {
      playToggleOff(soundEnabled);
    }
    onToggleSubmission(studentId, status, { title: effective, bookType, date: taskDate });
  };

  const handleCardClick = (studentId: string) => {
    const currentStatus = getSubmissionStatus(activeAssignment?.submissions[studentId]);
    const nextStatus = getNextStatus(currentStatus);
    handleStatusSelect(studentId, nextStatus);
  };

  const handleMarkAll = () => {
    const effective = getEffectiveTitle();
    if (!taskTitle.trim()) {
      setTaskTitle(effective);
      onCreateOrUpdateTask(effective, bookType, taskDate);
    }

    playCelebrationFanfare(soundEnabled);
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });
    onMarkAllSubmitted();
  };

  const handleSaveRecord = async (saveAsNew = false) => {
    const effective = getEffectiveTitle();
    if (!taskTitle.trim()) {
      setTaskTitle(effective);
    }

    if (onSaveRecord) {
      const ok = await onSaveRecord(effective, bookType, taskDate, saveAsNew);
      if (ok) {
        setSaveSuccessToast(
          saveAsNew
            ? `Tugasan baharu "${effective}" (${formatDisplayDate(taskDate)}) berjaya disimpan sebagai rekod baharu!`
            : `Rekod semakan "${effective}" (${formatDisplayDate(taskDate)}) bagi subjek ${selectedSubject} telah berjaya disimpan!`
        );
        playSuccessDing(soundEnabled);
        setTimeout(() => {
          setSaveSuccessToast(null);
        }, 3500);
      }
    } else {
      onCreateOrUpdateTask(effective, bookType, taskDate);
      setSaveSuccessToast(
        `Rekod semakan "${effective}" (${formatDisplayDate(taskDate)}) bagi subjek ${selectedSubject} telah berjaya disimpan!`
      );
      playSuccessDing(soundEnabled);
      setTimeout(() => {
        setSaveSuccessToast(null);
      }, 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Save Success Notification */}
      {saveSuccessToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-5 h-5 bg-emerald-500 rounded-full p-0.5" />
          <span className="text-xs sm:text-sm font-bold">{saveSuccessToast}</span>
        </div>
      )}

      {/* Aliran Kerja 7 Langkah Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-indigo-800/40">
        
        {/* Step 1 & 2: Kelas & Mata Pelajaran */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950">
                Langkah 1 & 2: Kelas & Subjek
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                Kelas: <strong className="text-white text-sm">{currentClass.name}</strong>
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {currentClass.grade === 1
                ? 'Tahun 1 mempunyai 3 paparan mata pelajaran berasingan. Rekod tidak bercampur.'
                : `Mata pelajaran bagi kelas ${currentClass.name}.`}
            </p>
          </div>

          {/* Subject Switcher Tabs (Requirement 1 & 2) */}
          <div className="flex flex-wrap items-center gap-2">
            {availableSubjects.map((subj) => {
              const isActive = selectedSubject === subj;
              return (
                <button
                  key={subj}
                  id={`rec-subj-${subj.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => onSelectSubject(subj)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-amber-500/20 scale-[1.03]'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                  }`}
                >
                  {isActive && <Sparkles className="w-3.5 h-3.5 fill-slate-950" />}
                  <span>{subj}</span>
                  {isActive && (
                    <span className="text-[10px] bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded font-black tracking-wide">
                      Dipilih
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Banner Bantuan Pemulihan Rekod */}
        {assignments.length === 0 && onOpenRecovery && (
          <div className="mt-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm block text-amber-200">
                  Rekod semakan yang anda simpan semalam tidak kelihatan?
                </span>
                <span className="text-xs text-slate-300">
                  Sistem menyediakan Pusat Pemulihan untuk mengimbas salinan sandaran pelayar, arkib sejarah dan Google Drive.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenRecovery}
              id="btn-trigger-recovery-banner"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Buka Pusat Pemulihan</span>
            </button>
          </div>
        )}

        {/* Step 3: Input TAJUK TUGAS & Maklumat Latihan */}
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-500 text-white">
                Langkah 3: Tajuk Tugas
              </span>
              <span className="text-xs text-slate-300 font-bold">
                (Wajib diisi oleh cikgu sebelum semakan)
              </span>
            </div>

            {/* Sejarah Tugasan Selector */}
            {assignments.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-300 font-semibold hidden sm:inline">Sejarah Tugasan:</span>
                <select
                  id="history-assignment-select"
                  value={activeAssignment?.id || ''}
                  onChange={(e) => {
                    if (e.target.value === 'NEW') {
                      onNewTaskRequest();
                    } else {
                      onSelectAssignment(e.target.value);
                    }
                  }}
                  className="bg-slate-800 border border-slate-600 text-amber-200 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer max-w-[220px] truncate"
                >
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.dateAssigned.split('-').reverse().join('/')})
                    </option>
                  ))}
                  <option value="NEW">➕ + Cipta Tugasan Baharu</option>
                </select>
                <button
                  type="button"
                  onClick={onNewTaskRequest}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                  title="Mulakan rekod tugasan baru untuk subjek ini"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tugasan Baru</span>
                </button>
              </div>
            )}
          </div>

          {/* Validation Error Alert */}
          {titleError && (
            <div className="bg-rose-500/20 border-2 border-rose-500 text-rose-200 px-4 py-3 rounded-2xl flex items-center gap-3 animate-pulse shadow-lg">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-xs sm:text-sm font-bold">
                {titleError}
              </div>
            </div>
          )}

          {/* Text Input Row for Tajuk Tugas */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6">
              <label htmlFor="task-title-input" className="block text-xs font-bold text-slate-300 mb-1">
                TAJUK TUGAS <span className="text-rose-400">*</span>
              </label>
              <input
                ref={titleInputRef}
                id="task-title-input"
                type="text"
                placeholder="Masukkan tajuk tugasan..."
                value={taskTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleBlur}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-800 text-white border transition-all focus:outline-none placeholder:text-slate-500 ${
                  titleError
                    ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20'
                    : 'border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30'
                }`}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Contoh: Latihan Kata Nama, Unit 5 - Animals, Latihan Deria Manusia, Buku Aktiviti m/s 25
              </p>
            </div>

            <div className="md:col-span-3">
              <label htmlFor="book-type-select" className="block text-xs font-bold text-slate-300 mb-1">
                Jenis Bahan:
              </label>
              <select
                id="book-type-select"
                value={bookType}
                onChange={(e) => handleBookTypeChange(e.target.value as BookType)}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {BOOK_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex flex-col justify-end">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="task-date-input" className="text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tarikh Semakan:</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    handleDateChange(todayStr);
                  }}
                  className="text-[10px] text-amber-300 hover:text-amber-200 underline font-bold cursor-pointer transition-colors"
                  title="Tetapkan ke tarikh hari ini"
                >
                  Hari Ini
                </button>
              </div>
              <div className="relative">
                <input
                  id="task-date-input"
                  type="date"
                  value={taskDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 text-amber-300 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 text-xs font-bold cursor-pointer transition-all [color-scheme:dark] shadow-inner"
                  title="Klik ikon kalendar untuk memilih tarikh semakan tugasan"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>{getDayNameMalay(taskDate) ? `${getDayNameMalay(taskDate)}, ` : ''}{formatDisplayDate(taskDate)}</span>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Kalendar
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Review Section: Action Bar & Filter */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-sm">
        
        {/* Top Control Bar (Step 4 & 7) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                Langkah 4 - 7: Semakan & Simpan
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Senarai Murid: {currentClass.name} ({currentClass.students.length} orang)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik kad murid untuk kitaran: <strong>BELUM DISEMAK</strong> ➔ <strong>DIHANTAR</strong> ➔ <strong>BELUM HANTAR</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="save-record-btn"
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveRecord(false)}
              className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-md shadow-emerald-700/20 transition-all cursor-pointer border border-emerald-400/40 touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed"
              title="Simpan atau kemas kini rekod semakan tugasan ini terus ke pangkalan data"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-100" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-emerald-100" />
                  <span>Simpan Rekod Semakan</span>
                </>
              )}
            </button>

            {assignments.length > 0 && (
              <button
                id="save-as-new-record-btn"
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveRecord(true)}
                className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-600 active:scale-95 text-white shadow-xs transition-all cursor-pointer border border-teal-500/30 touch-manipulation disabled:opacity-60"
                title="Simpan status semakan ini sebagai rekod tugasan baharu yang berasingan (rekod sedia ada tidak akan dipadam)"
              >
                <PlusCircle className="w-4 h-4 text-teal-200" />
                <span>Simpan Sebagai Tugasan Baharu</span>
              </button>
            )}

            <button
              id="mark-all-btn"
              type="button"
              disabled={isSaving}
              onClick={handleMarkAll}
              className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer touch-manipulation disabled:opacity-60"
              title="Tandakan semua murid sebagai Dihantar"
            >
              <CheckCheck className="w-4 h-4 text-blue-200" />
              <span>Tanda Semua Dihantar</span>
            </button>

            <button
              id="reset-all-btn"
              type="button"
              disabled={isSaving}
              onClick={() => {
                if (confirm('Adakah anda pasti mahu set semula status semakan tugasan ini kepada BELUM DISEMAK?')) {
                  onResetSubmissions();
                }
              }}
              className="min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer touch-manipulation disabled:opacity-60"
              title="Set semula semua rekod tugasan ini ke keadaan asal (BELUM DISEMAK)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="mt-4 pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status Tabs with min-h-[44px] */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl max-w-fit flex-wrap">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({currentClass.students.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('dihantar')}
              className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                filter === 'dihantar'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Dihantar ({dihantarList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('belum_hantar')}
              className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                filter === 'belum_hantar'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:text-rose-800'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Belum Hantar ({belumHantarList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('belum_disemak')}
              className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
                filter === 'belum_disemak'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Belum Disemak ({belumDisemakList.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama murid..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Student Cards Grid */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs text-slate-500 font-bold">
              Memaparkan {filteredStudents.length} daripada {currentClass.students.length} murid
            </span>
            <span className="text-xs font-semibold text-indigo-700">
              Subjek Aktif: {selectedSubject}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredStudents.map((student, index) => {
              const submission = activeAssignment?.submissions[student.id];
              const status = getSubmissionStatus(submission);
              const isSubmitted = status === 'DIHANTAR';
              const isUnsubmitted = status === 'BELUM_HANTAR';
              const isPendingCheck = status === 'BELUM_DISEMAK';
              const remark = submission?.remark;
              const studentSubjectPoints = student.subjectPoints?.[selectedSubject] || 0;

              return (
                <div
                  key={student.id}
                  className={`relative rounded-2xl p-4 transition-all duration-200 border text-left flex flex-col justify-between ${
                    isSubmitted
                      ? 'bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border-emerald-300 shadow-sm hover:border-emerald-400 hover:shadow-md'
                      : isUnsubmitted
                      ? 'bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 border-rose-300 shadow-xs hover:border-rose-400 hover:shadow-sm'
                      : 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  {/* Top: Student basic info & Submission status badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        {/* Avatar */}
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${
                            isSubmitted
                              ? 'bg-emerald-600 text-white'
                              : isUnsubmitted
                              ? 'bg-rose-600 text-white'
                              : student.gender === 'P'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">
                              {student.name}
                            </h4>
                            {student.chineseName && (
                              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-100/70 text-amber-900 border border-amber-300/60 font-sans">
                                {student.chineseName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              {studentSubjectPoints} mata ({selectedSubject})
                            </span>
                            <span>•</span>
                            <span className="text-slate-400 font-medium">No. {student.rollNo || index + 1}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick status cycle button */}
                      <button
                        type="button"
                        onClick={() => handleCardClick(student.id)}
                        className={`cursor-pointer rounded-full p-1 transition-transform active:scale-90 ${
                          isSubmitted
                            ? 'text-emerald-600 bg-emerald-100/80 hover:bg-emerald-200'
                            : isUnsubmitted
                            ? 'text-rose-600 bg-rose-100/80 hover:bg-rose-200'
                            : 'text-slate-400 hover:text-slate-600 bg-slate-100'
                        }`}
                        title={`Status semasa: ${
                          isSubmitted ? 'DIHANTAR' : isUnsubmitted ? 'BELUM HANTAR' : 'BELUM DISEMAK'
                        }. Klik untuk tukar status.`}
                      >
                        {isSubmitted ? (
                          <CheckCircle2 className="w-6 h-6 fill-emerald-500 text-white" />
                        ) : isUnsubmitted ? (
                          <XCircle className="w-6 h-6 fill-rose-500 text-white" />
                        ) : (
                          <Clock className="w-6 h-6 text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* 3-State Direct Action Buttons (Hantar, Belum Hantar, Disemak) with min-h-[44px] */}
                    <div className="grid grid-cols-3 gap-1.5 my-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusSelect(student.id, 'DIHANTAR');
                        }}
                        className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all touch-manipulation cursor-pointer active:scale-95 border ${
                          isSubmitted
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                            : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                        }`}
                        title="Tandakan status murid sebagai Dihantar (+10 mata)"
                      >
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSubmitted ? 'text-white fill-emerald-500' : 'text-emerald-600'}`} />
                        <span className="whitespace-nowrap font-extrabold text-[11px]">Hantar</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusSelect(student.id, 'BELUM_HANTAR');
                        }}
                        className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all touch-manipulation cursor-pointer active:scale-95 border ${
                          isUnsubmitted
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/30'
                            : 'bg-rose-50/70 text-rose-800 border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                        }`}
                        title="Tandakan status murid sebagai Belum Hantar"
                      >
                        <XCircle className={`w-4 h-4 shrink-0 ${isUnsubmitted ? 'text-white fill-rose-500' : 'text-rose-600'}`} />
                        <span className="whitespace-nowrap font-extrabold text-[11px]">Belum Hantar</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusSelect(student.id, 'BELUM_DISEMAK');
                        }}
                        className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all touch-manipulation cursor-pointer active:scale-95 border ${
                          isPendingCheck
                            ? 'bg-slate-700 text-white border-slate-700 shadow-sm shadow-slate-700/30'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                        title="Tandakan status murid sebagai Belum Disemak"
                      >
                        <Clock className={`w-4 h-4 shrink-0 ${isPendingCheck ? 'text-white' : 'text-slate-500'}`} />
                        <span className="whitespace-nowrap font-extrabold text-[11px]">Disemak</span>
                      </button>
                    </div>

                    {/* 3-State Interactive Chip */}
                    <div 
                      onClick={() => handleCardClick(student.id)}
                      className="cursor-pointer mb-2 inline-block select-none touch-manipulation"
                      title="Klik untuk kitar status: BELUM DISEMAK ➔ DIHANTAR ➔ BELUM HANTAR"
                    >
                      {isSubmitted ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>DIHANTAR (+10 mata {selectedSubject})</span>
                        </div>
                      ) : isUnsubmitted ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>BELUM HANTAR</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 hover:bg-slate-200 transition-colors">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>BELUM DISEMAK</span>
                        </div>
                      )}
                    </div>

                    {/* Remark Tag (if any) */}
                    {remark && (
                      <div className="mt-1 text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium inline-block">
                        {remark}
                      </div>
                    )}

                    {/* Ruang Menaip Kerja Murid (Catatan/Markah/Status Latihan) */}
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                          <PenTool className="w-3 h-3 text-indigo-500" />
                          Ruang Kerja Murid:
                        </span>
                        {submission?.workNote && (
                          <span className="text-[10px] text-emerald-600 font-semibold">Tercatat</span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Taip nota kerja murid (cth: Skor 9/10, ms 45 siap...)"
                          value={submission?.workNote || ''}
                          onChange={(e) => {
                            if (!validateTitle()) return;
                            if (onUpdateWorkNote) {
                              onUpdateWorkNote(student.id, e.target.value);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Teacher remark selector */}
                  {(isSubmitted || isUnsubmitted) && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          if (!validateTitle()) return;
                          setSelectedStudentForRemark(
                            selectedStudentForRemark === student.id ? null : student.id
                          );
                        }}
                        className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{remark ? 'Tukar Catatan' : '+ Catatan Guru'}</span>
                      </button>

                      <span className="text-[10px] text-slate-400">
                        {submission?.submittedAt ? submission.submittedAt.slice(11, 16) : 'Tercatat'}
                      </span>
                    </div>
                  )}

                  {/* Remark Dropdown Drawer for this student */}
                  {selectedStudentForRemark === student.id && (
                    <div className="mt-2 p-2 bg-white rounded-xl border border-slate-200 shadow-lg z-10 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                        Pilih Catatan Guru:
                      </span>
                      <div className="grid grid-cols-1 gap-1">
                        {REMARKS_LIST.map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              onUpdateRemark(student.id, r as RemarkType);
                              setSelectedStudentForRemark(null);
                            }}
                            className={`text-left px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                              remark === r
                                ? 'bg-amber-100 text-amber-900 font-bold'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            onUpdateRemark(student.id, '' as RemarkType);
                            setSelectedStudentForRemark(null);
                          }}
                          className="text-left px-2 py-1 rounded-md text-[11px] text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          ✕ Buang Catatan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

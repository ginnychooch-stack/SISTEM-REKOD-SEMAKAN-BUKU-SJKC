import React from 'react';
import { 
  Trophy, 
  ClipboardCheck, 
  Gift, 
  BarChart3, 
  PlusCircle, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertCircle, 
  Coins, 
  Percent,
  BookOpen,
  School,
  Lock,
  Unlock,
  Calendar,
  Settings,
  Clock,
  History,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { ActiveTab, ClassGroup, Assignment } from '../types';
import { getSubmissionStatus } from '../utils/statusUtils';
import { getMainSubjectsForGrade } from '../data/initialData';

interface HeaderProps {
  currentTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  classes: ClassGroup[];
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
  currentTaskTitle?: string;
  activeAssignment: Assignment | null;
  onOpenNewTaskModal: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  selectedYear: string;
  onSelectYear: (year: string) => void;
  availableYears: string[];
  isAdmin: boolean;
  onOpenAdmin: () => void;
  onOpenRecovery?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  classes,
  selectedClassId,
  onSelectClass,
  selectedSubject,
  onSelectSubject,
  currentTaskTitle,
  activeAssignment,
  onOpenNewTaskModal,
  soundEnabled,
  onToggleSound,
  selectedYear,
  onSelectYear,
  availableYears,
  isAdmin,
  onOpenAdmin,
  onOpenRecovery,
}) => {
  const currentClass = classes.find((c) => c.id === selectedClassId) || classes[0];
  const availableSubjects = getMainSubjectsForGrade(currentClass ? currentClass.grade : 1);

  // Calculate statistics for active assignment based on status system
  let dihantarCount = 0;
  let tidakSiapCount = 0;
  let belumHantarCount = 0;
  let belumDisemakCount = 0;
  let pointsGiven = 0;
  const totalStudents = currentClass ? currentClass.students.length : 0;

  if (activeAssignment && currentClass) {
    currentClass.students.forEach((student) => {
      const sub = activeAssignment.submissions[student.id];
      const status = getSubmissionStatus(sub);
      if (status === 'DIHANTAR') {
        dihantarCount++;
        pointsGiven += (sub?.pointsAwarded || activeAssignment.pointsValue);
      } else if (status === 'TIDAK_SIAP') {
        tidakSiapCount++;
      } else if (status === 'BELUM_HANTAR') {
        belumHantarCount++;
      } else {
        belumDisemakCount++;
      }
    });
  } else {
    belumDisemakCount = totalStudents;
  }

  // Rekod murid dianggap telah menghantar buku bagi DIHANTAR & TIDAK_SIAP
  const assessedTotal = dihantarCount + tidakSiapCount + belumHantarCount;
  const totalBooksSubmitted = dihantarCount + tidakSiapCount;
  const submissionRate = assessedTotal > 0 ? Math.round((totalBooksSubmitted / assessedTotal) * 100) : 0;

  // Format today's date
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const currentDateFormatted = `${day}/${month}/${year}`;

  const taskTitleDisplay = activeAssignment?.title || currentTaskTitle || '';
  const taskDateDisplay = activeAssignment?.dateAssigned 
    ? activeAssignment.dateAssigned.split('-').reverse().join('/') 
    : currentDateFormatted;

  return (
    <header className="relative bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-900 text-white pb-6 pt-4 px-4 sm:px-6 shadow-2xl border-b border-indigo-800/40">
      {/* Decorative ambient background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -top-20 right-1/4 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl" />
        <div className="absolute top-10 left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Top Utility Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/30 text-slate-950 font-black text-xl">
              📚
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-black bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 shadow-sm tracking-wide uppercase">
                  🏫 SJK(C) Alor Pongsu
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
                  Cikgu Choo Chee Hong
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 font-serif mt-0.5">
                Sistem Rekod Semakan Buku
              </h1>
              <p className="text-xs text-slate-300">
                Perekodan semakan buku & kerja murid: Tahun 1 (BM, BI, Sains), Tahun 5 (Matematik), Tahun 6 (Sejarah)
              </p>
            </div>
          </div>

          {/* Controls: Class Selector, Audio Toggle & Admin Button */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Class Selector */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl shadow-inner text-xs sm:text-sm">
              <School className="w-4 h-4 text-amber-400" />
              <label htmlFor="class-select" className="text-slate-400 text-xs hidden sm:inline">Kelas:</label>
              <select
                id="class-select"
                value={selectedClassId}
                onChange={(e) => onSelectClass(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id} className="bg-slate-800 text-white">
                    {cls.name} — {cls.students.length} Murid
                  </option>
                ))}
              </select>
            </div>

            {/* Sound Toggle */}
            <button
              id="sound-toggle-btn"
              onClick={onToggleSound}
              aria-label={soundEnabled ? 'Matikan Bunyi' : 'Hidupkan Bunyi'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-sm ${
                soundEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span className="hidden md:inline">Bunyi: {soundEnabled ? 'Hidup' : 'Senyap'}</span>
            </button>

            {/* Recovery Button */}
            {onOpenRecovery && (
              <button
                id="header-recovery-btn"
                onClick={onOpenRecovery}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 text-amber-300 border border-amber-500/40"
                title="Pusat Pemulihan Rekod Hilang & Sandaran"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>Pulihkan Data</span>
              </button>
            )}

            {/* Admin Panel Button with Hidden Password (xxxx) */}
            <button
              id="admin-panel-btn"
              onClick={onOpenAdmin}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                isAdmin
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500 ring-2 ring-indigo-400/30'
                  : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40'
              }`}
              title="Panel Pentadbir Guru (xxxx)"
            >
              {isAdmin ? <Unlock className="w-3.5 h-3.5 text-indigo-200" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isAdmin ? 'Panel Admin' : 'Admin (xxxx)'}</span>
            </button>
          </div>
        </div>

        {/* 2. PAPARAN PEMILIHAN SUBJEK */}
        <div className="mt-3.5 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-inner backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Mata Pelajaran:</span>
            {currentClass && currentClass.grade === 1 && (
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 px-2 py-0.5 rounded-full font-semibold">
                Tahun 1 (3 Subjek Berasingan)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {availableSubjects.map((subj) => {
              const isActive = selectedSubject === subj;
              return (
                <button
                  key={subj}
                  id={`subject-tab-${subj.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => onSelectSubject(subj)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-md shadow-amber-500/20 scale-[1.02]'
                      : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600'
                  }`}
                >
                  {isActive && <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />}
                  <span>{subj}</span>
                  {isActive && (
                    <span className="ml-1 text-[10px] bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded font-black tracking-wider uppercase">
                      Aktif
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Banner / Hero Highlight: Bilik Ganjaran Showcase (Requirement 7) */}
        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-850/90 to-indigo-950/90 border border-amber-500/25 shadow-xl backdrop-blur-md flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Trophy className="w-6 h-6 animate-pulse text-amber-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif">
              Bilik Ganjaran & Semakan
            </h2>
          </div>
          
          {/* Format strictly according to Requirement 7 */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-medium mt-1">
            <span className="bg-amber-400/15 text-amber-300 px-3 py-1 rounded-lg border border-amber-400/25 font-bold">
              Kelas: {currentClass?.name || 'Tahun 1A'}
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="bg-indigo-500/25 text-indigo-200 px-3 py-1 rounded-lg border border-indigo-500/40 font-bold">
              Mata Pelajaran: {selectedSubject}
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className={`px-3 py-1 rounded-lg font-bold border ${
              taskTitleDisplay 
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
            }`}>
              Tajuk Tugas: {taskTitleDisplay ? taskTitleDisplay : 'Sila masukkan Tajuk Tugas'}
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-lg border border-slate-700 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Tarikh: {taskDateDisplay}</span>
            </span>
          </div>

          {/* 5 Stats Cards */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-3 border-t border-slate-700/60">
            {/* 1: Dihantar */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-center transition-transform hover:scale-[1.02]">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-bold">Dihantar</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300">
                {dihantarCount}
              </div>
              <span className="text-[11px] text-emerald-400/80 font-medium">
                {totalStudents > 0 ? `${dihantarCount} siap` : '0 murid'}
              </span>
            </div>

            {/* 2: Hantar Tak Siap (Jingga / Amber) */}
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-center transition-transform hover:scale-[1.02]">
              <div className="flex items-center justify-center gap-1.5 text-amber-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-bold">Tak Siap</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-300">
                {tidakSiapCount}
              </div>
              <span className="text-[11px] text-amber-400/80 font-medium">
                {tidakSiapCount === 0 ? 'Tiada tertunggak' : `${tidakSiapCount} dihantar tak siap`}
              </span>
            </div>

            {/* 3: Belum Hantar */}
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 text-center transition-transform hover:scale-[1.02]">
              <div className="flex items-center justify-center gap-1.5 text-rose-400 mb-1">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-bold">Belum Hantar</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-300">
                {belumHantarCount}
              </div>
              <span className="text-[11px] text-rose-400/80 font-medium">
                {belumHantarCount === 0 ? 'Tiada tunggakan' : `${belumHantarCount} murid`}
              </span>
            </div>

            {/* 4: Belum Disemak (Status Awal) */}
            <div className="bg-slate-800/80 border border-slate-600/40 rounded-xl p-3 text-center transition-transform hover:scale-[1.02]">
              <div className="flex items-center justify-center gap-1.5 text-slate-300 mb-1">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs uppercase tracking-wider font-bold">Belum Disemak</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-200">
                {belumDisemakCount}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {belumDisemakCount === totalStudents ? 'Keadaan asal murid' : `${belumDisemakCount} murid`}
              </span>
            </div>

            {/* 5: Kadar Penghantaran */}
            <div className="col-span-2 sm:col-span-1 bg-blue-950/40 border border-blue-500/30 rounded-xl p-3 text-center transition-transform hover:scale-[1.02]">
              <div className="flex items-center justify-center gap-1.5 text-blue-400 mb-1">
                <Percent className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-bold">Kadar Hantar</span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-300">
                {assessedTotal > 0 ? `${submissionRate}%` : '0%'}
              </div>
              <div className="w-full bg-slate-700/60 rounded-full h-1.5 mt-1 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    submissionRate >= 80 ? 'bg-emerald-400' : submissionRate >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                  style={{ width: `${assessedTotal > 0 ? submissionRate : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Pills Navigation Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {/* 1: Rekod Tugasan (Navy / Indigo) */}
          <button
            id="tab-rekod-btn"
            onClick={() => onTabChange('rekod')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer ${
              currentTab === 'rekod'
                ? 'bg-blue-900 text-white ring-2 ring-blue-400 shadow-blue-900/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 text-blue-400" />
            <span>Rekod Tugasan</span>
          </button>

          {/* 2: Ganjaran (Amber / Gold) */}
          <button
            id="tab-ganjaran-btn"
            onClick={() => onTabChange('ganjaran')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer ${
              currentTab === 'ganjaran'
                ? 'bg-amber-600 text-slate-950 font-extrabold ring-2 ring-amber-300 shadow-amber-600/50'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
            }`}
          >
            <Gift className="w-4 h-4 text-amber-300" />
            <span>Ganjaran</span>
          </button>

          {/* 3: Dashboard Prestasi (Blue) */}
          <button
            id="tab-prestasi-btn"
            onClick={() => onTabChange('prestasi')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer ${
              currentTab === 'prestasi'
                ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-blue-600/50'
                : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span>Dashboard Prestasi</span>
          </button>

          {/* 4: Tugasan Baru (Green) */}
          <button
            id="open-new-task-btn"
            onClick={onOpenNewTaskModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-700/30 hover:shadow-emerald-600/50 transition-all active:scale-95 border border-emerald-400/40 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-200" />
            <span>Tugasan Baru</span>
          </button>
        </div>
      </div>
    </header>
  );
};

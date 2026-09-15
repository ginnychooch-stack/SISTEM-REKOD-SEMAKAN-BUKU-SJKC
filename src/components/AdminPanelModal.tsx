import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  School, 
  Calendar, 
  Users, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Lock, 
  ArrowRight, 
  Copy, 
  FileText,
  Save,
  CheckCircle2,
  HelpCircle,
  UserPlus,
  Download,
  Upload,
  HardDrive,
  Cloud,
  CloudUpload,
  RefreshCw,
  ExternalLink,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ClassGroup, Student, Assignment } from '../types';
import { 
  initAuth, 
  googleSignIn, 
  logoutGoogle, 
  getAccessToken, 
  getCurrentUser 
} from '../services/googleDriveAuth';
import { 
  listSchoolBackupsFromDrive, 
  uploadBackupToDrive, 
  downloadBackupFromDrive, 
  deleteBackupFromDrive, 
  DriveBackupFile 
} from '../services/googleDriveService';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  classes: ClassGroup[];
  onUpdateClasses: (updatedClasses: ClassGroup[]) => void;
  selectedYear: string;
  onSelectYear: (year: string) => void;
  availableYears: string[];
  onAddYear: (year: string) => void;
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  assignments?: Assignment[];
  onRestoreBackup?: (backup: {
    classes: ClassGroup[];
    assignments: Assignment[];
    availableYears?: string[];
    selectedYear?: string;
  }) => void;
}

type AdminTab = 'kelas' | 'murid' | 'tahun_seterusnya' | 'sandaran';

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  onLogout,
  classes,
  onUpdateClasses,
  selectedYear,
  onSelectYear,
  availableYears,
  onAddYear,
  selectedClassId,
  onSelectClass,
  assignments = [],
  onRestoreBackup,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('kelas');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Backup & Export handlers
  const handleExportBackup = () => {
    try {
      const backupPayload = {
        version: '1.0',
        schoolName: 'SJK(C) Alor Pongsu',
        exportedAt: new Date().toISOString(),
        availableYears,
        selectedYear,
        classes,
        assignments,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute('download', `SJKC_Alor_Pongsu_Sandaran_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showNotification('Fail sandaran SJK(C) Alor Pongsu berjaya dimuat turun ke peranti anda!');
    } catch (err) {
      console.error(err);
      showNotification('Ralat ketika memuat turun fail sandaran.', 'error');
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.classes || !Array.isArray(parsed.classes)) {
          showNotification('Format fail tidak sah. Sila pilih fail JSON sandaran yang sah.', 'error');
          return;
        }

        if (onRestoreBackup) {
          onRestoreBackup({
            classes: parsed.classes,
            assignments: parsed.assignments || assignments,
            availableYears: parsed.availableYears || availableYears,
            selectedYear: parsed.selectedYear || selectedYear,
          });
          showNotification('Data berjaya dipulihkan daripada fail sandaran!');
        } else {
          onUpdateClasses(parsed.classes);
          showNotification('Senarai kelas berjaya dikemaskini daripada fail sandaran!');
        }
      } catch (err) {
        console.error(err);
        showNotification('Gagal membaca fail sandaran. Sila pastikan fail berformat JSON yang betul.', 'error');
      }
    };
    reader.readAsText(file);
    // Reset file input value
    event.target.value = '';
  };

  // Google Drive state
  const [googleUser, setGoogleUser] = useState<User | null>(() => getCurrentUser());
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    actionLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const fetchDriveBackups = async (token?: string) => {
    try {
      const activeToken = token || (await getAccessToken());
      if (!activeToken) return;
      setIsLoadingDrive(true);
      const files = await listSchoolBackupsFromDrive(activeToken);
      setDriveBackups(files);
    } catch (err: any) {
      console.error('Error fetching drive backups:', err);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        fetchDriveBackups(token);
      },
      () => {
        setGoogleUser(null);
        setDriveBackups([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignInClick = async () => {
    setIsSigningInGoogle(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        showNotification(`Berjaya disambungkan ke Google Drive (${result.user.email || 'Akaun MOE'})!`);
        await fetchDriveBackups(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Log masuk Google Drive dibatalkan atau tidak selesai.', 'error');
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGoogleLogoutClick = async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setDriveBackups([]);
      showNotification('Akaun Google Drive telah diputuskan sambungannya.');
    } catch (err) {
      console.error(err);
      showNotification('Ralat ketika memutuskan akaun Google.', 'error');
    }
  };

  const handleSaveToGoogleDrive = async () => {
    const token = await getAccessToken();
    if (!token) {
      showNotification('Sila log masuk akaun Google Drive dahulu.', 'error');
      return;
    }

    setIsUploadingToDrive(true);
    try {
      const backupPayload = {
        version: '1.0',
        schoolName: 'SJK(C) Alor Pongsu',
        savedByEmail: googleUser?.email || 'g-82190258@moe-dl.edu.my',
        exportedAt: new Date().toISOString(),
        availableYears,
        selectedYear,
        classes,
        assignments,
      };

      const uploaded = await uploadBackupToDrive(token, backupPayload);
      showNotification(`Berjaya dimuat naik ke Google Drive: ${uploaded.name}`);
      await fetchDriveBackups(token);
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || 'Gagal menyimpan sandaran ke Google Drive.', 'error');
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handlePromptRestoreFromDrive = (file: DriveBackupFile) => {
    setConfirmDialog({
      open: true,
      title: 'Pulihkan Data Dari Google Drive?',
      message: `Adakah anda pasti ingin memulihkan sandaran "${file.name}"? Semua data kelas, senarai murid dan rekod semakan semasa akan dikemas kini mengikut fail ini.`,
      actionLabel: 'Ya, Pulihkan Sekarang',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmDialog(null);
        const token = await getAccessToken();
        if (!token) {
          showNotification('Sila log masuk Google Drive semula.', 'error');
          return;
        }
        try {
          const data = await downloadBackupFromDrive(token, file.id);
          if (data && data.classes && Array.isArray(data.classes)) {
            if (onRestoreBackup) {
              onRestoreBackup({
                classes: data.classes,
                assignments: data.assignments || assignments,
                availableYears: data.availableYears || availableYears,
                selectedYear: data.selectedYear || selectedYear,
              });
            } else {
              onUpdateClasses(data.classes);
            }
            showNotification(`Rekod berjaya dipulihkan daripada "${file.name}"!`);
          } else {
            showNotification('Format data dalam fail Google Drive ini tidak sah.', 'error');
          }
        } catch (err: any) {
          console.error(err);
          showNotification('Gagal memulihkan fail dari Google Drive.', 'error');
        }
      },
    });
  };

  const handlePromptDeleteFromDrive = (file: DriveBackupFile) => {
    setConfirmDialog({
      open: true,
      title: 'Padam Fail Dari Google Drive?',
      message: `Adakah anda pasti ingin memadamkan fail sandaran "${file.name}" daripada Google Drive anda? Tindakan ini tidak boleh dikembalikan.`,
      actionLabel: 'Ya, Padam Fail Ini',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        const token = await getAccessToken();
        if (!token) {
          showNotification('Sila log masuk Google Drive semula.', 'error');
          return;
        }
        try {
          await deleteBackupFromDrive(token, file.id);
          showNotification(`Fail "${file.name}" berjaya dipadam dari Google Drive.`);
          await fetchDriveBackups(token);
        } catch (err: any) {
          console.error(err);
          showNotification('Gagal memadam fail dari Google Drive.', 'error');
        }
      },
    });
  };

  // Class form states
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [classNameInput, setClassNameInput] = useState('');
  const [classGradeInput, setClassGradeInput] = useState<number>(5);
  const [classYearInput, setClassYearInput] = useState<string>(selectedYear || '2026');
  const [classTeacherInput, setClassTeacherInput] = useState<string>('Choo Chee Hong');

  // Student form states
  const [studentClassId, setStudentClassId] = useState<string>(selectedClassId || classes[0]?.id || '');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentRollNo, setStudentRollNo] = useState<number>(1);
  const [studentName, setStudentName] = useState('');
  const [studentChineseName, setStudentChineseName] = useState('');
  const [studentGender, setStudentGender] = useState<'L' | 'P'>('L');
  const [studentPoints, setStudentPoints] = useState<number>(100);

  // Batch paste state
  const [isBatchPasteOpen, setIsBatchPasteOpen] = useState(false);
  const [batchText, setBatchText] = useState('');

  // Promote / Next year migration state
  const [targetNextYear, setTargetNextYear] = useState<string>('2027');
  const [sourceYearForMigration, setSourceYearForMigration] = useState<string>('2026');
  const [promotionMode, setPromotionMode] = useState<'promote' | 'empty'>('promote');

  if (!isOpen) return null;

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  // Filtered classes by selected year in the admin view
  const displayClasses = filterYear === 'all' 
    ? classes 
    : classes.filter((c) => c.year === filterYear);

  const currentStudentClass = classes.find((c) => c.id === studentClassId) || classes[0];

  // --- CLASS ACTIONS ---
  const handleStartAddClass = () => {
    setEditingClassId(null);
    setClassNameInput('');
    setClassGradeInput(5);
    setClassYearInput(filterYear !== 'all' ? filterYear : selectedYear || '2026');
    setClassTeacherInput('Choo Chee Hong');
    setIsAddingClass(true);
  };

  const handleStartEditClass = (cls: ClassGroup) => {
    setIsAddingClass(false);
    setEditingClassId(cls.id);
    setClassNameInput(cls.name);
    setClassGradeInput(cls.grade);
    setClassYearInput(cls.year);
    setClassTeacherInput(cls.teacherName);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classNameInput.trim()) {
      showNotification('Sila masukkan nama kelas.', 'error');
      return;
    }

    // Ensure year is added to availableYears
    if (!availableYears.includes(classYearInput)) {
      onAddYear(classYearInput);
    }

    if (editingClassId) {
      // Update existing class
      const updated = classes.map((c) => {
        if (c.id === editingClassId) {
          return {
            ...c,
            name: classNameInput.trim(),
            grade: Number(classGradeInput),
            year: classYearInput.trim(),
            teacherName: classTeacherInput.trim(),
          };
        }
        return c;
      });
      onUpdateClasses(updated);
      setEditingClassId(null);
      showNotification(`Kelas ${classNameInput} berjaya dikemaskini!`);
    } else {
      // Create new class
      const newId = `class-${Date.now()}`;
      const newClass: ClassGroup = {
        id: newId,
        name: classNameInput.trim(),
        grade: Number(classGradeInput),
        year: classYearInput.trim(),
        teacherName: classTeacherInput.trim() || 'Choo Chee Hong',
        students: [],
      };
      onUpdateClasses([...classes, newClass]);
      setIsAddingClass(false);
      onSelectClass(newId);
      setStudentClassId(newId);
      showNotification(`Kelas baharu ${classNameInput} (${classYearInput}) berjaya dicipta!`);
    }
  };

  const handleDeleteClass = (classId: string, className: string) => {
    if (classes.length <= 1) {
      showNotification('Sistem perlu mempunyai sekurang-kurangnya 1 kelas.', 'error');
      return;
    }
    const confirmed = window.confirm(`Adakah anda pasti mahu memadam kelas "${className}"? Tindakan ini tidak boleh diundur.`);
    if (confirmed) {
      const updated = classes.filter((c) => c.id !== classId);
      onUpdateClasses(updated);
      if (selectedClassId === classId && updated.length > 0) {
        onSelectClass(updated[0].id);
      }
      if (studentClassId === classId && updated.length > 0) {
        setStudentClassId(updated[0].id);
      }
      showNotification(`Kelas ${className} telah dipadam.`);
    }
  };

  // --- STUDENT ACTIONS ---
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      showNotification('Sila masukkan nama murid.', 'error');
      return;
    }

    if (!currentStudentClass) return;

    if (editingStudentId) {
      // Edit student
      const updatedStudents = currentStudentClass.students.map((s) => {
        if (s.id === editingStudentId) {
          return {
            ...s,
            rollNo: studentRollNo,
            name: studentName.trim(),
            chineseName: studentChineseName.trim() || undefined,
            gender: studentGender,
            points: studentPoints,
          };
        }
        return s;
      });

      const updatedClasses = classes.map((c) =>
        c.id === currentStudentClass.id ? { ...c, students: updatedStudents } : c
      );
      onUpdateClasses(updatedClasses);
      setEditingStudentId(null);
      resetStudentForm();
      showNotification('Maklumat murid berjaya dikemaskini!');
    } else {
      // Add student
      const nextRollNo = currentStudentClass.students.length + 1;
      const newStudent: Student = {
        id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        rollNo: studentRollNo || nextRollNo,
        name: studentName.trim(),
        chineseName: studentChineseName.trim() || undefined,
        gender: studentGender,
        avatarSeed: studentName.trim().replace(/\s+/g, ''),
        points: studentPoints,
        stars: Math.floor(studentPoints / 10),
      };

      const updatedStudents = [...currentStudentClass.students, newStudent].sort((a, b) => 
        (a.rollNo || 0) - (b.rollNo || 0)
      );

      const updatedClasses = classes.map((c) =>
        c.id === currentStudentClass.id ? { ...c, students: updatedStudents } : c
      );
      onUpdateClasses(updatedClasses);
      resetStudentForm();
      showNotification(`Murid ${newStudent.name} berjaya ditambah!`);
    }
  };

  const resetStudentForm = () => {
    setEditingStudentId(null);
    setStudentName('');
    setStudentChineseName('');
    setStudentGender('L');
    setStudentPoints(100);
    if (currentStudentClass) {
      setStudentRollNo(currentStudentClass.students.length + 1);
    }
  };

  const handleStartEditStudent = (s: Student) => {
    setEditingStudentId(s.id);
    setStudentRollNo(s.rollNo || 1);
    setStudentName(s.name);
    setStudentChineseName(s.chineseName || '');
    setStudentGender(s.gender);
    setStudentPoints(s.points);
  };

  const handleDeleteStudent = (studentId: string, name: string) => {
    const confirmed = window.confirm(`Padam murid ${name} daripada kelas ini?`);
    if (confirmed && currentStudentClass) {
      const updatedStudents = currentStudentClass.students.filter((s) => s.id !== studentId);
      const updatedClasses = classes.map((c) =>
        c.id === currentStudentClass.id ? { ...c, students: updatedStudents } : c
      );
      onUpdateClasses(updatedClasses);
      showNotification(`Murid ${name} telah dikeluarkan.`);
    }
  };

  // Batch Paste Parser
  const handleProcessBatchPaste = () => {
    if (!batchText.trim() || !currentStudentClass) return;

    const lines = batchText.split('\n').map((l) => l.trim()).filter(Boolean);
    const newStudents: Student[] = [];
    let startRoll = currentStudentClass.students.length + 1;

    for (const line of lines) {
      // Regex pattern to extract: RollNo (optional), Name, Chinese Name (optional in brackets/parentheses), Gender (optional L/P)
      // e.g. "1. Darren Ng (黄维洋) - L" or "Darren Ng 黄维洋" or "Darren Ng"
      let cleanLine = line.replace(/^\d+[\.\)\-]\s*/, '').trim(); // strip leading number
      let detectedChinese = '';
      let detectedGender: 'L' | 'P' = 'L';

      // Check for parentheses Chinese name e.g. (黄维洋) or （黄维洋）
      const chineseMatch = cleanLine.match(/[\(（]([\u4e00-\u9fa5\s]+)[\)）]/);
      if (chineseMatch) {
        detectedChinese = chineseMatch[1].trim();
        cleanLine = cleanLine.replace(chineseMatch[0], '').trim();
      } else {
        // Look for trailing Chinese characters
        const hanziMatch = cleanLine.match(/([\u4e00-\u9fa5]+)/);
        if (hanziMatch) {
          detectedChinese = hanziMatch[1].trim();
          cleanLine = cleanLine.replace(hanziMatch[0], '').trim();
        }
      }

      // Check gender flag at the end: - L / - P / L / P
      if (/\b(P|Perempuan|F)\b/i.test(cleanLine)) {
        detectedGender = 'P';
        cleanLine = cleanLine.replace(/[-–—/]\s*(P|Perempuan|F)\b/i, '').trim();
      } else if (/\b(L|Lelaki|M)\b/i.test(cleanLine)) {
        detectedGender = 'L';
        cleanLine = cleanLine.replace(/[-–—/]\s*(L|Lelaki|M)\b/i, '').trim();
      }

      const finalName = cleanLine.trim();
      if (finalName) {
        newStudents.push({
          id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          rollNo: startRoll++,
          name: finalName,
          chineseName: detectedChinese || undefined,
          gender: detectedGender,
          avatarSeed: finalName.replace(/\s+/g, ''),
          points: 100,
          stars: 10,
        });
      }
    }

    if (newStudents.length > 0) {
      const updatedStudents = [...currentStudentClass.students, ...newStudents];
      const updatedClasses = classes.map((c) =>
        c.id === currentStudentClass.id ? { ...c, students: updatedStudents } : c
      );
      onUpdateClasses(updatedClasses);
      setBatchText('');
      setIsBatchPasteOpen(false);
      showNotification(`${newStudents.length} murid berjaya dimasukkan ke kelas ${currentStudentClass.name}!`);
    } else {
      showNotification('Tiada nama sah yang dapat dikesan daripada teks.', 'error');
    }
  };

  // --- PROMOTE / ADVANCE TO NEXT YEAR (2027, 2028, 2029) ---
  const handleMigrateToNextYear = () => {
    if (!targetNextYear.trim()) {
      showNotification('Sila pilih atau masukkan tahun sasaran (cth: 2027).', 'error');
      return;
    }

    // Add year to available list
    if (!availableYears.includes(targetNextYear)) {
      onAddYear(targetNextYear);
    }

    // Filter source classes from sourceYear
    const sourceClasses = classes.filter((c) => c.year === sourceYearForMigration);
    if (sourceClasses.length === 0) {
      showNotification(`Tiada kelas sedia ada untuk tahun sumber ${sourceYearForMigration}.`, 'error');
      return;
    }

    const newGeneratedClasses: ClassGroup[] = [];

    sourceClasses.forEach((src) => {
      let newGrade = src.grade;
      let newName = src.name;

      if (promotionMode === 'promote') {
        // e.g. Tahun 5A becomes Tahun 6A if grade < 6
        if (src.grade < 6) {
          newGrade = src.grade + 1;
          newName = src.name.replace(new RegExp(`Tahun\\s*${src.grade}|Darjah\\s*${src.grade}|${src.grade}`, 'i'), `Tahun ${newGrade}`);
          if (!newName.includes(String(newGrade))) {
            newName = `Tahun ${newGrade} (${src.name})`;
          }
        } else {
          newName = `${src.name} (Alumni/Tamat)`;
        }
      }

      // Check if already exists in target year
      const existingInTarget = classes.find(
        (c) => c.year === targetNextYear && c.name.toLowerCase() === newName.toLowerCase()
      );

      if (!existingInTarget) {
        newGeneratedClasses.push({
          id: `class-${targetNextYear}-${Math.random().toString(36).substr(2, 5)}`,
          name: newName,
          grade: newGrade,
          year: targetNextYear,
          teacherName: src.teacherName || 'Choo Chee Hong',
          // If promote, keep students with fresh zero points or 100 points
          students: promotionMode === 'promote' 
            ? src.students.map((st) => ({
                ...st,
                id: `st-${targetNextYear}-${st.id}`,
                points: 100,
                stars: 10,
              }))
            : [],
        });
      }
    });

    if (newGeneratedClasses.length === 0) {
      showNotification(`Kelas untuk tahun ${targetNextYear} sudah sedia ada dalam sistem.`, 'error');
      return;
    }

    onUpdateClasses([...classes, ...newGeneratedClasses]);
    onSelectYear(targetNextYear);
    onSelectClass(newGeneratedClasses[0].id);
    showNotification(`Tahniah! ${newGeneratedClasses.length} kelas untuk sesi ${targetNextYear} berjaya dijana!`);
    setActiveTab('kelas');
    setFilterYear(targetNextYear);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] max-h-[800px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden relative">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">Panel Pentadbir Guru</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Dilindungi (xxxx)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Pengurusan kelas, senarai murid & peralihan sesi persekolahan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Kunci & Log Keluar"
            >
              <span>Kunci Semula</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications Bar */}
        {message && (
          <div 
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between transition-all shrink-0 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Nav Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('kelas')}
            className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'kelas'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <School className="w-4 h-4" />
            <span>1. Urus Kelas ({classes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('murid')}
            className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'murid'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Urus Murid & Senarai Nama</span>
          </button>

          <button
            onClick={() => setActiveTab('tahun_seterusnya')}
            className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tahun_seterusnya'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>3. Kenaikan Kelas & Sesi</span>
          </button>

          <button
            onClick={() => setActiveTab('sandaran')}
            className={`pb-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'sandaran'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4 text-emerald-600" />
            <span>4. Sandaran & Simpanan Fail</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          
          {/* ==================================================== */}
          {/* TAB 1: URUS KELAS */}
          {/* ==================================================== */}
          {activeTab === 'kelas' && (
            <div className="space-y-6">
              
              {/* Top Controls: Filter by Year & Add Class Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Tapis Tahun:
                  </span>
                  <button
                    onClick={() => setFilterYear('all')}
                    className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                      filterYear === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({classes.length})
                  </button>
                  {availableYears.map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setFilterYear(yr)}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                        filterYear === yr
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {yr} ({classes.filter((c) => c.year === yr).length})
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleStartAddClass}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Kelas Baharu</span>
                </button>
              </div>

              {/* Add / Edit Class Form Drawer */}
              {(isAddingClass || editingClassId) && (
                <div className="bg-indigo-50/70 border border-indigo-200 p-5 rounded-2xl animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                      <School className="w-4 h-4 text-indigo-600" />
                      <span>{editingClassId ? 'Edit Maklumat Kelas' : 'Daftar Kelas Baharu'}</span>
                    </h4>
                    <button
                      onClick={() => {
                        setIsAddingClass(false);
                        setEditingClassId(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Batal
                    </button>
                  </div>

                  <form onSubmit={handleSaveClass} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nama Kelas *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Tahun 5A, 4 Amanah"
                        value={classNameInput}
                        onChange={(e) => setClassNameInput(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tahun Sesi Persekolahan *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 2026, 2027, 2028, 2029"
                        value={classYearInput}
                        onChange={(e) => setClassYearInput(e.target.value)}
                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Darjah / Tingkatan (1 - 6)
                      </label>
                      <select
                        value={classGradeInput}
                        onChange={(e) => setClassGradeInput(Number(e.target.value))}
                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      >
                        {[1, 2, 3, 4, 5, 6].map((g) => (
                          <option key={g} value={g}>
                            Tahun {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nama Guru Bertanggungjawab
                      </label>
                      <input
                        type="text"
                        value={classTeacherInput}
                        onChange={(e) => setClassTeacherInput(e.target.value)}
                        placeholder="Choo Chee Hong"
                        className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingClass(false);
                          setEditingClassId(null);
                        }}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Save className="w-4 h-4" />
                        <span>{editingClassId ? 'Simpan Perubahan' : 'Daftar Kelas'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Class Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                      cls.id === selectedClassId ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200 font-mono">
                            {cls.year}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Darjah {cls.grade}
                          </span>
                        </div>
                        {cls.id === selectedClassId && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                            Aktif Sekarang
                          </span>
                        )}
                      </div>

                      <h4 className="text-lg font-bold text-slate-900 mb-1">
                        {cls.name}
                      </h4>
                      <p className="text-xs text-slate-500 mb-3">
                        Guru: <span className="font-semibold text-slate-700">{cls.teacherName}</span>
                      </p>

                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600 mb-4">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Bilangan Murid:</span>
                        </span>
                        <strong className="text-slate-900 font-bold">{cls.students.length} Orang</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEditClass(cls)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Kelas"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(cls.id, cls.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Padam Kelas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setStudentClassId(cls.id);
                            setActiveTab('murid');
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors flex items-center gap-1"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Urus Murid</span>
                        </button>
                        <button
                          onClick={() => {
                            onSelectYear(cls.year);
                            onSelectClass(cls.id);
                            showNotification(`Kelas ${cls.name} kini dipilih sebagai kelas aktif.`);
                          }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors"
                        >
                          Pilih
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: URUS MURID */}
          {/* ==================================================== */}
          {activeTab === 'murid' && (
            <div className="space-y-6">
              
              {/* Class Selector for student management */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Pilih Kelas:</span>
                  <select
                    value={studentClassId}
                    onChange={(e) => {
                      setStudentClassId(e.target.value);
                      setEditingStudentId(null);
                    }}
                    className="text-xs sm:text-sm font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} — {cls.students.length} Murid
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsBatchPasteOpen(!isBatchPasteOpen)}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Tampal Senarai Pantas (Batch Paste)</span>
                  </button>
                </div>
              </div>

              {/* Batch Paste Drawer */}
              {isBatchPasteOpen && (
                <div className="bg-amber-50/80 border border-amber-200 p-5 rounded-2xl animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>Tampal Senarai Murid Sekaligus</span>
                    </h4>
                    <button
                      onClick={() => setIsBatchPasteOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Tutup
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-3">
                    Tampal nama murid (satu nama setiap baris). Sistem secara pintar mengenali nombor giliran, nama rumi, nama tulisan Cina dan jantina secara automatik!
                  </p>

                  <textarea
                    rows={6}
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    placeholder={`Contoh format yang disokong:\n1. Darren Ng Wei Yang (黄维洋) - L\n2. Desmond Lim Rong Xun (林楷侖) - L\n3. Hiap Hui Ru (叶慧如) - P\n4. Irhan Ryanshah Bin Mat Zaky (益汉) - L\n5. Nur Amira Qalisha (亚米拉) - P`}
                    className="w-full p-3 bg-white border border-amber-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                  />

                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => setIsBatchPasteOpen(false)}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleProcessBatchPaste}
                      className="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm"
                    >
                      Proses & Tambah ke Kelas
                    </button>
                  </div>
                </div>
              )}

              {/* Add / Edit Individual Student Form */}
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <span>{editingStudentId ? 'Edit Murid' : 'Tambah Murid Individu'}</span>
                </h4>

                <form onSubmit={handleSaveStudent} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">No. Giliran</label>
                    <input
                      type="number"
                      value={studentRollNo}
                      onChange={(e) => setStudentRollNo(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Penuh Murid (Rumi) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Darren Ng Wei Yang"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Cina (Pilihan)</label>
                    <input
                      type="text"
                      placeholder="Contoh: 黄维洋"
                      value={studentChineseName}
                      onChange={(e) => setStudentChineseName(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Jantina</label>
                    <select
                      value={studentGender}
                      onChange={(e) => setStudentGender(e.target.value as 'L' | 'P')}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    >
                      <option value="L">Lelaki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 md:col-span-5 flex justify-end gap-2 pt-2">
                    {editingStudentId && (
                      <button
                        type="button"
                        onClick={resetStudentForm}
                        className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                      >
                        Batal Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingStudentId ? 'Kemaskini Murid' : 'Simpan Murid'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Students List Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Senarai Murid {currentStudentClass?.name} ({currentStudentClass?.students.length || 0} Orang)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Guru Kelas: <strong>{currentStudentClass?.teacherName || 'Cikgu'}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-bold">
                        <th className="p-3 w-12">No.</th>
                        <th className="p-3">Nama Rumi</th>
                        <th className="p-3">Nama Cina</th>
                        <th className="p-3 w-20">Jantina</th>
                        <th className="p-3 w-24">Mata</th>
                        <th className="p-3 w-24 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentStudentClass?.students.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-semibold text-slate-400">
                            {student.rollNo || idx + 1}
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            {student.name}
                          </td>
                          <td className="p-3">
                            {student.chineseName ? (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold font-sans">
                                {student.chineseName}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                student.gender === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                              }`}
                            >
                              {student.gender === 'L' ? 'Lelaki' : 'Perempuan'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-amber-600">
                            ⭐ {student.points}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleStartEditStudent(student)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Murid"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student.id, student.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Padam Murid"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {(!currentStudentClass?.students || currentStudentClass.students.length === 0) && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            Belum ada murid dalam kelas ini. Sila tambah murid menggunakan borang di atas atau gunakan fungsi Tampal Senarai Pantas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: TAHUN SETERUSNYA (2027, 2028, 2029) */}
          {/* ==================================================== */}
          {activeTab === 'tahun_seterusnya' && (
            <div className="space-y-6">
              
              {/* Highlight Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-300/60 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                  🗓️
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    Peralihan Sesi Persekolahan Seterusnya
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Cikgu boleh menjana sesi tahun baharu seperti <strong>2027, 2028, atau 2029</strong> dengan satu klik. Sistem akan menyediakan kelas baharu mengikut struktur sedia ada secara automatik.
                  </p>
                </div>
              </div>

              {/* Year Migration Wizard */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Jana Kelas untuk Tahun Seterusnya</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      1. Pilih Tahun Sumber (Tahun Asal)
                    </label>
                    <select
                      value={sourceYearForMigration}
                      onChange={(e) => setSourceYearForMigration(e.target.value)}
                      className="w-full text-xs sm:text-sm px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                    >
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>
                          Tahun {yr} ({classes.filter((c) => c.year === yr).length} Kelas Sedia Ada)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      2. Pilih Tahun Sasaran Seterusnya
                    </label>
                    <div className="flex items-center gap-2">
                      {['2027', '2028', '2029'].map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setTargetNextYear(yr)}
                          className={`flex-1 py-2 px-3 text-xs sm:text-sm font-bold rounded-xl border transition-all cursor-pointer ${
                            targetNextYear === yr
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {yr}
                        </button>
                      ))}
                      <input
                        type="text"
                        placeholder="Lain-lain"
                        value={targetNextYear}
                        onChange={(e) => setTargetNextYear(e.target.value)}
                        className="w-24 text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-center font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    3. Kaedah Penyediaan Senarai Murid
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      onClick={() => setPromotionMode('promote')}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                        promotionMode === 'promote'
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="prom_mode"
                        checked={promotionMode === 'promote'}
                        onChange={() => setPromotionMode('promote')}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <strong className="block text-xs text-slate-900 font-bold">
                          Maju Kelas & Bawa Murid (Disyorkan)
                        </strong>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Murid Tahun 1A dinaikkan ke Tahun 2A, Tahun 5A ke Tahun 6A berserta nama murid untuk tahun {targetNextYear}.
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => setPromotionMode('empty')}
                      className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                        promotionMode === 'empty'
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="prom_mode"
                        checked={promotionMode === 'empty'}
                        onChange={() => setPromotionMode('empty')}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <strong className="block text-xs text-slate-900 font-bold">
                          Cipta Kelas Kosong Baharu
                        </strong>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Mencipta kelas kosong untuk tahun {targetNextYear} supaya cikgu boleh memasukkan senarai murid baru secara berasingan.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Sasaran Sesi: <strong className="text-indigo-600 font-mono text-sm">{targetNextYear}</strong>
                  </span>

                  <button
                    onClick={handleMigrateToNextYear}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Jana Sesi Tahun {targetNextYear} Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Jump Academic Year List */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Senarai Sesi Persekolahan yang Didaftarkan</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {availableYears.map((yr) => {
                    const count = classes.filter((c) => c.year === yr).length;
                    const isCurrent = selectedYear === yr;
                    return (
                      <div
                        key={yr}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isCurrent
                            ? 'border-emerald-500 bg-emerald-50/50'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="text-lg font-black text-slate-900 font-mono">{yr}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{count} Kelas</div>
                        <button
                          onClick={() => {
                            onSelectYear(yr);
                            const firstClassInYear = classes.find((c) => c.year === yr);
                            if (firstClassInYear) onSelectClass(firstClassInYear.id);
                            showNotification(`Sesi aktif ditukar ke Tahun ${yr}.`);
                          }}
                          className={`mt-2 w-full py-1 text-[11px] font-bold rounded-lg transition-colors ${
                            isCurrent
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isCurrent ? 'Aktif' : 'Pilih Sesi'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: SANDARAN & SIMPANAN FAIL */}
          {/* ==================================================== */}
          {activeTab === 'sandaran' && (
            <div className="space-y-6">
              
              {/* Status Banner */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                      <span>Simpanan Tempatan Automatik Aktif</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800 font-bold">
                        Sentiasa Tersimpan
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800/90 mt-1 leading-relaxed">
                      Setiap kali semakan buku, markah bintang, penambahan murid atau kelas dibuat, semua data <strong>SJK(C) Alor Pongsu</strong> disimpan serta-merta di dalam pelayar peranti ini. Data anda tidak hilang walaupun anda menutup pelayar web atau komputer.
                    </p>
                  </div>
                </div>
              </div>

              {/* Google Drive Integration Section */}
              <div className="bg-white rounded-2xl border border-sky-200/80 p-5 shadow-xs overflow-hidden relative">
                <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-black">
                        <Cloud className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>Google Drive Cloud Backup</span>
                          {googleUser ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Tersambung
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Belum Disambung
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Simpan dan pulihkan sandaran terus ke akaun Google Drive rasmi MOE DELIMa (<span className="font-semibold text-sky-700">g-82190258@moe-dl.edu.my</span>).
                        </p>
                      </div>
                    </div>

                    {/* Google User Status */}
                    {googleUser && (
                      <div className="mt-3 flex items-center gap-2.5 p-2.5 bg-sky-50/70 border border-sky-100 rounded-xl text-xs text-slate-700">
                        {googleUser.photoURL ? (
                          <img
                            src={googleUser.photoURL}
                            alt="Avatar"
                            className="w-7 h-7 rounded-full border border-sky-300"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                            {googleUser.displayName?.charAt(0) || 'G'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate text-slate-900">
                            {googleUser.displayName || 'Guru SJK(C) Alor Pongsu'}
                          </div>
                          <div className="text-[11px] text-sky-700 font-mono truncate">
                            {googleUser.email || 'g-82190258@moe-dl.edu.my'}
                          </div>
                        </div>
                        <button
                          onClick={handleGoogleLogoutClick}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Log keluar akaun Google ini"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Log Keluar</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Google Action Buttons */}
                  <div className="w-full sm:w-auto shrink-0 flex flex-col sm:flex-row gap-2">
                    {!googleUser ? (
                      <button
                        onClick={handleGoogleSignInClick}
                        disabled={isSigningInGoogle}
                        className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                      >
                        {/* Official Google 'G' Icon */}
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        <span>{isSigningInGoogle ? 'Menyambungkan...' : 'Sambung Google Drive'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveToGoogleDrive}
                        disabled={isUploadingToDrive}
                        className="w-full sm:w-auto px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isUploadingToDrive ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CloudUpload className="w-4 h-4" />
                        )}
                        <span>{isUploadingToDrive ? 'Menyimpan...' : 'Simpan ke Google Drive'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Google Drive Saved Files List */}
                {googleUser && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-sky-600" />
                        <span>Fail Sandaran SJK(C) Alor Pongsu di Google Drive:</span>
                      </span>
                      <button
                        onClick={() => fetchDriveBackups()}
                        disabled={isLoadingDrive}
                        className="text-[11px] text-sky-600 hover:text-sky-800 flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                        <span>Segarkan</span>
                      </button>
                    </div>

                    {isLoadingDrive ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        Memuatkan senarai fail dari Google Drive...
                      </div>
                    ) : driveBackups.length === 0 ? (
                      <div className="py-3 px-3.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                        Belum ada fail sandaran di Google Drive. Klik butang <strong>"Simpan ke Google Drive"</strong> di atas untuk menyimpan sandaran pertama anda.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {driveBackups.map((f) => (
                          <div
                            key={f.id}
                            className="p-2.5 bg-slate-50 hover:bg-sky-50/50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 truncate">{f.name}</div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>
                                  Disimpan: {new Date(f.modifiedTime).toLocaleString('ms-MY', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {f.webViewLink && (
                                  <a
                                    href={f.webViewLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sky-600 hover:underline inline-flex items-center gap-0.5"
                                  >
                                    Buka Drive <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handlePromptRestoreFromDrive(f)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer"
                                title="Pulihkan data daripada fail sandaran ini"
                              >
                                Pulihkan
                              </button>
                              <button
                                onClick={() => handlePromptDeleteFromDrive(f)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Padam fail sandaran ini dari Google Drive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Download Backup Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Download className="w-4 h-4 text-indigo-600" />
                      <span>Muat Turun Fail Sandaran Sekolah (JSON)</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                      Cipta dan muat turun fail salinan sandaran (backup) lengkap untuk semua kelas, murid, tugasan dan rekod semakan buku. Anda boleh menyimpannya di dalam komputer riba, salin ke pendrive, atau muat naik secara manual ke Google Drive peribadi anda pada bila-bila masa.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-medium">🏫 SJK(C) Alor Pongsu</span>
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-medium">📋 {classes.length} Kelas Terkini</span>
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-medium">
                        👥 {classes.reduce((acc, c) => acc + c.students.length, 0)} Jumlah Murid
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleExportBackup}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Muat Turun Sandaran</span>
                  </button>
                </div>
              </div>

              {/* Restore Backup Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-amber-600" />
                      <span>Pulihkan Data Dari Fail Sandaran</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                      Pernah memuat turun fail sandaran sebelum ini atau ingin memindahkan rekod ke komputer guru yang lain? Pilih fail sandaran <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-700">.json</code> untuk memulihkan semua data kembali ke sistem.
                    </p>
                  </div>

                  <label className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Pilih Fail & Pulihkan</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Reset Data & Set Semula Sistem */}
              <div className="bg-rose-50/70 rounded-2xl border border-rose-200 p-5 shadow-xs">
                <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                  <div>
                    <h4 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>Set Semula Data Sistem (Reset Data)</span>
                    </h4>
                    <p className="text-xs text-rose-700 mt-1 max-w-xl leading-relaxed">
                      Kembalikan seluruh data sistem kepada tetapan asal rasmi Cikgu Choo Chee Hong (Tahun 1 BM, BI, Sains; Tahun 5 Matematik; Tahun 6 Sejarah) serta mengosongkan cache peranti ini.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm('PERHATIAN: Adakah anda pasti mahu RESET SEMUA DATA sistem dan mengembalikan nama rasmi Cikgu Choo Chee Hong?')) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Data Sekarang</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Mod Pentadbir:</span>
            <span>Choo Chee Hong</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>

      </div>

      {/* Confirmation Dialog Modal for Google Drive Mutating/Destructive Actions */}
      {confirmDialog && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmDialog.isDestructive
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-amber-100 text-amber-600'
                }`}
              >
                {confirmDialog.isDestructive ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer ${
                  confirmDialog.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {confirmDialog.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  History, 
  HardDrive, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RotateCcw, 
  FileText, 
  Sparkles, 
  CloudDownload, 
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { ClassGroup, Assignment } from '../types';
import { 
  scanAllStorageForRecoverableData, 
  RecoveredSnapshot 
} from '../utils/recoveryUtils';
import { 
  initAuth, 
  googleSignIn, 
  getAccessToken 
} from '../services/googleDriveAuth';
import { 
  listSchoolBackupsFromDrive, 
  downloadBackupFromDrive, 
  DriveBackupFile 
} from '../services/googleDriveService';

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (data: {
    classes: ClassGroup[];
    assignments: Assignment[];
    availableYears?: string[];
    selectedYear?: string;
  }) => Promise<void> | void;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  isOpen,
  onClose,
  onRestore,
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'drive' | 'file'>('local');
  const [localCandidates, setLocalCandidates] = useState<RecoveredSnapshot[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Google Drive state
  const [driveFiles, setDriveFiles] = useState<DriveBackupFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Notification / Toast
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const runScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const found = scanAllStorageForRecoverableData();
      setLocalCandidates(found);
      setIsScanning(false);
    }, 200);
  };

  useEffect(() => {
    if (isOpen) {
      runScan();
      // Check Drive auth status
      initAuth(
        (user) => {
          setDriveEmail(user.email || 'Akaun MOE');
        },
        () => {
          setDriveEmail(null);
        }
      );
    }
  }, [isOpen]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  const handleRestoreLocal = async (cand: RecoveredSnapshot) => {
    try {
      setRestoringId(cand.id);
      await onRestore({
        classes: cand.classes,
        assignments: cand.assignments,
        availableYears: cand.availableYears,
        selectedYear: cand.selectedYear,
      });
      showToast(`Berjaya memulihkan ${cand.stats.totalAssignments} tugasan & ${cand.stats.totalSubmissionsMarked} semakan!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      showToast('Gagal memulihkan data. Sila cuba lagi.', 'error');
    } finally {
      setRestoringId(null);
    }
  };

  const handleConnectDrive = async () => {
    try {
      setIsLoadingDrive(true);
      setDriveError(null);
      const res = await googleSignIn();
      if (res && res.accessToken) {
        setDriveEmail(res.user.email || 'Akaun MOE');
        const files = await listSchoolBackupsFromDrive(res.accessToken);
        setDriveFiles(files);
        showToast(`Tersambung ke Google Drive (${res.user.email || 'Akaun MOE'})`);
      }
    } catch (err: any) {
      console.error(err);
      setDriveError(err?.message || 'Sambungan Google Drive dibatalkan.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleRefreshDrive = async () => {
    const token = await getAccessToken();
    if (!token) {
      handleConnectDrive();
      return;
    }
    try {
      setIsLoadingDrive(true);
      setDriveError(null);
      const files = await listSchoolBackupsFromDrive(token);
      setDriveFiles(files);
    } catch (err: any) {
      console.error(err);
      setDriveError('Gagal memuatkan senarai fail Drive.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleRestoreDriveFile = async (file: DriveBackupFile) => {
    const token = await getAccessToken();
    if (!token) {
      showToast('Sila log masuk Google Drive semula.', 'error');
      return;
    }
    try {
      setRestoringId(file.id);
      const data = await downloadBackupFromDrive(token, file.id);
      if (data && data.classes && Array.isArray(data.classes)) {
        await onRestore({
          classes: data.classes,
          assignments: data.assignments || [],
          availableYears: data.availableYears,
          selectedYear: data.selectedYear,
        });
        showToast(`Berjaya memulihkan data daripada Google Drive: ${file.name}`);
        setTimeout(() => onClose(), 1200);
      } else {
        showToast('Format data dalam fail Google Drive ini tidak sah.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Gagal memulihkan fail dari Google Drive.', 'error');
    } finally {
      setRestoringId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let classes: ClassGroup[] = [];
        let assignments: Assignment[] = [];

        if (Array.isArray(parsed)) {
          if (parsed[0]?.students) classes = parsed;
          else if (parsed[0]?.submissions) assignments = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          if (Array.isArray(parsed.classes)) classes = parsed.classes;
          if (Array.isArray(parsed.assignments)) assignments = parsed.assignments;
        }

        if (classes.length > 0 || assignments.length > 0) {
          await onRestore({
            classes: classes.length > 0 ? classes : undefined as any,
            assignments,
            availableYears: parsed.availableYears,
            selectedYear: parsed.selectedYear,
          });
          showToast(`Berjaya memulihkan data daripada fail "${file.name}"!`);
          setTimeout(() => onClose(), 1200);
        } else {
          showToast('Fail JSON ini tidak mengandungi rekod kelas atau tugasan yang sah.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Gagal membaca fail JSON. Pastikan fail adalah format sandaran sah.', 'error');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        id="recovery-modal-container"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Pusat Pemulihan & Sandaran Rekod</h2>
              <p className="text-xs text-amber-100">
                Imbas dan pulihkan rekod semakan buku, tugasan atau markah yang hilang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Tutup"
            id="btn-close-recovery-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast inside modal */}
        {notice && (
          <div className={`mx-4 mt-3 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
            notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{notice.message}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('local')}
            id="tab-recovery-local"
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'local'
                ? 'bg-white text-amber-700 border-amber-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Storan Tempatan ({localCandidates.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('drive');
              if (driveEmail && driveFiles.length === 0) {
                handleRefreshDrive();
              }
            }}
            id="tab-recovery-drive"
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'drive'
                ? 'bg-white text-sky-700 border-sky-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Google Drive {driveEmail ? '(Tersambung)' : ''}</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            id="tab-recovery-file"
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-colors border-b-2 ${
              activeTab === 'file'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Fail Sandaran (.json)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: Local Storage Scanner */}
          {activeTab === 'local' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Salinan Sandaran Ditemui Dalam Storan Pelayar Anda
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sistem mengimbas kunci sandaran terdahulu dan arkib sejarah untuk memulihkan rekod semalam.
                  </p>
                </div>
                <button
                  onClick={runScan}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                  id="btn-rescan-storage"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Mengimbas...' : 'Imbas Semula'}</span>
                </button>
              </div>

              {localCandidates.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Tiada salinan sandaran automatik ditemui dalam memori pelayar ini.</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Jika anda pernah menyimpan ke Google Drive atau memuat turun fail sandaran, sila gunakan tab <strong>"Google Drive"</strong> atau <strong>"Fail Sandaran"</strong> di atas.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {localCandidates.map((cand, idx) => (
                    <div 
                      key={cand.id}
                      className={`p-4 rounded-xl border transition-all ${
                        idx === 0 
                          ? 'bg-amber-50/50 border-amber-300 shadow-xs' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800">{cand.sourceKey}</span>
                            {idx === 0 && (
                              <span className="text-[10px] uppercase font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-sm">
                                Paling Lengkap
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 block mt-0.5">{cand.timestamp}</span>

                          {/* Stats Pill Badges */}
                          <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs">
                            <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-1 rounded-lg font-medium">
                              <FileText className="w-3 h-3 text-sky-600" />
                              {cand.stats.totalAssignments} Tugasan/Semakan
                            </span>
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {cand.stats.totalSubmissionsMarked} Murid Ditanda
                            </span>
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                              ⭐ {cand.stats.totalPoints} Mata Terkumpul
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRestoreLocal(cand)}
                          disabled={restoringId === cand.id}
                          className="self-start sm:self-center flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50"
                          id={`btn-restore-${cand.id}`}
                        >
                          {restoringId === cand.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          <span>{restoringId === cand.id ? 'Memulihkan...' : 'Pulihkan Rekod Ini'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Google Drive */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-sky-600" />
                      <h4 className="font-bold text-sm text-sky-950">Sandaran Google Drive Rasmi</h4>
                    </div>
                    <p className="text-xs text-sky-800 mt-1">
                      Sambungkan ke akaun Google Drive MOE DELIMa (<span className="font-semibold">g-82190258@moe-dl.edu.my</span>) untuk melihat fail sandaran awan.
                    </p>
                    {driveEmail && (
                      <p className="text-xs text-emerald-700 font-bold mt-1">
                        ● Log masuk sebagai: {driveEmail}
                      </p>
                    )}
                  </div>

                  {!driveEmail ? (
                    <button
                      onClick={handleConnectDrive}
                      disabled={isLoadingDrive}
                      className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50"
                      id="btn-connect-google-drive-recovery"
                    >
                      {isLoadingDrive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                      <span>{isLoadingDrive ? 'Menyambungkan...' : 'Sambung Google Drive'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleRefreshDrive}
                      disabled={isLoadingDrive}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-sky-300 text-sky-700 font-semibold text-xs rounded-xl hover:bg-sky-100 transition-colors shrink-0 disabled:opacity-50"
                      id="btn-refresh-drive-files"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                      <span>Segarkan Senarai</span>
                    </button>
                  )}
                </div>
              </div>

              {driveError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{driveError}</span>
                </div>
              )}

              {/* List of files in drive */}
              {driveEmail && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Fail Sandaran Ditemui di Google Drive:
                  </h4>
                  {isLoadingDrive ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-600 mx-auto mb-2" />
                      Memuatkan senarai fail dari Google Drive...
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-500">
                      Tiada fail sandaran bertajuk "SJKC_Alor_Pongsu" ditemui dalam Google Drive ini.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {driveFiles.map((f) => (
                        <div key={f.id} className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300">
                          <div>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-sky-600" />
                              <span className="font-bold text-sm text-slate-800">{f.name}</span>
                            </div>
                            <span className="text-xs text-slate-400 block mt-0.5">
                              Dimuat naik: {new Date(f.modifiedTime).toLocaleString('ms-MY')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {f.webViewLink && (
                              <a
                                href={f.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Buka dalam Google Drive"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleRestoreDriveFile(f)}
                              disabled={restoringId === f.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                              id={`btn-restore-drive-${f.id}`}
                            >
                              {restoringId === f.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CloudDownload className="w-3.5 h-3.5" />
                              )}
                              <span>{restoringId === f.id ? 'Memulihkan...' : 'Pulihkan'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: JSON File Upload */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="p-6 border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-2xl text-center">
                <Upload className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-emerald-950">Pilih Fail Sandaran (.json) dari Komputer / Telefon</h4>
                <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                  Jika anda pernah memuat turun fail sandaran sebelum ini menggunakan butang "Muat Turun Sandaran", pilih fail tersebut di sini untuk memulihkan rekod serta-merta.
                </p>

                <div className="mt-4">
                  <label 
                    htmlFor="recovery-file-input"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-colors"
                    id="lbl-upload-recovery-file"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Pilih Fail Sandaran (.json)</span>
                  </label>
                  <input
                    type="file"
                    id="recovery-file-input"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            * Sebarang data yang dipulihkan akan disegerakkan terus ke pelayan dan storan peranti anda.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            id="btn-close-recovery-footer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

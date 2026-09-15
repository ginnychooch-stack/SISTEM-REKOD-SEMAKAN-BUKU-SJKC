import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  Award, 
  Users, 
  ArrowUpRight, 
  Printer, 
  FileSpreadsheet,
  Check,
  X,
  Star,
  Search,
  Clock
} from 'lucide-react';
import { ClassGroup, Assignment } from '../types';
import { getSubmissionStatus } from '../utils/statusUtils';
import { getMainSubjectsForGrade } from '../data/initialData';

interface PerformanceDashboardProps {
  currentClass: ClassGroup;
  assignments: Assignment[];
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  currentClass,
  assignments,
  selectedSubject,
  onSelectSubject,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const availableSubjects = getMainSubjectsForGrade(currentClass.grade);

  // Calculate metrics per student strictly for current class and selected subject (Requirement 9)
  const classAssignments = assignments.filter(
    (a) => a.classId === currentClass.id && a.subject === selectedSubject
  );
  const totalTasks = classAssignments.length;

  const studentStats = currentClass.students.map((student) => {
    let dihantarCount = 0;
    let belumHantarCount = 0;
    let belumDisemakCount = 0;
    let remarksCount: Record<string, number> = {};

    classAssignments.forEach((task) => {
      const sub = task.submissions[student.id];
      const status = getSubmissionStatus(sub);
      if (status === 'DIHANTAR') {
        dihantarCount++;
        if (sub?.remark) {
          remarksCount[sub.remark] = (remarksCount[sub.remark] || 0) + 1;
        }
      } else if (status === 'BELUM_HANTAR') {
        belumHantarCount++;
      } else {
        belumDisemakCount++;
      }
    });

    // Formula Kadar Penghantaran (Kecualikan Belum Disemak):
    // Jika ada semakan (dihantar + belum hantar > 0): (dihantar / (dihantar + belum_hantar)) * 100
    const semakanSelesai = dihantarCount + belumHantarCount;
    const rate = semakanSelesai > 0 ? Math.round((dihantarCount / semakanSelesai) * 100) : 0;
    
    // Check recent trend
    let isImproving = false;
    if (totalTasks >= 2) {
      const lastStatus = getSubmissionStatus(classAssignments[0]?.submissions[student.id]);
      const prevStatus = getSubmissionStatus(classAssignments[1]?.submissions[student.id]);
      if (lastStatus === 'DIHANTAR' && prevStatus === 'BELUM_HANTAR') {
        isImproving = true;
      }
    }

    return {
      student,
      submittedCount: dihantarCount,
      dihantarCount,
      belumHantarCount,
      belumDisemakCount,
      semakanSelesai,
      totalTasks,
      rate,
      isImproving,
      remarksCount,
    };
  });

  // Categorize students only among those with semakan selesai
  const studentsWithReview = studentStats.filter((s) => s.semakanSelesai > 0);
  // 1. Murid Konsisten (100% or highest rate)
  const consistentStudents = studentsWithReview.filter((s) => s.rate >= 90);
  
  // 2. Murid Menunjukkan Peningkatan
  const improvingStudents = studentsWithReview.filter((s) => s.isImproving || (s.rate >= 65 && s.rate < 90));
  
  // 3. Murid Perlu Perhatian (< 65%)
  const needsAttentionStudents = studentsWithReview.filter((s) => s.rate < 65);

  // Overall class submission rate (excluding BELUM_DISEMAK)
  const totalSemakanKelas = studentStats.reduce((acc, curr) => acc + curr.semakanSelesai, 0);
  const totalDihantarKelas = studentStats.reduce((acc, curr) => acc + curr.dihantarCount, 0);
  const averageClassRate = totalSemakanKelas > 0 ? Math.round((totalDihantarKelas / totalSemakanKelas) * 100) : 0;

  // Filter for table
  const filteredTable = studentStats.filter((s) => {
    const q = searchTerm.toLowerCase();
    const matchName = s.student.name.toLowerCase().includes(q);
    const matchChinese = s.student.chineseName ? s.student.chineseName.includes(searchTerm.trim()) : false;
    return matchName || matchChinese;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Bar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-blue-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl sm:text-2xl font-bold font-serif">
                Dashboard Corak Prestasi & Semakan
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-blue-200">
              Analisis corak penghantaran buku: <strong className="text-amber-300">{currentClass.name}</strong> • Subjek: <strong className="text-amber-300">{selectedSubject}</strong> ({totalTasks} tugasan direkodkan).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Subject Selector Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
              <span className="text-[11px] font-bold text-slate-300 px-1 hidden md:inline">Subjek:</span>
              {availableSubjects.map((s) => (
                <button
                  key={s}
                  onClick={() => onSelectSubject(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedSubject === s
                      ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-300 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-300" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* 3 Summary Stats in Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-blue-800/50">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-xs text-blue-300 font-medium">Kadar Purata Kelas</span>
            <div className="text-2xl font-extrabold text-white flex items-center gap-2 mt-0.5">
              <span>{averageClassRate}%</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                averageClassRate >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {averageClassRate >= 80 ? 'Sangat Baik' : 'Sederhana'}
              </span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-xs text-blue-300 font-medium">Buku Dihantar (Selesai Semak)</span>
            <div className="text-2xl font-extrabold text-white mt-0.5">
              {totalDihantarKelas} <span className="text-xs text-blue-300 font-normal">daripada {totalSemakanKelas} semakan</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-xs text-blue-300 font-medium">Murid Perlu Perhatian</span>
            <div className="text-2xl font-extrabold text-rose-300 flex items-center gap-2 mt-0.5">
              <span>{needsAttentionStudents.length} Orang</span>
              <span className="text-xs text-rose-300/80 font-normal">
                ({Math.round((needsAttentionStudents.length / currentClass.students.length) * 100)}% kelas)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Analytical Categories from user prompt */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Siapa Konsisten */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  🌟
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Murid Sangat Konsisten</h3>
                  <span className="text-[11px] text-emerald-600 font-semibold">Kadar Hantar 90% - 100%</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                {consistentStudents.length} Murid
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Murid sentiasa menghantar buku mengikut masa dengan kualiti tugasan yang cemerlang.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {consistentStudents.map((item) => (
                <div
                  key={item.student.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 border border-emerald-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                      {item.student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-800">
                          {item.student.name}
                        </span>
                        {item.student.chineseName && (
                          <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                            {item.student.chineseName}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {item.submittedCount}/{item.totalTasks} tugasan selesai
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    {item.rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-100 text-center">
            <span className="text-xs font-semibold text-emerald-700">
              🏆 Calon Anugerah Bintang Cemerlang
            </span>
          </div>
        </div>

        {/* 2. Siapa Makin Baik (Peningkatan) */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-blue-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  📈
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Menunjukkan Peningkatan</h3>
                  <span className="text-[11px] text-blue-600 font-semibold">Corak Positif & Rajin</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                {improvingStudents.length} Murid
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Murid yang mula rajin menghantar buku latihan terbaru berbanding sebelumnya.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {improvingStudents.map((item) => (
                <div
                  key={item.student.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-blue-50/70 border border-blue-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      {item.student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-800">
                          {item.student.name}
                        </span>
                        {item.student.chineseName && (
                          <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-300">
                            {item.student.chineseName}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-blue-600 flex items-center gap-0.5 font-medium">
                        <TrendingUp className="w-3 h-3" /> Peningkatan dikesan
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                    {item.rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-blue-100 text-center">
            <span className="text-xs font-semibold text-blue-700">
              👏 Galakkan & Beri Pujian Berterusan
            </span>
          </div>
        </div>

        {/* 3. Siapa Perlu Diberi Perhatian */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  ⚠️
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Perlu Diberi Perhatian</h3>
                  <span className="text-[11px] text-rose-600 font-semibold">Kadar Hantar Bawah 65%</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                {needsAttentionStudents.length} Murid
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Kerap tertinggal atau belum menghantar beberapa buku latihan. Perlu tindakan bimbingan & hubungi waris.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {needsAttentionStudents.map((item) => (
                <div
                  key={item.student.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-rose-50/70 border border-rose-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center">
                      {item.student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-800">
                          {item.student.name}
                        </span>
                        {item.student.chineseName && (
                          <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-rose-100 text-rose-900 border border-rose-300">
                            {item.student.chineseName}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-rose-600 font-semibold">
                        Tertinggal {item.totalTasks - item.submittedCount} tugasan
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-rose-700 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                    {item.rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-100 text-center">
            <span className="text-xs font-semibold text-rose-700">
              📞 Peringatan Waris / Sesi Bimbingan
            </span>
          </div>
        </div>
      </div>

      {/* Full Class Semakan Matrix / Heatmap Table */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Matriks Rekod Semakan Keseluruhan
            </h3>
            <p className="text-xs text-slate-500">
              Peta semakan setiap murid merentasi semua tugasan dan lembaran kerja
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari dalam jadual..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <th className="p-3">#</th>
                <th className="p-3">Nama Murid</th>
                {classAssignments.map((task) => (
                  <th key={task.id} className="p-3 text-center min-w-[120px]">
                    <span className="block font-bold">{task.title}</span>
                    <span className="block text-[10px] text-slate-500 font-normal">
                      {task.subject}
                    </span>
                  </th>
                ))}
                <th className="p-3 text-center">Selesai</th>
                <th className="p-3 text-center">Kadar (%)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTable.map((item, index) => (
                <tr key={item.student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-slate-400 font-medium">{item.student.rollNo || index + 1}</td>
                  <td className="p-3 font-bold text-slate-900">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{item.student.name}</span>
                      {item.student.chineseName && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                          {item.student.chineseName}
                        </span>
                      )}
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        ⭐ {item.student.points}
                      </span>
                    </div>
                  </td>
                  {classAssignments.map((task) => {
                    const sub = task.submissions[item.student.id];
                    const status = getSubmissionStatus(sub);
                    return (
                      <td key={task.id} className="p-3 text-center">
                        {status === 'DIHANTAR' ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 shadow-xs" title="Telah Dihantar">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        ) : status === 'BELUM_HANTAR' ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 shadow-xs" title="Belum Hantar">
                            <X className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400" title="Belum Disemak">
                            <Clock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-3 text-center font-semibold text-slate-800">
                    {item.submittedCount} / {item.totalTasks}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                      item.rate >= 90
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.rate >= 65
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.rate}%
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {item.rate >= 90 ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Konsisten 🌟
                      </span>
                    ) : item.rate >= 65 ? (
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Memuaskan 📈
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Perlu Perhatian ⚠️
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, PlusCircle, BookOpen, Calendar, Star, Layers, Sparkles } from 'lucide-react';
import { Assignment, BookType, ClassGroup } from '../types';
import { SUBJECTS_LIST, GRADE_SUBJECTS_MAP, getSubjectsForGrade } from '../data/initialData';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClass: ClassGroup;
  selectedSubject?: string;
  onCreateTask: (task: Omit<Assignment, 'id' | 'submissions'>) => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  currentClass,
  selectedSubject,
  onCreateTask,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const classSubjects = getSubjectsForGrade(currentClass.grade);
  const primarySubjects = GRADE_SUBJECTS_MAP[currentClass.grade] || [];

  const [subject, setSubject] = useState(selectedSubject || classSubjects[0] || 'Bahasa Melayu');
  const [title, setTitle] = useState('');
  const [bookType, setBookType] = useState<BookType>('Buku Latihan (Tulis/Kira)');
  const [dateAssigned, setDateAssigned] = useState(today);
  const [dueDate, setDueDate] = useState(tomorrow);
  const [pointsValue, setPointsValue] = useState(10);

  // Update default subject when currentClass or selectedSubject changes
  useEffect(() => {
    if (isOpen) {
      setSubject(selectedSubject || getSubjectsForGrade(currentClass.grade)[0] || 'Bahasa Melayu');
    }
  }, [isOpen, currentClass.grade, selectedSubject]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Sila masukkan tajuk tugasan atau latihan.');
      return;
    }

    onCreateTask({
      classId: currentClass.id,
      subject,
      title: title.trim(),
      bookType,
      dateAssigned,
      dueDate,
      pointsValue: Number(pointsValue) || 10,
    });

    onClose();
    setTitle('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl">
            ➕
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Cipta Tugasan Semakan Baharu
            </h3>
            <p className="text-xs text-slate-500">
              Kelas: <span className="font-bold text-slate-800">{currentClass.name} (Tahun {currentClass.grade})</span>
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Mata Pelajaran:
              </label>
              {primarySubjects.length > 0 && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Subjek Cikgu Choo (Tahun {currentClass.grade})
                </span>
              )}
            </div>

            {/* Quick selector buttons for user's designated subjects */}
            {primarySubjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {primarySubjects.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubject(s)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                      subject === s
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    ★ {s}
                  </button>
                ))}
              </div>
            )}

            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {classSubjects.map((subj) => (
                <option key={subj} value={subj}>
                  {primarySubjects.includes(subj) ? `⭐ ${subj} (Subjek Cikgu Choo)` : subj}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              TAJUK TUGAS: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Masukkan tajuk tugasan... (cth: Latihan Kata Nama, Unit 5 - Animals, Buku Aktiviti m/s 25)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Book Type */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Jenis Buku / Bahan:
            </label>
            <select
              value={bookType}
              onChange={(e) => setBookType(e.target.value as BookType)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Lembaran Kerja / Worksheet">Lembaran Kerja / Worksheet</option>
              <option value="Buku Latihan (Tulis/Kira)">Buku Latihan (Tulis/Kira)</option>
              <option value="Buku Aktiviti/Modul">Buku Aktiviti/Modul</option>
              <option value="Buku Nota / Rumusan">Buku Nota / Rumusan</option>
              <option value="Buku Teks">Buku Teks</option>
            </select>
          </div>

          {/* Dates & Points in 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tarikh Beri (Kalendar):</span>
              </label>
              <input
                type="date"
                value={dateAssigned}
                onChange={(e) => setDateAssigned(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tarikh Akhir (Kalendar):</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Ganjaran Mata bagi Setiap Buku Disemak:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="100"
                value={pointsValue}
                onChange={(e) => setPointsValue(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-500">
                ⭐ Murid yang menghantar buku ini akan menerima +{pointsValue} mata ganjaran secara automatik.
              </span>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all active:scale-95"
            >
              Simpan & Mula Semakan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

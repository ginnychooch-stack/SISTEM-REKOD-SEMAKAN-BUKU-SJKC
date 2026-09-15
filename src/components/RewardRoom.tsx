import React, { useState } from 'react';
import { 
  Trophy, 
  Sparkles, 
  Gift, 
  Star, 
  Award, 
  Plus, 
  Check, 
  Flame, 
  Medal,
  Users,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ClassGroup, RewardItem, Student } from '../types';
import { INITIAL_REWARDS, getMainSubjectsForGrade } from '../data/initialData';
import { playCelebrationFanfare, playSuccessDing } from '../utils/audio';

interface RewardRoomProps {
  currentClass: ClassGroup;
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
  onAddStudentPoints: (studentId: string, amount: number, subject: string) => void;
  onDeductStudentPoints: (studentId: string, amount: number, subject: string) => void;
  soundEnabled: boolean;
}

export const RewardRoom: React.FC<RewardRoomProps> = ({
  currentClass,
  selectedSubject,
  onSelectSubject,
  onAddStudentPoints,
  onDeductStudentPoints,
  soundEnabled,
}) => {
  const [rewards, setRewards] = useState<RewardItem[]>(INITIAL_REWARDS);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    currentClass.students[0]?.id || ''
  );
  const [redemptionSuccessMsg, setRedemptionSuccessMsg] = useState<string | null>(null);

  const availableSubjects = getMainSubjectsForGrade(currentClass.grade);

  // Helper to get points for student strictly in current selectedSubject (Requirement 1)
  const getSubjectPoints = (student: Student): number => {
    return student.subjectPoints?.[selectedSubject] || 0;
  };

  // Sorted leaderboard by points in current subject descending
  const sortedStudents = [...currentClass.students].sort(
    (a, b) => getSubjectPoints(b) - getSubjectPoints(a)
  );
  const activeStudent = currentClass.students.find((s) => s.id === selectedStudentId);
  const activeStudentSubjectPoints = activeStudent ? getSubjectPoints(activeStudent) : 0;

  const totalClassSubjectPoints = currentClass.students.reduce(
    (sum, s) => sum + getSubjectPoints(s),
    0
  );

  const handleRedeem = (reward: RewardItem) => {
    if (!activeStudent) return;
    if (activeStudentSubjectPoints < reward.pointsCost) {
      alert(
        `Mata ${activeStudent.name} (${activeStudentSubjectPoints} mata dalam ${selectedSubject}) tidak mencukupi untuk menebus "${reward.title}" (${reward.pointsCost} mata).`
      );
      return;
    }

    onDeductStudentPoints(activeStudent.id, reward.pointsCost, selectedSubject);
    playCelebrationFanfare(soundEnabled);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    setRedemptionSuccessMsg(
      `Tahniah! ${activeStudent.name} berjaya menebus "${reward.title}" dengan ${reward.pointsCost} mata bagi subjek ${selectedSubject}!`
    );

    setTimeout(() => {
      setRedemptionSuccessMsg(null);
    }, 4000);
  };

  const handleQuickBonus = (studentId: string, amount: number, reason: string) => {
    onAddStudentPoints(studentId, amount, selectedSubject);
    playSuccessDing(soundEnabled);
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.7 },
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner for Bilik Ganjaran */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 skew-x-12 pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-3xl shadow-inner">
              🏆
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="text-2xl font-bold font-serif">Bilik Ganjaran Murid</h2>
                <span className="bg-white/20 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {currentClass.name}
                </span>
                <span className="bg-slate-900/40 text-amber-200 text-xs px-2.5 py-0.5 rounded-full font-extrabold border border-amber-300/40">
                  Subjek: {selectedSubject}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-100 mt-1">
                Kumpul mata setiap kali menghantar buku latihan ({selectedSubject}) dan tebus ganjaran istimewa.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3 bg-black/25 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/20">
            <Star className="w-6 h-6 text-amber-200 fill-amber-300" />
            <div>
              <span className="text-[11px] text-amber-200 block uppercase font-bold">
                Mata Kelas ({selectedSubject})
              </span>
              <span className="text-xl font-black text-white">
                {totalClassSubjectPoints} Mata
              </span>
            </div>
          </div>
        </div>

        {/* Subject Selector Tabs within Reward Room */}
        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-100">
            <BookOpen className="w-4 h-4 text-amber-200" />
            <span>Pilih Subjek:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {availableSubjects.map((s) => {
              const isActive = selectedSubject === s;
              return (
                <button
                  key={s}
                  onClick={() => onSelectSubject(s)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-950 shadow-md font-extrabold scale-[1.03]'
                      : 'bg-black/20 text-white hover:bg-black/30 border border-white/20'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {redemptionSuccessMsg && (
        <div className="bg-emerald-600 text-white p-4 rounded-xl font-bold text-center flex items-center justify-center gap-2 animate-bounce shadow-md">
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span>{redemptionSuccessMsg}</span>
        </div>
      )}

      {/* Main Two Column Layout: Leaderboard & Redeem Shop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Leaderboard Top Murid Rajin (5 columns) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-800 text-base">
                Carta Murid: {selectedSubject}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              Mata Subjek
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] pr-1">
            {sortedStudents.map((student, rank) => {
              const isSelected = student.id === selectedStudentId;
              const points = getSubjectPoints(student);
              let medalEmoji = null;
              if (rank === 0 && points > 0) medalEmoji = '🥇';
              else if (rank === 1 && points > 0) medalEmoji = '🥈';
              else if (rank === 2 && points > 0) medalEmoji = '🥉';

              return (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50/80 border-amber-400 shadow-sm ring-2 ring-amber-400/30'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-5 text-center">
                      {medalEmoji || rank + 1}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                        student.gender === 'P'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">
                          {student.name}
                        </span>
                        {student.chineseName && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            ({student.chineseName})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        No. {student.rollNo || rank + 1}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="font-black text-amber-600 text-sm block">
                        {points}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Mata
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickBonus(student.id, 5, 'Bonus Cemerlang');
                      }}
                      className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 text-xs font-bold cursor-pointer"
                      title="+5 Mata Bonus Subjek"
                    >
                      +5
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Reward Shop & Active Student Redemption (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Student Selector Box */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/80 shadow-sm bg-gradient-to-br from-amber-50/40 via-white to-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Pilih Murid untuk Penebusan / Bonus:
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    id="student-select-rewards"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  >
                    {currentClass.students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.chineseName ? `(${s.chineseName})` : ''} - {getSubjectPoints(s)} Mata ({selectedSubject})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeStudent && (
                <div className="flex items-center gap-2 bg-amber-100/90 border border-amber-300 px-3.5 py-2 rounded-xl">
                  <Star className="w-5 h-5 text-amber-600 fill-amber-500" />
                  <div>
                    <span className="text-[10px] text-amber-900 font-bold block uppercase">
                      Baki Mata ({selectedSubject})
                    </span>
                    <span className="text-lg font-black text-amber-950">
                      {activeStudentSubjectPoints} Mata
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reward Catalog */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Katalog Lencana & Ganjaran
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Penebusan menggunakan mata {selectedSubject}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rewards.map((reward) => {
                const canAfford = activeStudentSubjectPoints >= reward.pointsCost;
                return (
                  <div
                    key={reward.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      canAfford
                        ? 'bg-slate-50/70 border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
                        : 'bg-slate-50/30 border-slate-200/60 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl p-2 bg-white rounded-xl shadow-xs border border-slate-100 shrink-0">
                        {reward.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">
                          {reward.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {reward.description}
                        </p>
                        <span className="inline-block mt-2 font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md text-xs">
                          {reward.pointsCost} Mata
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canAfford}
                      className={`mt-3 w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 shadow-xs'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>{canAfford ? 'Tebus Sekarang' : 'Mata Tidak Cukup'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

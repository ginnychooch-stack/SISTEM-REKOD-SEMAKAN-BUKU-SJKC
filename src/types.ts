export interface Student {
  id: string;
  rollNo?: number;
  name: string;
  chineseName?: string;
  gender: 'L' | 'P';
  avatarSeed: string;
  points: number;
  stars: number;
  subjectPoints?: Record<string, number>;
  subjectStars?: Record<string, number>;
}

export type BookType = 
  | 'Buku Latihan (Tulis/Kira)' 
  | 'Buku Aktiviti/Modul' 
  | 'Lembaran Kerja / Worksheet' 
  | 'Buku Nota / Rumusan' 
  | 'Buku Teks';

export type RemarkType = 
  | 'Cemerlang & Kemas ⭐' 
  | 'Lengkap & Teliti ✍️' 
  | 'Tulisan Sangat Kemas 🌟' 
  | 'Perlu Pembetulan ⚠️' 
  | 'Hantar Lewat 🕒' 
  | 'Sangat Rajin 🔥';

export type SubmissionStatus = 'BELUM_DISEMAK' | 'DIHANTAR' | 'BELUM_HANTAR' | 'TIDAK_SIAP';

export interface SubmissionItem {
  studentId: string;
  status?: SubmissionStatus; // 'BELUM_DISEMAK' | 'DIHANTAR' | 'BELUM_HANTAR' | 'TIDAK_SIAP'
  submitted?: boolean; // kept for backwards compatibility if needed (true for DIHANTAR & TIDAK_SIAP)
  submittedAt?: string;
  pointsAwarded: number;
  remark?: RemarkType;
  correctionDone?: boolean;
  workNote?: string; // Ruang menaip untuk kerja/catatan kerja murid (cth: jawapan, markah, ms latihan, topik)
  incompleteNote?: string; // Sebab / Catatan Kerja Tidak Siap
}

export interface Assignment {
  id: string;
  classId: string;
  subject: string;
  title: string;
  bookType: BookType;
  dateAssigned: string; // YYYY-MM-DD
  dueDate: string;      // YYYY-MM-DD
  pointsValue: number;  // e.g. 10 or 1
  submissions: Record<string, SubmissionItem>; // key is studentId
}

export interface ClassGroup {
  id: string;
  name: string; // e.g. "Tahun 5A"
  grade: number; // 5
  year: string;  // "2026"
  teacherName: string; // "Choo Chee Hong"
  students: Student[];
}

export interface RewardItem {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  icon: string;
  category: 'Lencana' | 'Hak Istimewa' | 'Hadiah Fizikal';
  availableStock?: number;
}

export type ActiveTab = 'rekod' | 'ganjaran' | 'prestasi';

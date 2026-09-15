import { ClassGroup, Assignment, RewardItem } from '../types';

export const INITIAL_CLASSES: ClassGroup[] = [
  {
    id: 'class-1a',
    name: 'Tahun 1A',
    grade: 1,
    year: '2026',
    teacherName: 'Choo Chee Hong',
    students: [
      { id: '1a-1', rollNo: 1, name: 'Cheng Zhi Qi', chineseName: '钟芷琪', gender: 'P', avatarSeed: 'ZhiQi', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '1a-2', rollNo: 2, name: 'Hiap Zhi Han Aden', chineseName: '叶子翰', gender: 'L', avatarSeed: 'Aden', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '1a-3', rollNo: 3, name: 'Khor Shine Earn', chineseName: '许鑫恩', gender: 'P', avatarSeed: 'ShineEarn', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '1a-4', rollNo: 4, name: 'Mohd. Arsyah Fadzil Syah', chineseName: '阿尔沙', gender: 'L', avatarSeed: 'Arsyah', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '1a-5', rollNo: 5, name: 'Neoh Zi Ying', chineseName: '梁子颖', gender: 'P', avatarSeed: 'ZiYing', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '1a-6', rollNo: 6, name: 'Noah Zafriel Bin Saarani', chineseName: '查菲尔', gender: 'L', avatarSeed: 'Noah', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '1a-7', rollNo: 7, name: 'Nursafiyya Eriesya Binti Abdullah', chineseName: '艾丽莎', gender: 'P', avatarSeed: 'Eriesya', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '1a-8', rollNo: 8, name: 'Saw Xin Ci', chineseName: '苏欣慈', gender: 'P', avatarSeed: 'XinCi', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
    ],
  },
  {
    id: 'class-5a',
    name: 'Tahun 5A',
    grade: 5,
    year: '2026',
    teacherName: 'Choo Chee Hong',
    students: [
      { id: '5a-1', rollNo: 1, name: 'Darren Ng Wei Yang', chineseName: '黄维洋', gender: 'L', avatarSeed: 'Darren', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '5a-2', rollNo: 2, name: 'Desmond Lim Rong Xun', chineseName: '林楷侖', gender: 'L', avatarSeed: 'Desmond', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '5a-3', rollNo: 3, name: 'Hiap Hui Ru', chineseName: '叶慧如', gender: 'P', avatarSeed: 'HuiRu', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '5a-4', rollNo: 4, name: 'Irhan Ryanshah Bin Mat Zaky', chineseName: '益汉', gender: 'L', avatarSeed: 'Irhan', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '5a-5', rollNo: 5, name: 'Jacqueline Ong Jia Qi', chineseName: '王佳溱', gender: 'P', avatarSeed: 'Jacqueline', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '5a-6', rollNo: 6, name: 'Khor Por Hwang', chineseName: '许博煌', gender: 'L', avatarSeed: 'PorHwang', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '5a-7', rollNo: 7, name: 'Nur Amira Qalisha Binti Abdullah', chineseName: '亚米拉', gender: 'P', avatarSeed: 'Amira', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '5a-8', rollNo: 8, name: 'Nur Qaisarah Aisyah Binti Jasmin', chineseName: '艾莎', gender: 'P', avatarSeed: 'Qaisarah', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '5a-9', rollNo: 9, name: 'Saw Sun Bing', chineseName: '苏孙鉷', gender: 'L', avatarSeed: 'SunBing', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
    ],
  },
  {
    id: 'class-6a',
    name: 'Tahun 6A',
    grade: 6,
    year: '2026',
    teacherName: 'Choo Chee Hong',
    students: [
      { id: '6a-1', rollNo: 1, name: 'Hiap Yong Ren', chineseName: '叶泳仁', gender: 'L', avatarSeed: 'YongRen', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '6a-2', rollNo: 2, name: 'Loh Yi Le', chineseName: '罗怿乐', gender: 'L', avatarSeed: 'YiLe', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
      { id: '6a-3', rollNo: 3, name: 'Sarveen A/L Pregalathan', chineseName: '莎文', gender: 'L', avatarSeed: 'Sarveen', points: 0, stars: 0, subjectPoints: {}, subjectStars: {} },
    ],
  },
];

// Semakan kosong: Tiada data contoh / dummy / demo
export const INITIAL_ASSIGNMENTS: Assignment[] = [];

export const INITIAL_REWARDS: RewardItem[] = [
  {
    id: 'rew-1',
    title: 'Lencana Tokoh Buku Kemas',
    description: 'Pin lencana khas disematkan pada pakaian seragam murid.',
    pointsCost: 50,
    icon: '🏅',
    category: 'Lencana',
    availableStock: 25,
  },
  {
    id: 'rew-2',
    title: 'Pilihan Tempat Duduk Seminggu',
    description: 'Boleh memilih rakan sebelah atau meja kegemaran selama seminggu.',
    pointsCost: 70,
    icon: '🪑',
    category: 'Hak Istimewa',
    availableStock: 10,
  },
  {
    id: 'rew-3',
    title: 'Pen Gel Pelangi & Pemadam Comel',
    description: 'Set alat tulis berwarna-warni gred premium dari cikgu.',
    pointsCost: 90,
    icon: '🖊️',
    category: 'Hadiah Fizikal',
    availableStock: 15,
  },
  {
    id: 'rew-4',
    title: 'Kupon Ketua Barisan Rehat',
    description: 'Hak istimewa memimpin barisan kelas sewaktu ke kantin.',
    pointsCost: 40,
    icon: '🎟️',
    category: 'Hak Istimewa',
    availableStock: 20,
  },
  {
    id: 'rew-5',
    title: 'Sijil Penghargaan Rajin Cemerlang',
    description: 'Sijil rasmi bertandatangan Guru Besar & Guru Kelas.',
    pointsCost: 120,
    icon: '📜',
    category: 'Lencana',
    availableStock: 30,
  },
  {
    id: 'rew-6',
    title: 'Pelekat Bintang Emas 3D Hologram',
    description: 'Pek pelekat eksklusif untuk dihias pada buku nota kegemaran.',
    pointsCost: 30,
    icon: '⭐',
    category: 'Hadiah Fizikal',
    availableStock: 40,
  },
];

export const SUBJECTS_LIST = [
  'Bahasa Melayu',
  'Bahasa Inggeris',
  'Matematik',
  'Sains',
  'Sejarah',
  'Pendidikan Islam / Moral',
  'Reka Bentuk & Teknologi',
  'Pendidikan Seni Visual',
];

// Konfigurasi Subjek Khusus Cikgu Choo Chee Hong mengikut Tahun:
// Tahun 1: BM, BI, Sains
// Tahun 5: Matematik
// Tahun 6: Sejarah
export const GRADE_SUBJECTS_MAP: Record<number, string[]> = {
  1: ['Bahasa Melayu', 'Bahasa Inggeris', 'Sains'],
  5: ['Matematik'],
  6: ['Sejarah'],
};

export const getMainSubjectsForGrade = (grade: number): string[] => {
  if (grade === 1) {
    return ['Bahasa Melayu', 'Bahasa Inggeris', 'Sains'];
  }
  if (GRADE_SUBJECTS_MAP[grade] && GRADE_SUBJECTS_MAP[grade].length > 0) {
    return GRADE_SUBJECTS_MAP[grade];
  }
  return ['Bahasa Melayu', 'Bahasa Inggeris', 'Sains'];
};

export const getSubjectsForGrade = (grade: number): string[] => {
  const specific = GRADE_SUBJECTS_MAP[grade];
  if (specific && specific.length > 0) {
    // Return specific subjects first, followed by other subjects
    const remaining = SUBJECTS_LIST.filter((s) => !specific.includes(s));
    return [...specific, ...remaining];
  }
  return SUBJECTS_LIST;
};

export const REMARKS_LIST = [
  'Cemerlang & Kemas ⭐',
  'Lengkap & Teliti ✍️',
  'Tulisan Sangat Kemas 🌟',
  'Perlu Pembetulan ⚠️',
  'Hantar Lewat 🕒',
  'Sangat Rajin 🔥',
];

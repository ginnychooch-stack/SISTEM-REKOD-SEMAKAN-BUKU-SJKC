import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";

// Initial seed data
const DEFAULT_CLASSES = [
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

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

function ensureDatabaseFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    // Check if any recent backup exists in backups directory before falling back to empty data
    try {
      const backupFiles = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).sort().reverse();
      if (backupFiles.length > 0) {
        const latestBackupPath = path.join(BACKUPS_DIR, backupFiles[0]);
        const backupContent = fs.readFileSync(latestBackupPath, 'utf-8');
        fs.writeFileSync(DB_FILE, backupContent, 'utf-8');
        console.log(`[Database Recovery] Restored database from server backup: ${backupFiles[0]}`);
        return;
      }
    } catch (e) {
      console.warn('Could not read backup files:', e);
    }

    const initialData = {
      classes: DEFAULT_CLASSES,
      assignments: [],
      availableYears: ['2026', '2027', '2028', '2029'],
      selectedYear: '2026',
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDatabase() {
  try {
    ensureDatabaseFile();
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);

    // If active database is empty of assignments, check if a backup has assignments
    if ((!parsed.assignments || parsed.assignments.length === 0) && fs.existsSync(BACKUPS_DIR)) {
      try {
        const backupFiles = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).sort().reverse();
        for (const bf of backupFiles) {
          const bp = path.join(BACKUPS_DIR, bf);
          const bContent = fs.readFileSync(bp, 'utf-8');
          const bParsed = JSON.parse(bContent);
          if (bParsed.assignments && bParsed.assignments.length > 0) {
            console.log(`[Database Fallback] Serving assignments from backup ${bf}`);
            return bParsed;
          }
        }
      } catch (e) {
        console.warn('Error reading backups during readDatabase:', e);
      }
    }

    return parsed;
  } catch (err) {
    console.error('Error reading database file:', err);
    return {
      classes: DEFAULT_CLASSES,
      assignments: [],
      availableYears: ['2026', '2027', '2028', '2029'],
      selectedYear: '2026',
      updatedAt: new Date().toISOString(),
    };
  }
}

let writeQueue: Promise<any> = Promise.resolve();

function writeDatabaseAtomic(data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(() => {
      try {
        ensureDatabaseFile();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const randomSalt = Math.random().toString(36).substring(2, 8);
        const tempFile = `${DB_FILE}.tmp.${Date.now()}_${process.pid}_${randomSalt}`;
        const serialized = JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2);

        fs.writeFileSync(tempFile, serialized, 'utf-8');

        // Robust atomic rename with retries for container environments
        let renamed = false;
        let attempts = 0;
        while (!renamed && attempts < 5) {
          try {
            attempts++;
            fs.renameSync(tempFile, DB_FILE);
            renamed = true;
          } catch (rErr) {
            if (attempts >= 5) throw rErr;
            // Short busy-wait before retry
            const waitEnd = Date.now() + 25;
            while (Date.now() < waitEnd) {}
          }
        }

        // Write persistent timestamped backup file
        try {
          const backupFile = path.join(BACKUPS_DIR, `backup_${timestamp}.json`);
          fs.writeFileSync(backupFile, serialized, 'utf-8');

          // Retain maximum 25 latest backups
          const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).sort();
          if (files.length > 25) {
            const toDelete = files.slice(0, files.length - 25);
            toDelete.forEach((f) => {
              try {
                fs.unlinkSync(path.join(BACKUPS_DIR, f));
              } catch {}
            });
          }
        } catch (bErr) {
          console.warn('[Backup Notice] Gagal menulis salinan fail arkib:', bErr);
        }

        resolve();
      } catch (err) {
        console.error('[Database Write Error] Gagal menulis ke fail database:', err);
        reject(err);
      }
    }).catch((qErr) => {
      console.error('[Write Queue Error]:', qErr);
      reject(qErr);
    });
  });
}

function writeDatabase(data: any) {
  return writeDatabaseAtomic(data);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body parser
  app.use(express.json({ limit: '15mb' }));

  // CORS headers to ensure mobile Safari & desktop can connect without issues
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // GET /api/records - Load all persistent school records
  app.get("/api/records", (_req, res) => {
    try {
      const data = readDatabase();
      res.json({
        success: true,
        classes: data.classes || DEFAULT_CLASSES,
        assignments: data.assignments || [],
        availableYears: data.availableYears || ['2026', '2027', '2028', '2029'],
        selectedYear: data.selectedYear || '2026',
        updatedAt: data.updatedAt,
      });
    } catch (err: any) {
      console.error("API GET /api/records error:", err);
      res.status(500).json({
        success: false,
        error: "Gagal memuatkan data dari pangkalan data.",
        details: err?.message,
      });
    }
  });

  // POST /api/records - Save records across desktop & mobile
  app.post("/api/records", async (req, res) => {
    try {
      const { classes, assignments, availableYears, selectedYear } = req.body;
      if (!classes || !assignments) {
        return res.status(400).json({
          success: false,
          error: "Format data tidak sah. 'classes' dan 'assignments' diperlukan.",
        });
      }

      const existing = readDatabase();
      const updated = {
        classes: classes && classes.length > 0 ? classes : existing.classes,
        assignments: Array.isArray(assignments) ? assignments : existing.assignments,
        availableYears: availableYears || existing.availableYears,
        selectedYear: selectedYear || existing.selectedYear,
      };

      await writeDatabase(updated);

      console.log(`[Database Saved] ${updated.assignments.length} assignments, ${updated.classes.length} classes at ${new Date().toISOString()}`);

      res.json({
        success: true,
        message: "Rekod berjaya disimpan",
        totalAssignments: updated.assignments.length,
        totalClasses: updated.classes.length,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("API POST /api/records error:", err);
      res.status(500).json({
        success: false,
        error: "Gagal menyimpan rekod. Sila cuba semula.",
        details: err?.message,
      });
    }
  });

  // POST /api/student_records - Single student upsert (student_id, subject_id, record_date)
  app.post("/api/student_records", async (req, res) => {
    try {
      const {
        student_id,
        subject_id,
        record_date,
        status,
        points_awarded,
        remark,
        work_note,
        incomplete_note,
        task_title,
        class_id,
      } = req.body;

      if (!student_id || !subject_id || !record_date || !status) {
        return res.status(400).json({
          success: false,
          code: "INVALID_PAYLOAD",
          message: "student_id, subject_id, record_date, dan status wajib diisi.",
          details: "Null or undefined required fields",
        });
      }

      const existingData = readDatabase();
      const currentClasses = [...(existingData.classes || DEFAULT_CLASSES)];
      const currentAssignments = [...(existingData.assignments || [])];

      // Normalized status mapping
      const normStatus = String(status).toLowerCase().trim();
      let internalStatus: 'DIHANTAR' | 'BELUM_HANTAR' | 'BELUM_DISEMAK' | 'TIDAK_SIAP' = 'BELUM_DISEMAK';
      let isSubmitted = false;
      if (normStatus === 'hantar' || normStatus === 'dihantar') {
        internalStatus = 'DIHANTAR';
        isSubmitted = true;
      } else if (
        normStatus === 'tidak_siap' ||
        normStatus === 'tidak siap' ||
        normStatus === 'hantar_tak_siap' ||
        normStatus === 'hantar_tidak_siap' ||
        normStatus === 'dihantar_tidak_siap'
      ) {
        internalStatus = 'TIDAK_SIAP';
        isSubmitted = true; // Rekod murid dianggap telah menghantar buku
      } else if (normStatus === 'belum_hantar' || normStatus === 'belum hantar') {
        internalStatus = 'BELUM_HANTAR';
        isSubmitted = false;
      } else {
        internalStatus = 'BELUM_DISEMAK';
        isSubmitted = false;
      }

      // Jangan beri markah ganjaran +10 mata secara automatik untuk status TIDAK_SIAP
      const pts = typeof points_awarded === 'number'
        ? points_awarded
        : (internalStatus === 'DIHANTAR' ? 10 : 0);

      // Find target assignment for student_id, subject_id, record_date (and class_id if available)
      let assignmentIndex = currentAssignments.findIndex(
        (a) =>
          (!class_id || a.classId === class_id) &&
          a.subject === subject_id &&
          a.dateAssigned === record_date
      );

      let targetAssignment: any;
      if (assignmentIndex >= 0) {
        // UPDATE existing assignment submission
        targetAssignment = { ...currentAssignments[assignmentIndex] };
        const prevSub = targetAssignment.submissions?.[student_id];

        targetAssignment.submissions = {
          ...(targetAssignment.submissions || {}),
          [student_id]: {
            studentId: student_id,
            status: internalStatus,
            submitted: isSubmitted,
            submittedAt: isSubmitted ? (prevSub?.submittedAt || new Date().toISOString()) : undefined,
            pointsAwarded: pts,
            remark: remark !== undefined ? remark : prevSub?.remark,
            workNote: work_note !== undefined ? work_note : prevSub?.workNote,
            incompleteNote: incomplete_note !== undefined ? incomplete_note : prevSub?.incompleteNote,
          },
        };
        currentAssignments[assignmentIndex] = targetAssignment;
      } else {
        // INSERT/UPSERT new assignment if not yet existing for this date & subject
        const targetClass = currentClasses.find((c) =>
          class_id ? c.id === class_id : c.students.some((s: any) => s.id === student_id)
        ) || currentClasses[0];

        const initialSubmissions: Record<string, any> = {};
        if (targetClass?.students) {
          targetClass.students.forEach((st: any) => {
            initialSubmissions[st.id] = {
              studentId: st.id,
              status: st.id === student_id ? internalStatus : 'BELUM_DISEMAK',
              submitted: st.id === student_id ? isSubmitted : false,
              submittedAt: st.id === student_id && isSubmitted ? new Date().toISOString() : undefined,
              pointsAwarded: st.id === student_id ? pts : 0,
              remark: st.id === student_id ? (remark || undefined) : undefined,
              workNote: st.id === student_id ? (work_note || undefined) : undefined,
              incompleteNote: st.id === student_id ? (incomplete_note || undefined) : undefined,
            };
          });
        }

        const newAssignmentId = `task-${targetClass?.id || 'class'}-${subject_id.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        targetAssignment = {
          id: newAssignmentId,
          classId: targetClass?.id || class_id || 'class-1a',
          subject: subject_id,
          title: task_title || `Semakan ${subject_id}`,
          bookType: 'Buku Latihan (Tulis/Kira)',
          dateAssigned: record_date,
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          pointsValue: pts > 0 ? pts : 10,
          submissions: initialSubmissions,
        };

        currentAssignments.unshift(targetAssignment);
      }

      // Update student points in classes
      for (const cls of currentClasses) {
        const studentObj = cls.students.find((s: any) => s.id === student_id);
        if (studentObj) {
          if (!studentObj.subjectPoints) studentObj.subjectPoints = {};
          if (!studentObj.subjectStars) studentObj.subjectStars = {};

          // Recompute student's subject points and stars from all assignments
          let totalSubjectPts = 0;
          let totalSubjectStars = 0;

          currentAssignments.forEach((ass) => {
            const sub = ass.submissions?.[student_id];
            if (ass.subject === subject_id && sub) {
              if (sub.status === 'DIHANTAR') {
                totalSubjectPts += (typeof sub.pointsAwarded === 'number' ? sub.pointsAwarded : 10);
                totalSubjectStars += 1;
              } else if (sub.status === 'TIDAK_SIAP') {
                // Jangan beri markah ganjaran +10 mata secara automatik untuk status TIDAK_SIAP
                totalSubjectPts += (typeof sub.pointsAwarded === 'number' ? sub.pointsAwarded : 0);
              }
            }
          });

          studentObj.subjectPoints[subject_id] = totalSubjectPts;
          studentObj.subjectStars[subject_id] = totalSubjectStars;

          // Recompute total across all subjects
          studentObj.points = Object.values(studentObj.subjectPoints).reduce((a: any, b: any) => a + (Number(b) || 0), 0) as number;
          studentObj.stars = Object.values(studentObj.subjectStars).reduce((a: any, b: any) => a + (Number(b) || 0), 0) as number;
        }
      }

      const updatedPayload = {
        ...existingData,
        classes: currentClasses,
        assignments: currentAssignments,
        updatedAt: new Date().toISOString(),
      };

      await writeDatabase(updatedPayload);

      res.json({
        success: true,
        message: "Rekod murid berjaya disimpan",
        record: {
          student_id,
          subject_id,
          record_date,
          status: normStatus,
          points_awarded: pts,
        },
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("API POST /api/student_records error:", err);
      res.status(500).json({
        success: false,
        code: "SERVER_WRITE_ERROR",
        message: "Gagal menyimpan rekod murid. Sila cuba semula.",
        details: err?.message,
        hint: "Semak kebenaran penulisan fail pangkalan data pada pelayan.",
      });
    }
  });

  // POST /api/records/reset - Reset database to default
  app.post("/api/records/reset", async (_req, res) => {
    try {
      const initialData = {
        classes: DEFAULT_CLASSES,
        assignments: [],
        availableYears: ['2026', '2027', '2028', '2029'],
        selectedYear: '2026',
        updatedAt: new Date().toISOString(),
      };
      await writeDatabase(initialData);
      res.json({ success: true, message: "Pangkalan data telah diset semula." });
    } catch (err: any) {
      console.error("API POST /api/records/reset error:", err);
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

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

function writeDatabase(data: any) {
  ensureDatabaseFile();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  const serialized = JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2);
  fs.writeFileSync(tempFile, serialized, 'utf-8');
  fs.renameSync(tempFile, DB_FILE);

  // Write a persistent timestamped backup file if data has assignments or points
  try {
    const backupFile = path.join(BACKUPS_DIR, `backup_${timestamp}.json`);
    fs.writeFileSync(backupFile, serialized, 'utf-8');

    // Retain maximum 20 latest backups
    const files = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).sort();
    if (files.length > 20) {
      const toDelete = files.slice(0, files.length - 20);
      toDelete.forEach((f) => {
        try {
          fs.unlinkSync(path.join(BACKUPS_DIR, f));
        } catch {}
      });
    }
  } catch (bErr) {
    console.warn('Failed to write backup snapshot file:', bErr);
  }
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
  app.post("/api/records", (req, res) => {
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
        classes: classes || existing.classes,
        assignments: assignments || existing.assignments,
        availableYears: availableYears || existing.availableYears,
        selectedYear: selectedYear || existing.selectedYear,
      };

      writeDatabase(updated);

      console.log(`[Database Saved] ${assignments.length} assignments, ${classes.length} classes at ${new Date().toISOString()}`);

      res.json({
        success: true,
        message: "Rekod berjaya disimpan",
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

  // POST /api/records/reset - Reset database to default
  app.post("/api/records/reset", (_req, res) => {
    try {
      const initialData = {
        classes: DEFAULT_CLASSES,
        assignments: [],
        availableYears: ['2026', '2027', '2028', '2029'],
        selectedYear: '2026',
        updatedAt: new Date().toISOString(),
      };
      writeDatabase(initialData);
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

import express from 'express';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { db } from './server/db';
import { autoGradeCandidate } from './server/grading';
import { evaluateSpeakingAudio } from './server/speaking';
import { scanExamWithAI } from './server/aiScan';
import { createServer as createViteServer } from 'vite';

// Flatten nested candidate answers to send as a flat Record<string, string> to client
function flattenAnswers(nestedAnswers: any): Record<string, string> {
  const flat: Record<string, string> = {};
  if (!nestedAnswers) return flat;
  
  if (nestedAnswers.listeningPart1) {
    Object.entries(nestedAnswers.listeningPart1).forEach(([k, v]) => {
      if (typeof v === 'string') flat[k] = v;
    });
  }
  if (nestedAnswers.listeningPart2) {
    Object.entries(nestedAnswers.listeningPart2).forEach(([k, v]) => {
      if (typeof v === 'string') flat[k] = v;
    });
  }
  if (nestedAnswers.grammar) {
    Object.entries(nestedAnswers.grammar).forEach(([k, v]) => {
      if (typeof v === 'string') flat[k] = v;
    });
  }
  if (nestedAnswers.vocabulary) {
    Object.entries(nestedAnswers.vocabulary).forEach(([k, v]) => {
      if (typeof v === 'string') flat[k] = v;
    });
  }
  if (nestedAnswers.readingPartA) {
    Object.entries(nestedAnswers.readingPartA).forEach(([k, v]) => {
      if (typeof v === 'string') flat[k] = v;
    });
  }
  if (nestedAnswers.readingPartB) {
    Object.entries(nestedAnswers.readingPartB).forEach(([k, v]) => {
      if (typeof v === 'string') flat[k] = v;
    });
  }
  if (nestedAnswers.writing) {
    Object.entries(nestedAnswers.writing).forEach(([k, v]) => {
      if (typeof v === 'string') flat[k] = v;
    });
  }
  return flat;
}

// Convert flat client-side answers into nested Candidate structure
function nestAnswers(flatAnswers: Record<string, string>): any {
  const nested: any = {
    listeningPart1: {},
    listeningPart2: {},
    grammar: {},
    vocabulary: {},
    readingPartA: {},
    readingPartB: {},
    writing: {},
  };
  
  if (!flatAnswers) return nested;
  
  Object.entries(flatAnswers).forEach(([k, v]) => {
    const activeKey = k.startsWith('__NOTE__') ? k.replace('__NOTE__', '') : k;
    
    if (activeKey.startsWith('l1_')) {
      nested.listeningPart1[k] = v;
    } else if (activeKey.startsWith('l2_')) {
      nested.listeningPart2[k] = v;
    } else if (activeKey.startsWith('g_')) {
      nested.grammar[k] = v;
    } else if (activeKey.startsWith('v_')) {
      nested.vocabulary[k] = v;
    } else if (activeKey.startsWith('r_')) {
      const num = parseInt(activeKey.replace('r_', ''), 10);
      if (num <= 2) {
        nested.readingPartA[k] = v;
      } else {
        nested.readingPartB[k] = v;
      }
    } else if (activeKey.startsWith('w_')) {
      nested.writing[k] = v;
    }
  });
  
  return nested;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set up generous payload limits for base64 audio uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Route: Register Candidate or Resume Session
  app.post('/api/candidates/register', (req, res) => {
    try {
      const { fullName, phone, examId } = req.body;
      if (!fullName || !phone) {
        return res.status(400).json({ error: 'Họ tên và số điện thoại không được bỏ trống.' });
      }

      // Check if candidate is locked
      const isLocked = db.getCandidates().some((c) => c.phone.trim() === phone.trim() && c.isLocked === true);
      if (isLocked) {
        return res.status(400).json({ error: 'Số điện thoại này đã bị khóa trên hệ thống. Vui lòng liên hệ Giáo viên để được hỗ trợ.' });
      }

      // Check if candidate already exists
      const existing = db.getCandidateByPhone(phone);
      if (existing) {
        if (existing.submittedAt) {
          return res.status(400).json({
            error: 'Số điện thoại này đã hoàn thành bài thi trước đó. Mỗi thí sinh chỉ được thi duy nhất 1 lần.'
          });
        }
        // Candidate already registered but not submitted yet -> Resume session!
        db.addLog(existing.id, 'Thí sinh tải lại trang hoặc đăng nhập lại để tiếp tục làm bài.');
        const exam = db.getExamById(existing.examId || 'default-exam');
        return res.json({ candidate: existing, exam, resumed: true, restoredAnswers: flattenAnswers(existing.answers) });
      }

      // Register new candidate
      const newCandidate = db.registerCandidate(fullName, phone, examId || 'default-exam');
      const exam = db.getExamById(newCandidate.examId);
      return res.json({ candidate: newCandidate, exam, resumed: false });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Đã xảy ra lỗi đăng ký.' });
    }
  });

  // API Route: Start Test Session
  app.post('/api/candidates/start', (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Thiếu ID thí sinh.' });
      }
      const candidate = db.startSession(id);
      return res.json({ candidate });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Get Active Session
  app.get('/api/candidates/session/:id', (req, res) => {
    try {
      const { id } = req.params;
      const candidate = db.getCandidateById(id);
      if (!candidate) {
        return res.status(404).json({ error: 'Không tìm thấy thông tin thí sinh.' });
      }
      if (candidate.isLocked) {
        return res.status(403).json({ error: 'Số điện thoại này đã bị khóa trên hệ thống. Vui lòng liên hệ Giáo viên để được hỗ trợ.' });
      }
      const exam = db.getExamById(candidate.examId || 'default-exam');
      return res.json({ candidate, exam, answers: flattenAnswers(candidate.answers) });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Save progress answers dynamically
  app.post('/api/candidates/save-answers', (req, res) => {
    try {
      const { id, answers, durationSeconds } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Thiếu ID thí sinh.' });
      }
      const nestedAnswers = nestAnswers(answers);
      const updated = db.updateAnswers(id, nestedAnswers, durationSeconds);
      return res.json({ candidate: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Log candidate activities (tab switches, exits)
  app.post('/api/candidates/log', (req, res) => {
    try {
      const { id, action } = req.body;
      if (!id || !action) {
        return res.status(400).json({ error: 'Thiếu ID hoặc nội dung log.' });
      }
      const updated = db.addLog(id, action);
      return res.json({ candidate: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Upload Speaking Audio recording (Part 1 or Part 2)
  app.post('/api/candidates/upload-audio', (req, res) => {
    try {
      const { id, part, audioData } = req.body; // part: 'speaking_p1' or 'speaking_p2_q1', etc.
      if (!id || !part || !audioData) {
        return res.status(400).json({ error: 'Thiếu dữ liệu upload ghi âm.' });
      }

      // Save audio to disk
      const relativePath = db.saveAudio(id, part, audioData);

      // Update candidate database structure
      let answersUpdate: any = {};
      if (part === 'speaking_p1') {
        answersUpdate.speakingPart1 = { audioPath: relativePath };
      } else if (part === 'speaking_p2_q1') {
        answersUpdate.speakingPart2 = { sp_1_audioPath: relativePath };
      } else if (part === 'speaking_p2_q2') {
        answersUpdate.speakingPart2 = { sp_2_audioPath: relativePath };
      } else if (part === 'speaking_p2_q3') {
        answersUpdate.speakingPart2 = { sp_3_audioPath: relativePath };
      }

      const updated = db.updateAnswers(id, answersUpdate);
      return res.json({ candidate: updated, audioPath: relativePath });
    } catch (error: any) {
      console.error('Audio upload error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Evaluate Speaking Part 1 using Gemini AI
  app.post('/api/speaking/evaluate', async (req, res) => {
    try {
      const { id, audioPath } = req.body;
      if (!id || !audioPath) {
        return res.status(400).json({ error: 'Thiếu thông tin phân tích Speaking.' });
      }

      const candidate = db.getCandidateById(id);
      const exam = candidate ? db.getExamById(candidate.examId) : undefined;
      const referenceText = exam?.questions?.speakingReadAloud?.text;

      // Run real multi-modal Gemini evaluation
      const evaluation = await evaluateSpeakingAudio(audioPath, referenceText);

      // Save evaluation results back to candidate DB
      const answersUpdate = {
        speakingPart1: {
          audioPath,
          aiEvaluation: evaluation
        }
      };
      db.updateAnswers(id, answersUpdate);

      return res.json({ success: true, evaluation });
    } catch (error: any) {
      console.error('Speaking evaluation API error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Submit Placement Test
  app.post('/api/candidates/submit', (req, res) => {
    try {
      const { id, durationSeconds } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Thiếu ID thí sinh.' });
      }

      if (durationSeconds !== undefined) {
        db.updateAnswers(id, {}, durationSeconds);
      }

      // Submits and auto-grades
      const candidate = db.submitTest(id, autoGradeCandidate);
      return res.json({ candidate });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ================= ADMIN API ROUTES =================

  // Auth helper middleware
  const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== 'Bearer PlAcEmEnT_TeSt_SeCrEt_Token') {
      return res.status(401).json({ error: 'Yêu cầu đăng nhập quản trị viên.' });
    }
    next();
  };

  // Admin Login
  app.post('/api/admin/login', (req, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ error: 'Vui lòng nhập mật khẩu.' });
      }

      if (db.verifyAdminPassword(password)) {
        return res.json({ token: 'Bearer PlAcEmEnT_TeSt_SeCrEt_Token' });
      } else {
        return res.status(401).json({ error: 'Mật khẩu quản trị viên không chính xác.' });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Admin Dashboard stats
  app.get('/api/admin/dashboard', adminAuth, (req, res) => {
    try {
      const candidates = db.getCandidates();
      const total = candidates.length;
      const completed = candidates.filter((c) => c.submittedAt !== null).length;
      const active = total - completed;

      const completedCandidates = candidates.filter((c) => c.submittedAt !== null && c.scores);
      
      let averageScore = 0;
      let totalPercentage = 0;
      
      if (completedCandidates.length > 0) {
        const sum = completedCandidates.reduce((acc, curr) => acc + (curr.scores?.total || 0), 0);
        averageScore = parseFloat((sum / completedCandidates.length).toFixed(1));

        const sumPercentage = completedCandidates.reduce((acc, curr) => acc + (curr.scores?.percentage || 0), 0);
        totalPercentage = parseFloat((sumPercentage / completedCandidates.length).toFixed(1));
      }

      // Calculate score bands (0-30 A1, 31-50 A2, 51-65 B1, 66-78 B2, 79-85 C1)
      const bands = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 };
      completedCandidates.forEach((c) => {
        const score = c.scores?.total || 0;
        if (score <= 30) bands.A1++;
        else if (score <= 50) bands.A2++;
        else if (score <= 65) bands.B1++;
        else if (score <= 78) bands.B2++;
        else bands.C1++;
      });

      return res.json({
        total,
        completed,
        active,
        averageScore,
        averagePercentage: totalPercentage,
        bands
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get Candidates List
  app.get('/api/admin/candidates', adminAuth, (req, res) => {
    try {
      const candidates = db.getCandidates().map((c) => {
        // Return summary of candidates
        return {
          id: c.id,
          fullName: c.fullName,
          phone: c.phone,
          isLocked: c.isLocked || false,
          examId: c.examId || 'default-exam',
          registeredAt: c.registeredAt,
          startedAt: c.startedAt,
          submittedAt: c.submittedAt,
          durationSeconds: c.durationSeconds,
          tabSwitches: c.tabSwitches,
          scores: c.scores,
          writingScore: c.writingScore,
          writingComment: c.writingComment
        };
      });
      return res.json({ candidates });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get Candidate Detailed Answers
  app.get('/api/admin/candidates/:id', adminAuth, (req, res) => {
    try {
      const { id } = req.params;
      const candidate = db.getCandidateById(id);
      if (!candidate) {
        return res.status(404).json({ error: 'Không tìm thấy thí sinh.' });
      }
      return res.json({ candidate });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Grade candidate writing
  app.post('/api/admin/candidates/:id/grade-writing', adminAuth, (req, res) => {
    try {
      const { id } = req.params;
      const { score, comment } = req.body;
      if (score === undefined || comment === undefined) {
        return res.status(400).json({ error: 'Thiếu điểm hoặc nhận xét chấm viết.' });
      }

      const numScore = parseFloat(score);
      if (isNaN(numScore) || numScore < 0 || numScore > 10) {
        return res.status(400).json({ error: 'Điểm viết phải từ 0 đến 10.' });
      }

      const updated = db.gradeWriting(id, numScore, comment);
      return res.json({ candidate: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Delete candidate
  app.delete('/api/admin/candidates/:id', adminAuth, (req, res) => {
    try {
      const { id } = req.params;
      db.deleteCandidate(id);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Reset candidate test progress
  app.post('/api/admin/candidates/:id/reset', adminAuth, (req, res) => {
    try {
      const { id } = req.params;
      const updated = db.resetCandidate(id);
      return res.json({ candidate: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ================= SETTINGS & LOCKING API ROUTES =================

  // Public Settings
  app.get('/api/settings', (req, res) => {
    try {
      const settings = db.getSettings();
      return res.json({ settings });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Admin Get Settings
  app.get('/api/admin/settings', adminAuth, (req, res) => {
    try {
      const settings = db.getSettings();
      return res.json({ settings });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Admin Update Settings
  app.put('/api/admin/settings', adminAuth, (req, res) => {
    try {
      const updated = db.updateSettings(req.body);
      return res.json({ settings: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Admin Lock/Unlock Candidate (by phone number)
  app.post('/api/admin/candidates/lock', adminAuth, (req, res) => {
    try {
      const { phone, locked } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'Thiếu số điện thoại.' });
      }
      db.lockCandidate(phone, !!locked);
      return res.json({ success: true, phone, locked });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ================= MATERIALS API ROUTES =================
  
  // Public route to list all exams
  app.get('/api/exams', (req, res) => {
    try {
      const exams = db.getExams().map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        durationMinutes: e.durationMinutes
      }));
      return res.json({ exams });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Public route to fetch study materials
  app.get('/api/materials', (req, res) => {
    try {
      const materials = db.getMaterials();
      return res.json({ materials });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // ================= ADMIN EXAMS API ROUTES =================

  // Admin route to list all exams with full details
  app.get('/api/admin/exams', adminAuth, (req, res) => {
    try {
      const exams = db.getExams();
      return res.json({ exams });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Admin route to get a single exam details
  app.get('/api/admin/exams/:id', adminAuth, (req, res) => {
    try {
      const exam = db.getExamById(req.params.id);
      if (!exam) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });
      return res.json({ exam });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Admin route to create exam
  app.post('/api/admin/exams', adminAuth, (req, res) => {
    try {
      const { title, description, durationMinutes } = req.body;
      if (!title) return res.status(400).json({ error: 'Tiêu đề đề thi là bắt buộc.' });
      const newExam = db.addExam(title, description || '', durationMinutes);
      return res.json({ exam: newExam });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Admin route to update exam
  app.put('/api/admin/exams/:id', adminAuth, (req, res) => {
    try {
      const { id } = req.params;
      const updated = db.updateExam(id, req.body);
      return res.json({ exam: updated });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Admin route to delete exam
  app.delete('/api/admin/exams/:id', adminAuth, (req, res) => {
    try {
      db.deleteExam(req.params.id);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Admin file upload helper (for custom audios, images, etc.)
  app.post('/api/admin/upload-file', adminAuth, (req, res) => {
    try {
      const { fileName, fileData } = req.body;
      if (!fileName || !fileData) {
        return res.status(400).json({ error: 'Thiếu tên file hoặc dữ liệu.' });
      }

      const matches = fileData.match(/^data:(.+);base64,(.+)$/);
      let base64Data = fileData;
      if (matches && matches.length === 3) {
        base64Data = matches[2];
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const cleanName = Date.now() + '_' + fileName.replace(/[^a-zA-Z0-9\._-]/g, '');
      const RECORDINGS_DIR = path.join(process.cwd(), 'recordings');
      
      fs.writeFileSync(path.join(RECORDINGS_DIR, cleanName), buffer);
      return res.json({ filePath: `/recordings/${cleanName}` });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Admin route to scan exam with Gemini AI
  app.post('/api/admin/exams/scan-ai', adminAuth, async (req, res) => {
    try {
      const { fileData, mimeType } = req.body;
      if (!fileData || !mimeType) {
        return res.status(400).json({ error: 'Thiếu dữ liệu file hoặc loại mime.' });
      }

      const matches = fileData.match(/^data:(.+);base64,(.+)$/);
      let base64Data = fileData;
      if (matches && matches.length === 3) {
        base64Data = matches[2];
      }

      const result = await scanExamWithAI(base64Data, mimeType);
      return res.json({ examData: result });
    } catch (error: any) {
      console.error('API Error in scan-ai:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Admin route to add a study material
  app.post('/api/admin/materials', adminAuth, (req, res) => {
    try {
      const { title, description, url, type } = req.body;
      if (!title || !type) {
        return res.status(400).json({ error: 'Tiêu đề và loại tài liệu là bắt buộc.' });
      }
      const newMaterial = db.addMaterial(title, description || '', url || '', type);
      return res.json({ material: newMaterial });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Admin route to delete a study material
  app.delete('/api/admin/materials/:id', adminAuth, (req, res) => {
    try {
      const { id } = req.params;
      db.deleteMaterial(id);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Audio Proxy endpoint to stream audio files from external storage same-origin, avoiding CORS or referrer blocks
  app.get('/api/audio-proxy', (req, res) => {
    const audioUrl = req.query.url as string;
    if (!audioUrl) {
      return res.status(400).send('Missing url parameter');
    }

    try {
      const parsedUrl = new URL(audioUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return res.status(400).send('Invalid protocol');
      }

      const headers: Record<string, string> = {};
      if (req.headers.range) {
        headers['range'] = req.headers.range;
      }
      headers['user-agent'] = req.headers['user-agent'] || 'Mozilla/5.0';

      const requestModule = parsedUrl.protocol === 'https:' ? https : http;

      const proxyReq = requestModule.get(audioUrl, { headers }, (proxyRes) => {
        // Forward status code
        res.status(proxyRes.statusCode || 200);

        // Forward headers
        const headersToCopy = [
          'content-type',
          'content-length',
          'accept-ranges',
          'content-range',
          'cache-control',
          'etag',
          'last-modified'
        ];
        headersToCopy.forEach((h) => {
          if (proxyRes.headers[h]) {
            res.setHeader(h, proxyRes.headers[h] as string);
          }
        });

        // Add CORS / security headers
        res.setHeader('Access-Control-Allow-Origin', '*');

        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error('Audio proxy request error:', err);
        if (!res.headersSent) {
          res.status(500).send('Error fetching audio resource');
        }
      });

      req.on('close', () => {
        proxyReq.destroy();
      });

    } catch (e) {
      res.status(400).send('Invalid URL format');
    }
  });

  // Static serving for recorded audio files
  app.use('/recordings', express.static(path.join(process.cwd(), 'recordings')));

  // Vite Integration & SPA asset serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express custom server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup crash:', err);
});

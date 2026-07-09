import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { db } from './db';
import { autoGradeCandidate } from './grading';
import { evaluateSpeakingAudio } from './speaking';
import { scanExamWithAI } from './aiScan';

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

const app = express();

// Apply CORS and Body Parsers
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Admin auth helper middleware
const adminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== 'Bearer PlAcEmEnT_TeSt_SeCrEt_Token') {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập quản trị viên.' });
  }
  next();
};

// ================= PUBLIC CLIENT API ROUTES =================

// Register Candidate or Resume Session
app.post('/api/candidates/register', async (req, res) => {
  try {
    const { fullName, phone, examId } = req.body;
    if (!fullName || !phone) {
      return res.status(400).json({ error: 'Họ tên và số điện thoại không được bỏ trống.' });
    }

    const allCandidates = await db.getCandidates();
    const isLocked = allCandidates.some((c) => c.phone.trim() === phone.trim() && c.isLocked === true);
    if (isLocked) {
      return res.status(400).json({ error: 'Số điện thoại này đã bị khóa trên hệ thống. Vui lòng liên hệ Giáo viên để được hỗ trợ.' });
    }

    const existing = await db.getCandidateByPhone(phone);
    if (existing) {
      if (existing.submittedAt) {
        return res.status(400).json({
          error: 'Số điện thoại này đã hoàn thành bài thi trước đó. Mỗi thí sinh chỉ được thi duy nhất 1 lần.'
        });
      }
      await db.addLog(existing.id, 'Thí sinh tải lại trang hoặc đăng nhập lại để tiếp tục làm bài.');
      const exam = await db.getExamById(existing.examId || 'default-exam');
      return res.json({ candidate: existing, exam, resumed: true, restoredAnswers: flattenAnswers(existing.answers) });
    }

    const newCandidate = await db.registerCandidate(fullName, phone, examId || 'default-exam');
    const exam = await db.getExamById(newCandidate.examId);
    return res.json({ candidate: newCandidate, exam, resumed: false });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Đã xảy ra lỗi đăng ký.' });
  }
});

// Start Test Session
app.post('/api/candidates/start', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Thiếu ID thí sinh.' });
    }
    const candidate = await db.startSession(id);
    return res.json({ candidate });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get Active Session
app.get('/api/candidates/session/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await db.getCandidateById(id);
    if (!candidate) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin thí sinh.' });
    }
    if (candidate.isLocked) {
      return res.status(403).json({ error: 'Số điện thoại này đã bị khóa trên hệ thống. Vui lòng liên hệ Giáo viên để được hỗ trợ.' });
    }
    const exam = await db.getExamById(candidate.examId || 'default-exam');
    return res.json({ candidate, exam, answers: flattenAnswers(candidate.answers) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Save progress answers dynamically
app.post('/api/candidates/save-answers', async (req, res) => {
  try {
    const { id, answers, durationSeconds } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Thiếu ID thí sinh.' });
    }
    const nestedAnswers = nestAnswers(answers);
    const updated = await db.updateAnswers(id, nestedAnswers, durationSeconds);
    return res.json({ candidate: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Log candidate activities (tab switches, exits)
app.post('/api/candidates/log', async (req, res) => {
  try {
    const { id, action } = req.body;
    if (!id || !action) {
      return res.status(400).json({ error: 'Thiếu ID hoặc nội dung log.' });
    }
    const updated = await db.addLog(id, action);
    return res.json({ candidate: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Upload Speaking Audio recording
app.post('/api/candidates/upload-audio', async (req, res) => {
  try {
    const { id, part, audioData } = req.body;
    if (!id || !part || !audioData) {
      return res.status(400).json({ error: 'Thiếu dữ liệu upload ghi âm.' });
    }

    const relativePath = await db.saveAudio(id, part, audioData);

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

    const updated = await db.updateAnswers(id, answersUpdate);
    return res.json({ candidate: updated, audioPath: relativePath });
  } catch (error: any) {
    console.error('Audio upload error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Evaluate Speaking Part 1 using Gemini AI
app.post('/api/speaking/evaluate', async (req, res) => {
  try {
    const { id, audioPath } = req.body;
    if (!id || !audioPath) {
      return res.status(400).json({ error: 'Thiếu thông tin phân tích Speaking.' });
    }

    const candidate = await db.getCandidateById(id);
    const exam = candidate ? await db.getExamById(candidate.examId) : undefined;
    const referenceText = exam?.questions?.speakingReadAloud?.text;

    const evaluation = await evaluateSpeakingAudio(audioPath, referenceText);

    const answersUpdate = {
      speakingPart1: {
        audioPath,
        aiEvaluation: evaluation
      }
    };
    await db.updateAnswers(id, answersUpdate);

    return res.json({ success: true, evaluation });
  } catch (error: any) {
    console.error('Speaking evaluation API error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Submit Placement Test
app.post('/api/candidates/submit', async (req, res) => {
  try {
    const { id, durationSeconds } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Thiếu ID thí sinh.' });
    }

    if (durationSeconds !== undefined) {
      await db.updateAnswers(id, {}, durationSeconds);
    }

    const candidate = await db.submitTest(id, (c) => {
      // Since autoGradeCandidate is async, we can await it inside the outer handler
      // or we can invoke it before calling db.submitTest
      throw new Error('Not used directly');
    });
    return res.json({ candidate });
  } catch (error: any) {
    // Wait, let's execute the async auto-grading right here!
    try {
      const { id, durationSeconds } = req.body;
      if (durationSeconds !== undefined) {
        await db.updateAnswers(id, {}, durationSeconds);
      }
      const candidateToGrade = await db.getCandidateById(id);
      if (!candidateToGrade) {
        return res.status(404).json({ error: 'Không tìm thấy thí sinh.' });
      }
      const scores = await autoGradeCandidate(candidateToGrade);
      const finalizedCandidate = await db.submitTest(id, () => scores);
      return res.json({ candidate: finalizedCandidate });
    } catch (innerError: any) {
      return res.status(500).json({ error: innerError.message });
    }
  }
});

// Public list of exams
app.get('/api/exams', async (req, res) => {
  try {
    const exams = await db.getExams();
    const summary = exams.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      durationMinutes: e.durationMinutes
    }));
    return res.json({ exams: summary });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Public study materials
app.get('/api/materials', async (req, res) => {
  try {
    const materials = await db.getMaterials();
    return res.json({ materials });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Public Settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getSettings();
    return res.json({ settings });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ================= ADMIN API ROUTES =================

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu.' });
    }

    const isValid = await db.verifyAdminPassword(password);
    if (isValid) {
      return res.json({ token: 'Bearer PlAcEmEnT_TeSt_SeCrEt_Token' });
    } else {
      return res.status(401).json({ error: 'Mật khẩu quản trị viên không chính xác.' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin Dashboard stats
app.get('/api/admin/dashboard', adminAuth, async (req, res) => {
  try {
    const candidates = await db.getCandidates();
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
app.get('/api/admin/candidates', adminAuth, async (req, res) => {
  try {
    const rawCandidates = await db.getCandidates();
    const list = rawCandidates.map((c) => ({
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
    }));
    return res.json({ candidates: list });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get Candidate Detailed Answers
app.get('/api/admin/candidates/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const candidate = await db.getCandidateById(id);
    if (!candidate) {
      return res.status(404).json({ error: 'Không tìm thấy thí sinh.' });
    }
    return res.json({ candidate });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Grade candidate writing
app.post('/api/admin/candidates/:id/grade-writing', adminAuth, async (req, res) => {
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

    const updated = await db.gradeWriting(id, numScore, comment);
    return res.json({ candidate: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete candidate
app.delete('/api/admin/candidates/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteCandidate(id);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Reset candidate test progress
app.post('/api/admin/candidates/:id/reset', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.resetCandidate(id);
    return res.json({ candidate: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin Get Settings
app.get('/api/admin/settings', adminAuth, async (req, res) => {
  try {
    const settings = await db.getSettings();
    return res.json({ settings });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin Update Settings
app.put('/api/admin/settings', adminAuth, async (req, res) => {
  try {
    const updated = await db.updateSettings(req.body);
    return res.json({ settings: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin Lock/Unlock Candidate (by phone number)
app.post('/api/admin/candidates/lock', adminAuth, async (req, res) => {
  try {
    const { phone, locked } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Thiếu số điện thoại.' });
    }
    await db.lockCandidate(phone, !!locked);
    return res.json({ success: true, phone, locked });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin list all exams with full details
app.get('/api/admin/exams', adminAuth, async (req, res) => {
  try {
    const exams = await db.getExams();
    return res.json({ exams });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin get a single exam details
app.get('/api/admin/exams/:id', adminAuth, async (req, res) => {
  try {
    const exam = await db.getExamById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });
    return res.json({ exam });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin create exam
app.post('/api/admin/exams', adminAuth, async (req, res) => {
  try {
    const { title, description, durationMinutes } = req.body;
    if (!title) return res.status(400).json({ error: 'Tiêu đề đề thi là bắt buộc.' });

    // Generate a secure unique short ID
    const shortId = crypto.randomUUID().substring(0, 8);
    const newExam = {
      id: shortId,
      title: title.trim(),
      description: description || '',
      durationMinutes: durationMinutes || 45,
      questions: {
        listeningPart1: [],
        listeningPart2: [],
        speakingReadAloud: { text: 'The test requires great focus.', wordCount: 6 },
        speakingQuestions: [],
        grammar: [],
        vocabulary: [],
        readingPassage: {
          title: 'Empty Passage',
          text: '',
          questionsPartA: [],
          questionsPartB: []
        },
        writingQuestions: []
      }
    };
    await db.addExam(newExam);
    return res.json({ exam: newExam });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin update exam
app.put('/api/admin/exams/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.updateExam(id, req.body);
    const updated = await db.getExamById(id);
    return res.json({ exam: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin delete exam
app.delete('/api/admin/exams/:id', adminAuth, async (req, res) => {
  try {
    await db.deleteExam(req.params.id);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin file upload helper (for custom audios, images, etc.) to Firebase Storage
app.post('/api/admin/upload-file', adminAuth, async (req, res) => {
  try {
    const { fileName, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'Thiếu tên file hoặc dữ liệu.' });
    }

    const matches = fileData.match(/^data:(.+);base64,(.+)$/);
    let base64Data = fileData;
    let mimeType = 'application/octet-stream';

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const cleanName = Date.now() + '_' + fileName.replace(/[^a-zA-Z0-9\._-]/g, '');

    const fileRef = db.saveAudio ? await db.saveAudio(cleanName.split('_')[0], 'admin', fileData) : '';
    if (fileRef) {
      return res.json({ filePath: fileRef });
    }

    throw new Error('Upload error');
  } catch (error: any) {
    try {
      const { fileName, fileData } = req.body;
      const matches = fileData.match(/^data:(.+);base64,(.+)$/);
      let base64Data = fileData;
      let mimeType = 'application/octet-stream';
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
      const buffer = Buffer.from(base64Data, 'base64');
      const cleanName = Date.now() + '_' + fileName.replace(/[^a-zA-Z0-9\._-]/g, '');

      const fileRef = db.bucket.file(`recordings/${cleanName}`);
      await fileRef.save(buffer, {
        metadata: { contentType: mimeType },
        public: true,
      });

      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${db.bucket.name}/o/${encodeURIComponent('recordings/' + cleanName)}?alt=media`;
      return res.json({ filePath: downloadUrl });
    } catch (innerError: any) {
      return res.status(500).json({ error: innerError.message });
    }
  }
});

// Admin route to scan exam with Gemini AI
app.post('/api/admin/exams/scan-ai', adminAuth, async (req, res) => {
  try {
    const { fileData, fileName } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'Thiếu dữ liệu tệp tin quét đề.' });
    }

    const matches = fileData.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Định dạng dữ liệu Base64 không hợp lệ.' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const scanned = await scanExamWithAI(base64Data, mimeType);
    return res.json({ success: true, exam: scanned });
  } catch (error: any) {
    console.error('Scan AI error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Audio Proxy endpoint to stream audio files from external storage same-origin, avoiding CORS or referrer blocks
app.get('/api/audio-proxy', async (req, res) => {
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
    headers['user-agent'] = (req.headers['user-agent'] as string) || 'Mozilla/5.0';

    const requestModule = parsedUrl.protocol === 'https:' ? https : http;

    const proxyReq = requestModule.get(audioUrl, { headers }, (proxyRes) => {
      res.status(proxyRes.statusCode || 200);

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

// Export Express App as a v2 Firebase Cloud Function
export const api = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 120, // Increase timeout for Gemini AI evaluations
    memory: "512MiB"
  },
  app
);

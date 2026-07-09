import * as admin from 'firebase-admin';
import crypto from 'crypto';

// Initialize firebase-admin if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const firestore = admin.firestore();
export const storage = admin.storage();

// Helper to resolve the correct storage bucket name
function getStorageBucket() {
  // Try default bucket, otherwise use project config
  return storage.bucket();
}

export const bucket = getStorageBucket();

export interface CandidateLog {
  timestamp: string;
  action: string;
}

export interface Candidate {
  id: string;
  fullName: string;
  phone: string;
  isLocked?: boolean;
  examId: string;
  registeredAt: string;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number;
  tabSwitches: number;
  logs: CandidateLog[];
  writingScore: number;
  writingComment: string;
  answers: {
    listeningPart1: Record<string, string>;
    listeningPart2: Record<string, string>;
    grammar: Record<string, string>;
    vocabulary: Record<string, string>;
    readingPartA: Record<string, string>;
    readingPartB: Record<string, string>;
    speakingPart1: {
      audioPath: string | null;
      aiEvaluation: {
        score: number;
        finalS: 'correct' | 'incorrect' | 'partial';
        finalT: 'correct' | 'incorrect' | 'partial';
        finalK: 'correct' | 'incorrect' | 'partial';
        stress1: 'correct' | 'incorrect';
        stress2: 'correct' | 'incorrect';
        stress3: 'correct' | 'incorrect';
        stress4: 'correct' | 'incorrect';
        transcript: string;
        details: string;
      } | null;
    };
    speakingPart2: {
      sp_1_audioPath: string | null;
      sp_2_audioPath: string | null;
      sp_3_audioPath: string | null;
    };
    writing: Record<string, string>;
  };
  scores: {
    listening: number;
    grammar: number;
    vocabulary: number;
    reading: number;
    writing: number;
    total: number;
    maxPossible: number;
    percentage: number;
  } | null;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  audio1Url?: string;
  audio2Url?: string;
  questions: {
    listeningPart1: any[];
    listeningPart2: any[];
    speakingReadAloud: { text: string; wordCount: number };
    speakingQuestions: { id: string; text: string }[];
    grammar: any[];
    vocabulary: any[];
    readingPassage: {
      title: string;
      text: string;
      questionsPartA: any[];
      questionsPartB: any[];
    };
    writingQuestions: { id: string; vietnamese: string }[];
  };
}

export interface Material {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string;
  createdAt: string;
}

export interface AppSettings {
  logoUrl?: string;
  themeColor?: string;
  slogan?: string;
  teacherPhone?: string;
  teacherEmail?: string;
  geminiApiKey?: string;
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

class DatabaseManager {
  // ================= CANDIDATE METHODS =================
  public async getCandidates(): Promise<Candidate[]> {
    const snap = await firestore.collection('candidates').get();
    const list: Candidate[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Candidate);
    });
    return list;
  }

  public async getCandidateById(id: string): Promise<Candidate | undefined> {
    const doc = await firestore.collection('candidates').doc(id).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() } as Candidate;
    }
    return undefined;
  }

  public async getCandidateByPhone(phone: string): Promise<Candidate | undefined> {
    const snap = await firestore
      .collection('candidates')
      .where('phone', '==', phone.trim())
      .get();
    if (snap.empty) {
      return undefined;
    }
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as Candidate;
  }

  public async registerCandidate(fullName: string, phone: string, examId: string): Promise<Candidate> {
    const id = crypto.randomBytes(8).toString('hex');
    const newCandidate: Candidate = {
      id,
      fullName: fullName.trim(),
      phone: phone.trim(),
      examId,
      registeredAt: new Date().toISOString(),
      startedAt: null,
      submittedAt: null,
      durationSeconds: 0,
      tabSwitches: 0,
      logs: [{ timestamp: new Date().toISOString(), action: 'Thí sinh đăng ký tài khoản thành công.' }],
      writingScore: 0,
      writingComment: '',
      answers: {
        listeningPart1: {},
        listeningPart2: {},
        grammar: {},
        vocabulary: {},
        readingPartA: {},
        readingPartB: {},
        speakingPart1: { audioPath: null, aiEvaluation: null },
        speakingPart2: { sp_1_audioPath: null, sp_2_audioPath: null, sp_3_audioPath: null },
        writing: {},
      },
      scores: null,
    };

    await firestore.collection('candidates').doc(id).set(newCandidate);
    return newCandidate;
  }

  public async startSession(id: string): Promise<Candidate> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    if (!candidate.startedAt) {
      candidate.startedAt = new Date().toISOString();
      candidate.logs.push({ timestamp: candidate.startedAt, action: 'Bắt đầu làm bài thi.' });
      await firestore.collection('candidates').doc(id).update({
        startedAt: candidate.startedAt,
        logs: candidate.logs,
      });
    }

    return candidate;
  }

  public async updateAnswers(
    id: string,
    answersUpdate: Partial<Candidate['answers']>,
    durationSeconds?: number
  ): Promise<Candidate> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    if (candidate.submittedAt) {
      throw new Error('Bài thi đã nộp, không thể thay đổi đáp án.');
    }

    const mergedAnswers = {
      listeningPart1: { ...(candidate.answers?.listeningPart1 || {}), ...(answersUpdate.listeningPart1 || {}) },
      listeningPart2: { ...(candidate.answers?.listeningPart2 || {}), ...(answersUpdate.listeningPart2 || {}) },
      grammar: { ...(candidate.answers?.grammar || {}), ...(answersUpdate.grammar || {}) },
      vocabulary: { ...(candidate.answers?.vocabulary || {}), ...(answersUpdate.vocabulary || {}) },
      readingPartA: { ...(candidate.answers?.readingPartA || {}), ...(answersUpdate.readingPartA || {}) },
      readingPartB: { ...(candidate.answers?.readingPartB || {}), ...(answersUpdate.readingPartB || {}) },
      speakingPart1: { ...(candidate.answers?.speakingPart1 || {}), ...(answersUpdate.speakingPart1 || {}) },
      speakingPart2: { ...(candidate.answers?.speakingPart2 || {}), ...(answersUpdate.speakingPart2 || {}) },
      writing: { ...(candidate.answers?.writing || {}), ...(answersUpdate.writing || {}) },
    };

    const updates: any = { answers: mergedAnswers };
    if (durationSeconds !== undefined) {
      updates.durationSeconds = durationSeconds;
    }

    await firestore.collection('candidates').doc(id).update(updates);
    candidate.answers = mergedAnswers;
    if (durationSeconds !== undefined) {
      candidate.durationSeconds = durationSeconds;
    }
    return candidate;
  }

  public async addLog(id: string, action: string): Promise<Candidate> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    const normalized = action.toLowerCase();
    if (
      normalized.includes('chuyển tab') ||
      normalized.includes('rời khỏi trang') ||
      normalized.includes('tab switched') ||
      normalized.includes('tab switch') ||
      normalized.includes('rời trang') ||
      normalized.includes('hidden')
    ) {
      candidate.tabSwitches += 1;
    }

    candidate.logs.push({
      timestamp: new Date().toISOString(),
      action,
    });

    await firestore.collection('candidates').doc(id).update({
      logs: candidate.logs,
      tabSwitches: candidate.tabSwitches,
    });

    return candidate;
  }

  public async saveAudio(candidateId: string, part: string, audioBase64: string): Promise<string> {
    const matches = audioBase64.match(/^data:(.+);base64,(.+)$/);
    let base64Data = audioBase64;
    let mimeType = 'audio/webm';
    let ext = 'webm';

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
      if (mimeType.includes('wav')) ext = 'wav';
      else if (mimeType.includes('mp3')) ext = 'mp3';
      else if (mimeType.includes('ogg')) ext = 'ogg';
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `${candidateId}_${part}.${ext}`;

    const fileRef = bucket.file(`recordings/${fileName}`);
    await fileRef.save(buffer, {
      metadata: { contentType: mimeType },
      public: true,
    });

    // Generate unauthenticated public download URL
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent('recordings/' + fileName)}?alt=media`;
  }

  public async submitTest(id: string, autoGradingFn: (candidate: Candidate) => Candidate['scores']): Promise<Candidate> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    if (candidate.submittedAt) {
      return candidate;
    }

    candidate.submittedAt = new Date().toISOString();
    candidate.logs.push({ timestamp: new Date().toISOString(), action: 'Nộp bài thi thành công.' });
    candidate.scores = autoGradingFn(candidate);

    await firestore.collection('candidates').doc(id).update({
      submittedAt: candidate.submittedAt,
      scores: candidate.scores,
      logs: candidate.logs,
    });

    return candidate;
  }

  public async gradeWriting(id: string, writingScore: number, comment: string): Promise<Candidate> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    candidate.writingScore = writingScore;
    candidate.writingComment = comment;

    if (candidate.scores) {
      candidate.scores.writing = writingScore;
      candidate.scores.total =
        candidate.scores.listening +
        candidate.scores.grammar +
        candidate.scores.vocabulary +
        candidate.scores.reading +
        writingScore;

      candidate.scores.percentage = Math.round((candidate.scores.total / candidate.scores.maxPossible) * 100);
    }

    await firestore.collection('candidates').doc(id).update({
      writingScore,
      writingComment: comment,
      scores: candidate.scores,
    });

    return candidate;
  }

  public async deleteCandidate(id: string): Promise<void> {
    await firestore.collection('candidates').doc(id).delete();
  }

  public async resetCandidate(id: string): Promise<Candidate> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    const updateFields = {
      startedAt: null,
      submittedAt: null,
      durationSeconds: 0,
      tabSwitches: 0,
      writingScore: 0,
      writingComment: '',
      scores: null,
      answers: {
        listeningPart1: {},
        listeningPart2: {},
        grammar: {},
        vocabulary: {},
        readingPartA: {},
        readingPartB: {},
        speakingPart1: { audioPath: null, aiEvaluation: null },
        speakingPart2: { sp_1_audioPath: null, sp_2_audioPath: null, sp_3_audioPath: null },
        writing: {},
      },
      logs: [{ timestamp: new Date().toISOString(), action: 'Bài thi đã được Reset bởi Quản trị viên.' }],
    };

    await firestore.collection('candidates').doc(id).update(updateFields);
    return { ...candidate, ...updateFields } as Candidate;
  }

  // ================= ADMIN SECURITY METHODS =================
  public async getAdminPasswordHash(): Promise<string> {
    const docRef = firestore.collection('admins').doc('config');
    const doc = await docRef.get();
    if (doc.exists) {
      return doc.data()?.adminPasswordHash || hashPassword('EnglishPlacement2026@SecureTeacher');
    }
    const defaultHash = hashPassword('EnglishPlacement2026@SecureTeacher');
    await docRef.set({
      adminPasswordHash: defaultHash,
      createdAt: new Date().toISOString(),
    });
    return defaultHash;
  }

  public async verifyAdminPassword(password: string): Promise<boolean> {
    const currentHash = await this.getAdminPasswordHash();
    return hashPassword(password) === currentHash;
  }

  public async changeAdminPassword(oldPass: string, newPass: string): Promise<boolean> {
    if (await this.verifyAdminPassword(oldPass)) {
      const hashed = hashPassword(newPass);
      await firestore.collection('admins').doc('config').set(
        {
          adminPasswordHash: hashed,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return true;
    }
    return false;
  }

  // ================= EXAM METHODS =================
  public async getExams(): Promise<Exam[]> {
    const snap = await firestore.collection('exams').get();
    const list: Exam[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Exam);
    });
    return list;
  }

  public async getExamById(id: string): Promise<Exam | undefined> {
    const doc = await firestore.collection('exams').doc(id).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() } as Exam;
    }
    return undefined;
  }

  public async addExam(exam: Exam): Promise<void> {
    await firestore.collection('exams').doc(exam.id).set(exam);
  }

  public async updateExam(id: string, examData: Partial<Exam>): Promise<void> {
    await firestore.collection('exams').doc(id).update(examData);
  }

  public async deleteExam(id: string): Promise<void> {
    await firestore.collection('exams').doc(id).delete();
  }

  // ================= MATERIALS METHODS =================
  public async getMaterials(): Promise<Material[]> {
    const snap = await firestore.collection('materials').get();
    const list: Material[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Material);
    });
    return list;
  }

  public async addMaterial(title: string, description: string, url: string, type: string): Promise<Material> {
    const id = crypto.randomBytes(6).toString('hex');
    const newMaterial: Material = {
      id,
      title: title.trim(),
      description: description.trim(),
      url: url.trim(),
      type: type,
      createdAt: new Date().toISOString(),
    };
    await firestore.collection('materials').doc(id).set(newMaterial);
    return newMaterial;
  }

  public async deleteMaterial(id: string): Promise<void> {
    await firestore.collection('materials').doc(id).delete();
  }

  // ================= SETTINGS & LOCKING METHODS =================
  public async getSettings(): Promise<AppSettings> {
    const docRef = firestore.collection('settings').doc('global');
    const doc = await docRef.get();
    if (doc.exists) {
      return doc.data() as AppSettings;
    }
    const defaultSettings: AppSettings = {
      logoUrl: '',
      themeColor: 'indigo',
      slogan: 'Your English Journey Starts Here.',
      teacherPhone: '0987.654.321',
      teacherEmail: 'teacher@english.edu.vn',
    };
    await docRef.set(defaultSettings);
    return defaultSettings;
  }

  public async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = {
      ...current,
      ...updates,
    };
    await firestore.collection('settings').doc('global').set(updated);
    return updated;
  }

  public async lockCandidate(phone: string, locked: boolean): Promise<void> {
    const trimmed = phone.trim();
    const snap = await firestore.collection('candidates').where('phone', '==', trimmed).get();
    const batch = firestore.batch();
    snap.forEach((doc) => {
      batch.update(doc.ref, { isLocked: locked });
    });
    await batch.commit();
  }
}

export const db = new DatabaseManager();

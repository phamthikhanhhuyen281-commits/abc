import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  LISTENING_PART_1,
  LISTENING_PART_2,
  SPEAKING_READ_ALOUD,
  SPEAKING_QUESTIONS,
  GRAMMAR_QUESTIONS,
  VOCABULARY_QUESTIONS,
  READING_PASSAGE,
  WRITING_QUESTIONS
} from '../src/questions';

export interface CandidateLog {
  timestamp: string;
  action: string;
}

export interface Candidate {
  id: string;
  fullName: string;
  phone: string;
  isLocked?: boolean;
  examId: string; // ID of the exam this candidate is taking
  registeredAt: string;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number; // actual time spent in seconds
  tabSwitches: number;
  logs: CandidateLog[];
  writingScore: number; // additional manual score
  writingComment: string; // teacher feedback
  answers: {
    listeningPart1: Record<string, string>; // { l1_1: 'A', ... }
    listeningPart2: Record<string, string>; // { l2_1: 'May 5th', ... }
    grammar: Record<string, string>; // { g_1: 'visited', g_7: 'B', ... }
    vocabulary: Record<string, string>; // { v_1: 'A', ... }
    readingPartA: Record<string, string>; // { r_1: 'B', ... }
    readingPartB: Record<string, string>; // { r_3: 'False', ... }
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
        details: string; // Explanations of what was good or bad
      } | null;
    };
    speakingPart2: {
      sp_1_audioPath: string | null;
      sp_2_audioPath: string | null;
      sp_3_audioPath: string | null;
    };
    writing: Record<string, string>; // { w_1: '...', ... }
  };
  scores: {
    listening: number; // auto-graded
    grammar: number; // auto-graded
    vocabulary: number; // auto-graded
    reading: number; // auto-graded
    writing: number; // manual graded
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
  audio1Url?: string; // Audio for Listening Part 1
  audio2Url?: string; // Audio for Listening Part 2
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
  type: string; // 'document' | 'link' | 'video' | 'other'
  createdAt: string;
}

export interface AppSettings {
  logoUrl?: string;
  themeColor?: string; // 'indigo' | 'emerald' | 'blue' | 'violet' | 'rose' | 'slate'
  slogan?: string;
  teacherPhone?: string;
  teacherEmail?: string;
}

export interface DatabaseSchema {
  candidates: Candidate[];
  adminPasswordHash: string; // SHA256 hashed password, default is "admin123"
  materials?: Material[];
  exams?: Exam[];
  settings?: AppSettings;
}

const DB_FILE = path.join(process.cwd(), 'db.json');
const RECORDINGS_DIR = path.join(process.cwd(), 'recordings');

// Create recordings directory if not exists
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Simple SHA256 helper so we don't need heavy dependencies
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    let schema: DatabaseSchema;
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        schema = JSON.parse(content);
      } else {
        schema = {
          candidates: [],
          adminPasswordHash: hashPassword('EnglishPlacement2026@SecureTeacher'),
        };
      }
    } catch (e) {
      console.error('Error loading database, initializing blank:', e);
      schema = {
        candidates: [],
        adminPasswordHash: hashPassword('EnglishPlacement2026@SecureTeacher'),
      };
    }

    // Migrate any older or default passwords to the new robust password
    if (schema.adminPasswordHash === hashPassword('admin123') || !schema.adminPasswordHash) {
      schema.adminPasswordHash = hashPassword('EnglishPlacement2026@SecureTeacher');
    }

    // Bootstrap settings if missing or empty
    if (!schema.settings) {
      schema.settings = {
        logoUrl: '',
        themeColor: 'indigo',
        slogan: 'Your English Journey Starts Here.',
        teacherPhone: '0987.654.321',
        teacherEmail: 'teacher@english.edu.vn',
      };
    }

    // Bootstrap exams if missing or empty
    if (!schema.exams || schema.exams.length === 0) {
      schema.exams = [
        {
          id: 'default-exam',
          title: 'Đề Thi Thử Đánh Giá Năng Lực Tiếng Anh',
          description: 'Bài thi đánh giá tổng hợp 4 kỹ năng: Nghe, Nói, Đọc, Viết, Ngữ pháp & Từ vựng.',
          durationMinutes: 45,
          audio1Url: 'https://storage.m3cdn.xyz/audio/1782652891560-hotel.mp3',
          audio2Url: 'https://storage.m3cdn.xyz/audio/section%201%20rented%20properties.mp3',
          questions: {
            listeningPart1: LISTENING_PART_1,
            listeningPart2: LISTENING_PART_2,
            speakingReadAloud: SPEAKING_READ_ALOUD,
            speakingQuestions: SPEAKING_QUESTIONS,
            grammar: GRAMMAR_QUESTIONS,
            vocabulary: VOCABULARY_QUESTIONS,
            readingPassage: READING_PASSAGE,
            writingQuestions: WRITING_QUESTIONS,
          }
        }
      ];
    }

    // Backfill examId for any candidates that don't have it
    if (schema.candidates) {
      schema.candidates.forEach((c) => {
        if (!c.examId) {
          c.examId = 'default-exam';
        }
      });
    }

    this.save(schema);
    return schema;
  }

  private save(schema: DatabaseSchema = this.data): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(schema, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  // ================= EXAM METHODS =================
  public getExams(): Exam[] {
    return this.data.exams || [];
  }

  public getExamById(id: string): Exam | undefined {
    return this.getExams().find((e) => e.id === id);
  }

  public addExam(title: string, description: string, durationMinutes: number): Exam {
    const newExam: Exam = {
      id: crypto.randomBytes(8).toString('hex'),
      title: title.trim(),
      description: description.trim(),
      durationMinutes: durationMinutes || 45,
      audio1Url: '',
      audio2Url: '',
      questions: {
        listeningPart1: [],
        listeningPart2: [],
        speakingReadAloud: { text: 'The English language requires practice.', wordCount: 6 },
        speakingQuestions: [
          { id: 'sp_1', text: 'Describe a memorable vacation you took.' },
          { id: 'sp_2', text: 'What are the benefits of learning a foreign language?' },
          { id: 'sp_3', text: 'How do you think technology will change education in the future?' }
        ],
        grammar: [],
        vocabulary: [],
        readingPassage: {
          title: 'Reading Passages',
          text: 'English learning is a lifelong journey...',
          questionsPartA: [],
          questionsPartB: []
        },
        writingQuestions: [
          { id: 'w_1', text: 'Dịch câu sau sang tiếng Anh: "Tôi rất thích học tiếng Anh."', vietnamese: 'Tôi rất thích học tiếng Anh.' } as any
        ]
      }
    };

    if (!this.data.exams) {
      this.data.exams = [];
    }
    this.data.exams.push(newExam);
    this.save();
    return newExam;
  }

  public updateExam(id: string, updates: Partial<Exam>): Exam {
    if (!this.data.exams) this.data.exams = [];
    const index = this.data.exams.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Không tìm thấy bài thi với ID: ${id}`);
    }

    this.data.exams[index] = {
      ...this.data.exams[index],
      ...updates,
      id // Prevent ID overwrites
    };
    this.save();
    return this.data.exams[index];
  }

  public deleteExam(id: string): void {
    if (!this.data.exams) return;
    this.data.exams = this.data.exams.filter((e) => e.id !== id);
    this.save();
  }

  public getCandidates(): Candidate[] {
    return this.data.candidates;
  }

  public getCandidateById(id: string): Candidate {
    let candidate = this.data.candidates.find((c) => c.id === id);
    if (!candidate) {
      candidate = {
        id,
        fullName: 'Thí sinh ' + id,
        phone: '0000000000',
        examId: 'default-exam',
        registeredAt: new Date().toISOString(),
        startedAt: null,
        submittedAt: null,
        durationSeconds: 0,
        tabSwitches: 0,
        logs: [{ timestamp: new Date().toISOString(), action: 'Khởi tạo tài khoản đồng bộ từ Firestore.' }],
        writingScore: 0,
        writingComment: '',
        answers: {
          listeningPart1: {},
          listeningPart2: {},
          grammar: {},
          vocabulary: {},
          readingPartA: {},
          readingPartB: {},
          speakingPart1: {
            audioPath: null,
            aiEvaluation: null,
          },
          speakingPart2: {
            sp_1_audioPath: null,
            sp_2_audioPath: null,
            sp_3_audioPath: null,
          },
          writing: {},
        },
        scores: null,
      };
      this.data.candidates.push(candidate);
      this.save();
    }
    return candidate;
  }

  public getCandidateByPhone(phone: string): Candidate | undefined {
    const formattedPhone = phone.trim();
    return this.data.candidates.find((c) => c.phone.trim() === formattedPhone);
  }

  public registerCandidate(fullName: string, phone: string, examId: string = 'default-exam'): Candidate {
    const trimmedPhone = phone.trim();
    const existing = this.getCandidateByPhone(trimmedPhone);
    if (existing) {
      throw new Error('Số điện thoại này đã từng đăng ký tham gia thi đánh giá năng lực.');
    }

    const newCandidate: Candidate = {
      id: crypto.randomBytes(8).toString('hex'),
      fullName: fullName.trim(),
      phone: trimmedPhone,
      examId,
      registeredAt: new Date().toISOString(),
      startedAt: null,
      submittedAt: null,
      durationSeconds: 0,
      tabSwitches: 0,
      logs: [{ timestamp: new Date().toISOString(), action: 'Đăng ký tài khoản thi.' }],
      writingScore: 0,
      writingComment: '',
      answers: {
        listeningPart1: {},
        listeningPart2: {},
        grammar: {},
        vocabulary: {},
        readingPartA: {},
        readingPartB: {},
        speakingPart1: {
          audioPath: null,
          aiEvaluation: null,
        },
        speakingPart2: {
          sp_1_audioPath: null,
          sp_2_audioPath: null,
          sp_3_audioPath: null,
        },
        writing: {},
      },
      scores: null,
    };

    this.data.candidates.push(newCandidate);
    this.save();
    return newCandidate;
  }

  public startSession(id: string): Candidate {
    const candidate = this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    if (candidate.submittedAt) {
      throw new Error('Thí sinh đã nộp bài thi và không thể làm lại.');
    }

    if (!candidate.startedAt) {
      candidate.startedAt = new Date().toISOString();
      candidate.logs.push({ timestamp: new Date().toISOString(), action: 'Bắt đầu làm bài thi.' });
      this.save();
    }

    return candidate;
  }

  public updateAnswers(
    id: string,
    answersUpdate: Partial<Candidate['answers']>,
    durationSeconds?: number
  ): Candidate {
    const candidate = this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    if (candidate.submittedAt) {
      throw new Error('Bài thi đã nộp, không thể thay đổi đáp án.');
    }

    // Merge answers
    if (answersUpdate.listeningPart1) {
      candidate.answers.listeningPart1 = { ...candidate.answers.listeningPart1, ...answersUpdate.listeningPart1 };
    }
    if (answersUpdate.listeningPart2) {
      candidate.answers.listeningPart2 = { ...candidate.answers.listeningPart2, ...answersUpdate.listeningPart2 };
    }
    if (answersUpdate.grammar) {
      candidate.answers.grammar = { ...candidate.answers.grammar, ...answersUpdate.grammar };
    }
    if (answersUpdate.vocabulary) {
      candidate.answers.vocabulary = { ...candidate.answers.vocabulary, ...answersUpdate.vocabulary };
    }
    if (answersUpdate.readingPartA) {
      candidate.answers.readingPartA = { ...candidate.answers.readingPartA, ...answersUpdate.readingPartA };
    }
    if (answersUpdate.readingPartB) {
      candidate.answers.readingPartB = { ...candidate.answers.readingPartB, ...answersUpdate.readingPartB };
    }
    if (answersUpdate.writing) {
      candidate.answers.writing = { ...candidate.answers.writing, ...answersUpdate.writing };
    }
    if (answersUpdate.speakingPart1) {
      candidate.answers.speakingPart1 = { ...candidate.answers.speakingPart1, ...answersUpdate.speakingPart1 };
    }
    if (answersUpdate.speakingPart2) {
      candidate.answers.speakingPart2 = { ...candidate.answers.speakingPart2, ...answersUpdate.speakingPart2 };
    }

    if (durationSeconds !== undefined) {
      candidate.durationSeconds = durationSeconds;
    }

    this.save();
    return candidate;
  }

  public addLog(id: string, action: string): Candidate {
    const candidate = this.getCandidateById(id);
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
    this.save();
    return candidate;
  }

  public saveAudio(candidateId: string, part: string, audioBase64: string): string {
    const matches = audioBase64.match(/^data:(.+);base64,(.+)$/);
    let base64Data = audioBase64;
    let ext = 'webm'; // default WebM audio

    if (matches && matches.length === 3) {
      base64Data = matches[2];
      const mime = matches[1];
      if (mime.includes('wav')) ext = 'wav';
      else if (mime.includes('mp3')) ext = 'mp3';
      else if (mime.includes('ogg')) ext = 'ogg';
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `${candidateId}_${part}.${ext}`;
    const filePath = path.join(RECORDINGS_DIR, fileName);

    fs.writeFileSync(filePath, buffer);
    return `/recordings/${fileName}`;
  }

  public submitTest(id: string, autoGradingFn: (candidate: Candidate) => Candidate['scores']): Candidate {
    const candidate = this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    if (candidate.submittedAt) {
      return candidate; // Already submitted
    }

    candidate.submittedAt = new Date().toISOString();
    candidate.logs.push({ timestamp: new Date().toISOString(), action: 'Nộp bài thi thành công.' });
    
    // Auto grade the candidate's responses
    candidate.scores = autoGradingFn(candidate);
    this.save();
    return candidate;
  }

  public gradeWriting(id: string, writingScore: number, comment: string): Candidate {
    const candidate = this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    candidate.writingScore = writingScore;
    candidate.writingComment = comment;

    // Recalculate scores if already submitted
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

    this.save();
    return candidate;
  }

  public verifyAdminPassword(password: string): boolean {
    return hashPassword(password) === this.data.adminPasswordHash;
  }

  public changeAdminPassword(oldPass: string, newPass: string): boolean {
    if (this.verifyAdminPassword(oldPass)) {
      this.data.adminPasswordHash = hashPassword(newPass);
      this.save();
      return true;
    }
    return false;
  }

  public deleteCandidate(id: string): void {
    this.data.candidates = this.data.candidates.filter(c => c.id !== id);
    this.save();
  }

  public resetCandidate(id: string): Candidate {
    const candidate = this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    candidate.startedAt = null;
    candidate.submittedAt = null;
    candidate.durationSeconds = 0;
    candidate.tabSwitches = 0;
    candidate.writingScore = 0;
    candidate.writingComment = '';
    candidate.scores = null;
    candidate.answers = {
      listeningPart1: {},
      listeningPart2: {},
      grammar: {},
      vocabulary: {},
      readingPartA: {},
      readingPartB: {},
      speakingPart1: {
        audioPath: null,
        aiEvaluation: null,
      },
      speakingPart2: {
        sp_1_audioPath: null,
        sp_2_audioPath: null,
        sp_3_audioPath: null,
      },
      writing: {},
    };
    candidate.logs = [{ timestamp: new Date().toISOString(), action: 'Bài thi đã được Reset bởi Quản trị viên.' }];
    
    this.save();
    return candidate;
  }

  public getMaterials(): Material[] {
    if (!this.data.materials) {
      this.data.materials = [];
    }
    return this.data.materials;
  }

  public addMaterial(title: string, description: string, url: string, type: string): Material {
    if (!this.data.materials) {
      this.data.materials = [];
    }
    const newMaterial: Material = {
      id: crypto.randomBytes(6).toString('hex'),
      title: title.trim(),
      description: description.trim(),
      url: url.trim(),
      type: type,
      createdAt: new Date().toISOString()
    };
    this.data.materials.push(newMaterial);
    this.save();
    return newMaterial;
  }

  public deleteMaterial(id: string): void {
    if (!this.data.materials) {
      this.data.materials = [];
    }
    this.data.materials = this.data.materials.filter((m) => m.id !== id);
    this.save();
  }

  // ================= SETTINGS & LOCKING METHODS =================
  public getSettings(): AppSettings {
    if (!this.data.settings) {
      this.data.settings = {
        logoUrl: '',
        themeColor: 'indigo',
        slogan: 'Your English Journey Starts Here.',
        teacherPhone: '0987.654.321',
        teacherEmail: 'teacher@english.edu.vn',
      };
    }
    return this.data.settings;
  }

  public updateSettings(updates: Partial<AppSettings>): AppSettings {
    this.data.settings = {
      ...this.getSettings(),
      ...updates,
    };
    this.save();
    return this.data.settings;
  }

  public lockCandidate(phone: string, locked: boolean): void {
    const trimmed = phone.trim();
    this.data.candidates.forEach((c) => {
      if (c.phone.trim() === trimmed) {
        c.isLocked = locked;
      }
    });
    this.save();
  }
}

export const db = new DatabaseManager();

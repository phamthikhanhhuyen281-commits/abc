import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { examService } from './examService';

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
  leftRoom?: boolean;
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
      aiEvaluation: any | null;
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

// Helper to normalize strings for comparison
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

// Precise checker for fill-in-the-blank questions
function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer) return false;
  const normUser = normalizeString(userAnswer);
  const normCorrect = normalizeString(correctAnswer);

  if (!normUser) return false;
  if (normUser === normCorrect) return true;

  if (normCorrect === '1700') {
    return normUser === '1700' || normUser.includes('1700');
  }
  if (normCorrect === '15') {
    return normUser === '15' || normUser.includes('15');
  }
  if (normCorrect === 'may 5th') {
    const valid = ['may 5th', 'may 5', '5 may', '5th may', 'may fifth', 'fifth of may'];
    return valid.includes(normUser) || normUser.includes('may 5');
  }
  if (normCorrect === 'have never tried') {
    const valid = ['have never tried', 'never tried', 'havent tried', 'has never tried', 'tried'];
    return valid.includes(normUser);
  }

  if (normUser.length < 3) {
    return normUser === normCorrect;
  }

  const correctWords = normCorrect.split(' ');
  if (correctWords.length > 1) {
    return normUser.includes(normCorrect) || normCorrect.includes(normUser);
  }

  return normUser === normCorrect;
}

export function autoGradeCandidate(candidate: Candidate, exam: any): Candidate['scores'] {
  const answers = candidate.answers || {
    listeningPart1: {},
    listeningPart2: {},
    grammar: {},
    vocabulary: {},
    readingPartA: {},
    readingPartB: {},
    writing: {}
  };
  
  const listeningPart1 = exam?.questions?.listeningPart1 || [];
  const listeningPart2 = exam?.questions?.listeningPart2 || [];
  const grammarQuestions = exam?.questions?.grammar || [];
  const vocabularyQuestions = exam?.questions?.vocabulary || [];
  const readingPartA = exam?.questions?.readingPassage?.questionsPartA || [];
  const readingPartB = exam?.questions?.readingPassage?.questionsPartB || [];

  let listeningScore = 0;
  listeningPart1.forEach((q: any) => {
    const userAnswer = answers.listeningPart1?.[q.id];
    if (userAnswer && userAnswer.trim().toUpperCase() === q.answer.toUpperCase()) {
      listeningScore += 1;
    }
  });

  listeningPart2.forEach((q: any) => {
    const userAnswer = answers.listeningPart2?.[q.id];
    if (userAnswer && checkAnswer(userAnswer, q.answer)) {
      listeningScore += 1;
    }
  });

  let grammarScore = 0;
  grammarQuestions.forEach((q: any) => {
    const userAnswer = answers.grammar?.[q.id];
    if (userAnswer) {
      if (q.type === 'mcq') {
        if (userAnswer.trim().toUpperCase() === q.answer.toUpperCase()) {
          grammarScore += 1;
        }
      } else {
        if (checkAnswer(userAnswer, q.answer)) {
          grammarScore += 1;
        }
      }
    }
  });

  let vocabularyScore = 0;
  vocabularyQuestions.forEach((q: any) => {
    const userAnswer = answers.vocabulary?.[q.id];
    if (userAnswer && userAnswer.trim().toUpperCase() === q.answer.toUpperCase()) {
      vocabularyScore += 1;
    }
  });

  let readingScore = 0;
  readingPartA.forEach((q: any) => {
    const userAnswer = answers.readingPartA?.[q.id];
    if (userAnswer && userAnswer.trim().toUpperCase() === q.answer.toUpperCase()) {
      readingScore += 1;
    }
  });
  readingPartB.forEach((q: any) => {
    const userAnswer = answers.readingPartB?.[q.id];
    if (userAnswer && userAnswer.trim().toUpperCase() === q.answer.toUpperCase()) {
      readingScore += 1;
    }
  });

  const writingScore = candidate.writingScore || 0;
  const totalAuto = listeningScore + grammarScore + vocabularyScore + readingScore;
  const total = totalAuto + writingScore;
  const maxPossible = 
    listeningPart1.length + 
    listeningPart2.length + 
    grammarQuestions.length + 
    vocabularyQuestions.length + 
    readingPartA.length + 
    readingPartB.length + 
    10;

  const percentage = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;

  return {
    listening: listeningScore,
    grammar: grammarScore,
    vocabulary: vocabularyScore,
    reading: readingScore,
    writing: writingScore,
    total,
    maxPossible,
    percentage
  };
}

export const candidateService = {
  async getCandidates(): Promise<Candidate[]> {
    try {
      const colRef = collection(db, 'candidates');
      const snap = await getDocs(colRef);
      const list: Candidate[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Candidate);
      });
      return list;
    } catch (err) {
      console.error('Error listing candidates:', err);
      return [];
    }
  },

  async getCandidateById(id: string): Promise<Candidate | null> {
    try {
      const docRef = doc(db, 'candidates', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Candidate;
      }
      return null;
    } catch (err) {
      console.error('Error getting candidate:', err);
      return null;
    }
  },

  async checkIsPhoneLocked(phone: string): Promise<boolean> {
    try {
      const colRef = collection(db, 'candidates');
      const q = query(colRef, where('phone', '==', phone.trim()));
      const snap = await getDocs(q);
      let locked = false;
      snap.forEach((doc) => {
        if (doc.data().isLocked) {
          locked = true;
        }
      });
      return locked;
    } catch (err) {
      console.error('Error checking lock state:', err);
      return false;
    }
  },

  async registerCandidate(fullName: string, phone: string, examId: string): Promise<{
    candidate: Candidate;
    exam: any;
    restoredAnswers: Record<string, string>;
  }> {
    const trimmedPhone = phone.trim();
    const isLocked = await this.checkIsPhoneLocked(trimmedPhone);
    if (isLocked) {
      throw new Error('Số điện thoại này đã bị khóa trên hệ thống. Vui lòng liên hệ Giáo viên để được hỗ trợ.');
    }

    const exam = await examService.getExamById(examId);

    // Check if there is an existing candidate with this phone
    const colRef = collection(db, 'candidates');
    const q = query(colRef, where('phone', '==', trimmedPhone), where('examId', '==', examId));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const existingDoc = snap.docs[0];
      const existing = { id: existingDoc.id, ...existingDoc.data() } as Candidate;
      
      if (existing.leftRoom) {
        throw new Error('Bạn đã tự ý rời khỏi phòng thi trước đó và không thể tiếp tục hoặc làm lại bài thi này trừ khi được Giáo viên khôi phục (Reset).');
      }

      if (existing.submittedAt) {
        // Log back in to view results/materials, no error thrown!
        await this.addLog(existing.id, 'Thí sinh đăng nhập lại để xem kết quả, liên hệ giáo viên và tài liệu ôn tập.');
      } else {
        // Existing but not submitted -> Resume!
        await this.addLog(existing.id, 'Thí sinh tải lại trang hoặc đăng nhập lại để tiếp tục làm bài.');
      }

      // Flatten answers for React state
      const restoredAnswers: Record<string, string> = {};
      if (existing.answers) {
        Object.assign(restoredAnswers, existing.answers.listeningPart1 || {});
        Object.assign(restoredAnswers, existing.answers.listeningPart2 || {});
        Object.assign(restoredAnswers, existing.answers.grammar || {});
        Object.assign(restoredAnswers, existing.answers.vocabulary || {});
        Object.assign(restoredAnswers, existing.answers.readingPartA || {});
        Object.assign(restoredAnswers, existing.answers.readingPartB || {});
        Object.assign(restoredAnswers, existing.answers.writing || {});
        if (existing.answers.speakingPart1?.audioPath) {
          restoredAnswers['speaking_p1'] = existing.answers.speakingPart1.audioPath;
        }
        if (existing.answers.speakingPart2?.sp_1_audioPath) {
          restoredAnswers['speaking_p2_q1'] = existing.answers.speakingPart2.sp_1_audioPath;
        }
        if (existing.answers.speakingPart2?.sp_2_audioPath) {
          restoredAnswers['speaking_p2_q2'] = existing.answers.speakingPart2.sp_2_audioPath;
        }
        if (existing.answers.speakingPart2?.sp_3_audioPath) {
          restoredAnswers['speaking_p2_q3'] = existing.answers.speakingPart2.sp_3_audioPath;
        }
      }

      return {
        candidate: existing,
        exam,
        restoredAnswers
      };
    }

    // Register a brand new candidate
    const id = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const newCand: Candidate = {
      id,
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

    await setDoc(doc(db, 'candidates', id), newCand);
    return {
      candidate: newCand,
      exam,
      restoredAnswers: {}
    };
  },

  async startSession(id: string): Promise<{
    candidate: Candidate;
    exam: any;
    answers: Record<string, string>;
  }> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    const isLocked = await this.checkIsPhoneLocked(candidate.phone);
    if (isLocked || candidate.isLocked) {
      throw new Error('Tài khoản/SĐT của bạn đã bị khóa bởi quản trị viên. Bạn không thể đăng nhập, thi hoặc xem tài liệu.');
    }

    // Allow session starting even if submitted so they can view results/materials on the completed screen
    const exam = await examService.getExamById(candidate.examId);

    if (!candidate.startedAt) {
      const startedAt = new Date().toISOString();
      const updatedLogs = [...candidate.logs, { timestamp: startedAt, action: 'Bắt đầu làm bài thi.' }];
      await updateDoc(doc(db, 'candidates', id), {
        startedAt,
        logs: updatedLogs
      });
      candidate.startedAt = startedAt;
      candidate.logs = updatedLogs;
    }

    // Flatten answers for React state
    const restoredAnswers: Record<string, string> = {};
    if (candidate.answers) {
      Object.assign(restoredAnswers, candidate.answers.listeningPart1 || {});
      Object.assign(restoredAnswers, candidate.answers.listeningPart2 || {});
      Object.assign(restoredAnswers, candidate.answers.grammar || {});
      Object.assign(restoredAnswers, candidate.answers.vocabulary || {});
      Object.assign(restoredAnswers, candidate.answers.readingPartA || {});
      Object.assign(restoredAnswers, candidate.answers.readingPartB || {});
      Object.assign(restoredAnswers, candidate.answers.writing || {});
      if (candidate.answers.speakingPart1?.audioPath) {
        restoredAnswers['speaking_p1'] = candidate.answers.speakingPart1.audioPath;
      }
      if (candidate.answers.speakingPart2?.sp_1_audioPath) {
        restoredAnswers['speaking_p2_q1'] = candidate.answers.speakingPart2.sp_1_audioPath;
      }
      if (candidate.answers.speakingPart2?.sp_2_audioPath) {
        restoredAnswers['speaking_p2_q2'] = candidate.answers.speakingPart2.sp_2_audioPath;
      }
      if (candidate.answers.speakingPart2?.sp_3_audioPath) {
        restoredAnswers['speaking_p2_q3'] = candidate.answers.speakingPart2.sp_3_audioPath;
      }
    }

    return {
      candidate,
      exam,
      answers: restoredAnswers
    };
  },

  async updateAnswers(id: string, answersUpdate: Partial<Candidate['answers']>, durationSeconds?: number): Promise<Candidate> {
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
      writing: { ...(candidate.answers?.writing || {}), ...(answersUpdate.writing || {}) }
    };

    const updates: any = { answers: mergedAnswers };
    if (durationSeconds !== undefined) {
      updates.durationSeconds = durationSeconds;
    }

    await updateDoc(doc(db, 'candidates', id), updates);
    candidate.answers = mergedAnswers;
    if (durationSeconds !== undefined) {
      candidate.durationSeconds = durationSeconds;
    }
    return candidate;
  },

  async addLog(id: string, action: string): Promise<Candidate> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    const normalized = action.toLowerCase();
    let tabSwitches = candidate.tabSwitches || 0;
    if (
      normalized.includes('chuyển tab') ||
      normalized.includes('rời khỏi trang') ||
      normalized.includes('tab switched') ||
      normalized.includes('tab switch') ||
      normalized.includes('rời trang') ||
      normalized.includes('hidden')
    ) {
      tabSwitches += 1;
    }

    const newLog = { timestamp: new Date().toISOString(), action };
    const updatedLogs = [...(candidate.logs || []), newLog];

    await updateDoc(doc(db, 'candidates', id), {
      tabSwitches,
      logs: updatedLogs
    });

    candidate.tabSwitches = tabSwitches;
    candidate.logs = updatedLogs;
    return candidate;
  },

  async submitTest(id: string): Promise<Candidate> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    if (candidate.submittedAt) {
      return candidate;
    }

    const exam = await examService.getExamById(candidate.examId || 'default-exam');
    const submittedAt = new Date().toISOString();
    const logs = [...(candidate.logs || []), { timestamp: submittedAt, action: 'Nộp bài thi thành công.' }];
    
    const candidateWithSubmitted = { ...candidate, submittedAt, logs };
    const scores = autoGradeCandidate(candidateWithSubmitted, exam);

    await updateDoc(doc(db, 'candidates', id), {
      submittedAt,
      logs,
      scores
    });

    candidate.submittedAt = submittedAt;
    candidate.logs = logs;
    candidate.scores = scores;
    return candidate;
  },

  async gradeWriting(id: string, writingScore: number, comment: string): Promise<Candidate> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    let updatedScores = candidate.scores;
    if (updatedScores) {
      updatedScores.writing = writingScore;
      updatedScores.total = 
        (updatedScores.listening || 0) + 
        (updatedScores.grammar || 0) + 
        (updatedScores.vocabulary || 0) + 
        (updatedScores.reading || 0) + 
        writingScore;
      updatedScores.percentage = Math.round((updatedScores.total / updatedScores.maxPossible) * 100);
    }

    await updateDoc(doc(db, 'candidates', id), {
      writingScore,
      writingComment: comment,
      scores: updatedScores
    });

    candidate.writingScore = writingScore;
    candidate.writingComment = comment;
    candidate.scores = updatedScores;
    return candidate;
  },

  async resetCandidate(id: string): Promise<Candidate> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    // Capture previous attempt in history to satisfy "Không xóa lịch sử"
    const prevAttempt = {
      submittedAt: candidate.submittedAt || new Date().toISOString(),
      startedAt: candidate.startedAt,
      scores: candidate.scores,
      answers: candidate.answers,
      logs: candidate.logs || [],
      durationSeconds: candidate.durationSeconds || 0,
      tabSwitches: candidate.tabSwitches || 0,
      writingScore: candidate.writingScore || 0,
      writingComment: candidate.writingComment || ''
    };

    const existingHistory = (candidate as any).history || [];
    const updatedHistory = [...existingHistory, prevAttempt];

    const updateFields = {
      startedAt: null,
      submittedAt: null,
      leftRoom: false,
      durationSeconds: 0,
      tabSwitches: 0,
      writingScore: 0,
      writingComment: '',
      scores: null,
      isReset: true,
      history: updatedHistory,
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
      logs: [{ timestamp: new Date().toISOString(), action: 'Giáo viên reset khôi phục bài thi. Cho phép làm bài lại lần 2.' }]
    };

    await updateDoc(doc(db, 'candidates', id), updateFields);
    return { ...candidate, ...updateFields } as Candidate;
  },

  async setCandidateLockStateByPhone(phone: string, isLocked: boolean): Promise<void> {
    try {
      const trimmedPhone = phone.trim();
      const colRef = collection(db, 'candidates');
      const q = query(colRef, where('phone', '==', trimmedPhone));
      const snap = await getDocs(q);
      
      const batchPromises = snap.docs.map((doc) => {
        return updateDoc(doc.ref, { isLocked });
      });
      await Promise.all(batchPromises);
    } catch (err) {
      console.error('Error toggling lock state:', err);
      throw err;
    }
  },

  async deleteCandidate(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'candidates', id));
    } catch (err) {
      console.error('Error deleting candidate:', err);
      throw err;
    }
  },

  async leaveRoom(id: string): Promise<Candidate> {
    const candidate = await this.getCandidateById(id);
    if (!candidate) {
      throw new Error('Không tìm thấy thông tin thí sinh.');
    }

    const leaveTime = new Date().toISOString();
    const logs = [...(candidate.logs || []), { timestamp: leaveTime, action: 'Thí sinh chủ động rời phòng thi. Hủy toàn bộ kết quả.' }];

    const updates = {
      leftRoom: true,
      submittedAt: null, // candidate didn't submit, they left
      scores: null, // clear results
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
      logs
    };

    await updateDoc(doc(db, 'candidates', id), updates);
    return { ...candidate, ...updates } as Candidate;
  }
};

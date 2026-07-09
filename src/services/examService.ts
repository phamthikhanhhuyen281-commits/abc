import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  LISTENING_PART_1,
  LISTENING_PART_2,
  SPEAKING_READ_ALOUD,
  SPEAKING_QUESTIONS,
  GRAMMAR_QUESTIONS,
  VOCABULARY_QUESTIONS,
  READING_PASSAGE,
  WRITING_QUESTIONS
} from '../questions';

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

export const examService = {
  async getExams(): Promise<Exam[]> {
    try {
      const colRef = collection(db, 'exams');
      const snap = await getDocs(colRef);
      if (snap.empty) {
        // Bootstrap default exam
        const defaultExam: Exam = {
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
        };
        await this.saveExam(defaultExam);
        return [defaultExam];
      }
      
      const list: Exam[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Exam);
      });
      return list;
    } catch (err: any) {
      const isOffline = err?.message?.includes('offline') || err?.code === 'unavailable';
      if (isOffline) {
        console.warn('Firestore is offline, unable to list exams.');
      } else {
        console.error('Error listing exams:', err);
      }
      return [];
    }
  },

  async getExamById(id: string): Promise<Exam | null> {
    try {
      const docRef = doc(db, 'exams', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Exam;
      }
      // If default-exam requested and not found, try to bootstrap
      if (id === 'default-exam') {
        const exams = await this.getExams();
        return exams.find(e => e.id === 'default-exam') || null;
      }
      return null;
    } catch (err: any) {
      const isOffline = err?.message?.includes('offline') || err?.code === 'unavailable';
      if (isOffline) {
        console.warn('Firestore is offline, unable to get exam by ID.');
      } else {
        console.error('Error getting exam:', err);
      }
      return null;
    }
  },

  async saveExam(exam: Exam): Promise<void> {
    try {
      const docRef = doc(db, 'exams', exam.id);
      await setDoc(docRef, exam);
    } catch (err) {
      console.error('Error saving exam:', err);
      throw err;
    }
  },

  async deleteExam(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'exams', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Error deleting exam:', err);
      throw err;
    }
  }
};

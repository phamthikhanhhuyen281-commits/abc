import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Candidate, candidateService } from './candidateService';

export const resultService = {
  /**
   * Get all graded/submitted results
   */
  async getResults(): Promise<Candidate[]> {
    try {
      const candidates = await candidateService.getCandidates();
      return candidates.filter(c => c.submittedAt !== null);
    } catch (err) {
      console.error('Error getting results:', err);
      return [];
    }
  },

  /**
   * Get results for a specific exam
   */
  async getResultsByExam(examId: string): Promise<Candidate[]> {
    try {
      const colRef = collection(db, 'candidates');
      const q = query(colRef, where('examId', '==', examId));
      const snap = await getDocs(q);
      const list: Candidate[] = [];
      snap.forEach((d) => {
        const c = { id: d.id, ...d.data() } as Candidate;
        if (c.submittedAt) {
          list.push(c);
        }
      });
      return list;
    } catch (err) {
      console.error('Error getting exam results:', err);
      return [];
    }
  }
};

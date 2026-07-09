import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export interface Material {
  id: string;
  title: string;
  description: string;
  url: string;
  type: string; // 'document' | 'link' | 'video' | 'other'
  createdAt: string;
}

export const materialService = {
  async getMaterials(): Promise<Material[]> {
    try {
      const colRef = collection(db, 'materials');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: Material[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Material);
      });
      return list;
    } catch (err: any) {
      const isOffline = err?.message?.includes('offline') || err?.code === 'unavailable';
      if (isOffline) {
        console.warn('Firestore is offline, unable to fetch materials.');
      } else {
        console.error('Error getting materials:', err);
      }
      return [];
    }
  },

  async saveMaterial(material: Material): Promise<void> {
    try {
      const docRef = doc(db, 'materials', material.id);
      await setDoc(docRef, material);
    } catch (err) {
      console.error('Error saving material:', err);
      throw err;
    }
  },

  async deleteMaterial(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'materials', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Error deleting material:', err);
      throw err;
    }
  }
};

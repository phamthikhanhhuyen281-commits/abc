import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface AppSettings {
  logoUrl?: string;
  themeColor?: string; // 'indigo' | 'emerald' | 'blue' | 'violet' | 'rose' | 'slate'
  slogan?: string;
  teacherPhone?: string;
  teacherEmail?: string;
  geminiApiKey?: string;
  teacherName?: string;
  teacherZalo?: string;
  teacherFacebook?: string;
  teacherWebsite?: string;
  teacherAddress?: string;
  websiteName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  favicon?: string;
  cefrThresholds?: {
    a1Max: number;
    a2Max: number;
    b1Max: number;
    b2Max: number;
    c1Max: number;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  logoUrl: '',
  themeColor: 'indigo',
  slogan: 'Your English Journey Starts Here.',
  teacherPhone: '0987.654.321',
  teacherEmail: 'teacher@english.edu.vn',
  geminiApiKey: '',
  teacherName: 'Teacher Anna',
  teacherZalo: '0987.654.321',
  teacherFacebook: 'https://facebook.com/teacher.anna',
  teacherWebsite: 'https://placement.edu.vn',
  teacherAddress: '123 Đường Láng, Đống Đa, Hà Nội',
  websiteName: 'English Placement',
  primaryColor: '#1e3a8a',
  secondaryColor: '#3b82f6',
  favicon: '',
  cefrThresholds: {
    a1Max: 19,
    a2Max: 39,
    b1Max: 59,
    b2Max: 74,
    c1Max: 89,
  }
};

export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    try {
      const docRef = doc(db, 'settings', 'global');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = { ...DEFAULT_SETTINGS, ...snap.data() };
        try {
          localStorage.setItem('app_settings_cache', JSON.stringify(data));
        } catch (e) {}
        return data;
      } else {
        // Bootstrap default settings in Firestore
        await setDoc(docRef, DEFAULT_SETTINGS);
        try {
          localStorage.setItem('app_settings_cache', JSON.stringify(DEFAULT_SETTINGS));
        } catch (e) {}
        return DEFAULT_SETTINGS;
      }
    } catch (err: any) {
      const isOffline = err?.message?.includes('offline') || err?.code === 'unavailable';
      if (isOffline) {
        console.warn('Firestore is offline, loading settings from local cache fallback.');
      } else {
        console.error('Error loading settings from Firestore:', err);
      }
      
      try {
        const cached = localStorage.getItem('app_settings_cache');
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {}
      
      return DEFAULT_SETTINGS;
    }
  },

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const docRef = doc(db, 'settings', 'global');
      const current = await this.getSettings();
      const updated = { ...current, ...updates };
      await setDoc(docRef, updated);
      try {
        localStorage.setItem('app_settings_cache', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    } catch (err) {
      console.error('Error updating settings in Firestore:', err);
      throw err;
    }
  }
};

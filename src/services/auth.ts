import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Helper to hash password using SHA-256 for Firestore checking
export function sha256(ascii: string): string {
  function ror(num: number, amt: number) {
    return (num >>> amt) | (num << (32 - amt));
  }
  const mathMin = Math.min;
  const maxWord = Math.pow(2, 32);
  const result = [];
  const words: number[] = [];
  let asciiLength = ascii.length;
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let isComposite = {};
  for (let candidate = 2; result.length < 64; candidate++) {
    if (!(candidate in isComposite)) {
      for (let i = candidate * candidate; i < 311; i += candidate) {
        (isComposite as any)[i] = true;
      }
      result.push(candidate);
    }
  }

  let i = 0;
  words[words.length] = 0;
  for (i = 0; i < asciiLength; i++) {
    const charCode = ascii.charCodeAt(i);
    const wordIndex = i >> 2;
    words[wordIndex] = (words[wordIndex] || 0) | (charCode << (24 - (i % 4) * 8));
  }
  const wordCount = (asciiLength + 8 >> 6) + 1 << 4;
  words[wordCount - 1] = asciiLength * 8;

  for (let j = 0; j < wordCount; j += 16) {
    const w = words.slice(j, j + 16);
    const h = hash.slice(0);
    for (let round = 0; round < 64; round++) {
      if (round >= 16) {
        const s0 = ror(w[round - 15], 7) ^ ror(w[round - 15], 18) ^ (w[round - 15] >>> 3);
        const s1 = ror(w[round - 2], 17) ^ ror(w[round - 2], 19) ^ (w[round - 2] >>> 10);
        w[round] = (w[round - 16] + s0 + w[round - 7] + s1) | 0;
      }
      const ch = (h[4] & h[5]) ^ (~h[4] & h[6]);
      const maj = (h[0] & h[1]) ^ (h[0] & h[2]) ^ (h[1] & h[2]);
      const s0 = ror(h[0], 2) ^ ror(h[0], 13) ^ ror(h[0], 22);
      const s1 = ror(h[4], 6) ^ ror(h[4], 11) ^ ror(h[4], 25);
      const temp1 = h[7] + s1 + ch + k[round] + (w[round] || 0);
      const temp2 = s0 + maj;
      h.unshift((temp1 + temp2) | 0);
      h[4] = (h[4] + temp1) | 0;
      h[8] = 0;
    }
    for (let round = 0; round < 8; round++) {
      hash[round] = (hash[round] + h[round]) | 0;
    }
  }

  let sha = '';
  for (let idx = 0; idx < 8; idx++) {
    sha += ('00000000' + (hash[idx] >>> 0).toString(16)).slice(-8);
  }
  return sha;
}

const DEFAULT_PASS_HASH = sha256('EnglishPlacement2026@SecureTeacher');

// Authentication Service for Admin Mode
export const authService = {
  async login(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const hashed = sha256(password);
      const adminDocRef = doc(db, 'admins', 'config');
      const snap = await getDoc(adminDocRef);

      if (!snap.exists()) {
        return { success: false, error: 'Chưa cấu hình tài khoản Admin. Vui lòng tạo tài khoản trước.' };
      } else {
        const data = snap.data();
        if (hashed === data.adminPasswordHash) {
          localStorage.setItem('admin_token', 'true');
          return { success: true };
        }
      }
      return { success: false, error: 'Mật khẩu quản trị viên không chính xác.' };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err.message };
    }
  },

  async isConfigured(): Promise<boolean> {
    try {
      const adminDocRef = doc(db, 'admins', 'config');
      const snap = await getDoc(adminDocRef);
      return snap.exists() && !!snap.data()?.adminPasswordHash;
    } catch (err) {
      console.error('isConfigured check error:', err);
      return false;
    }
  },

  async registerAdmin(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const hashed = sha256(password);
      const adminDocRef = doc(db, 'admins', 'config');
      await setDoc(adminDocRef, {
        adminPasswordHash: hashed,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('admin_token', 'true');
      return { success: true };
    } catch (err: any) {
      console.error('registerAdmin error:', err);
      return { success: false, error: err.message };
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('admin_token');
  },

  async isLoggedIn(): Promise<boolean> {
    return localStorage.getItem('admin_token') === 'true';
  },

  async updateAdminPassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const adminDocRef = doc(db, 'admins', 'config');
      const snap = await getDoc(adminDocRef);
      if (!snap.exists()) {
        return { success: false, error: 'Tài khoản chưa được khởi tạo.' };
      }
      
      const currentHash = snap.data().adminPasswordHash;
      if (sha256(oldPassword) !== currentHash) {
        return { success: false, error: 'Mật khẩu hiện tại không chính xác.' };
      }

      const newHashed = sha256(newPassword);
      await updateDoc(adminDocRef, {
        adminPasswordHash: newHashed,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (err: any) {
      console.error('Password update error:', err);
      return { success: false, error: err.message };
    }
  }
};

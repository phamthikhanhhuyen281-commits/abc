import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { storage, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const storageService = {
  /**
   * Upload a File object (from file input / drag & drop) to Firebase Storage
   */
  async uploadFile(file: File, folderPath: string): Promise<string> {
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const uniqueName = `${Date.now()}_${cleanName}`;
      const fileRef = ref(storage, `${folderPath}/${uniqueName}`);
      
      const snap = await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(snap.ref);
      return downloadUrl;
    } catch (err) {
      console.error('Error uploading file to Firebase Storage:', err);
      throw err;
    }
  },

  /**
   * Upload base64 encoded audio string to Firebase Storage
   */
  async uploadBase64Audio(base64Data: string, candidateId: string, part: string): Promise<string> {
    // 1. Try uploading directly to Firebase Storage first (highly persistent, cloud-based)
    try {
      let cleanBase64 = base64Data;
      let contentType = 'audio/webm';
      let ext = 'webm';
      
      if (base64Data.includes(',')) {
        const parts = base64Data.split(',');
        cleanBase64 = parts[1];
        const match = parts[0].match(/data:(.*?);base64/);
        if (match && match[1]) {
          contentType = match[1];
          if (contentType.includes('mp4')) ext = 'mp4';
          else if (contentType.includes('m4a')) ext = 'm4a';
          else if (contentType.includes('ogg')) ext = 'ogg';
          else if (contentType.includes('wav')) ext = 'wav';
        }
      }
      
      const fileRef = ref(storage, `candidates/${candidateId}/${part}.${ext}`);
      const snap = await uploadString(fileRef, cleanBase64, 'base64', {
        contentType
      });
      const downloadUrl = await getDownloadURL(snap.ref);
      console.log('Successfully saved speaking recording to Firebase Storage:', downloadUrl);
      return downloadUrl;
    } catch (err) {
      console.warn('Firebase Storage upload failed (probably requires upgraded Blaze plan). Falling back to Firestore collection...');
    }

    // 2. Fall back to storing in a custom Firestore collection "candidate_audios"
    // This is 100% persistent, card-less, completely free, and avoids the 1MB candidate document size limit.
    try {
      const docId = `${candidateId}_${part}`;
      const docRef = doc(db, 'candidate_audios', docId);
      await setDoc(docRef, {
        candidateId,
        part,
        audioData: base64Data,
        createdAt: new Date().toISOString()
      });
      console.log('Successfully saved speaking recording to Firestore collection candidate_audios:', docId);
      return `db_audio:${docId}`;
    } catch (err) {
      console.warn('Firestore fallback audio saving failed, trying local Express server fallback:', err);
    }

    // 3. Fall back to local Express server storage (for local development or when Firebase is not configured)
    try {
      const response = await fetch('/api/candidates/upload-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: candidateId,
          part: part,
          audioData: base64Data
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioPath) {
          console.log('Successfully saved speaking recording to local Express server fallback:', data.audioPath);
          return data.audioPath;
        }
      }
      throw new Error(`Server returned status ${response.status}`);
    } catch (err) {
      console.warn('All cloud/server audio upload attempts failed. Falling back to direct Base64 embedding:', err);
      // Fallback: Return the raw Base64 data URI directly, which will be saved in the candidate's answers document in Firestore.
      // This ensures everything works completely cardless and on serverless environments like Vercel.
      return base64Data;
    }
  },

  /**
   * Helper to resolve custom db_audio: URIs back to raw Base64 data strings
   */
  async getAudioData(audioPath: string): Promise<string> {
    if (audioPath && audioPath.startsWith('db_audio:')) {
      const docId = audioPath.replace('db_audio:', '');
      const docRef = doc(db, 'candidate_audios', docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data().audioData;
      }
      throw new Error('Không tìm thấy dữ liệu ghi âm trong Firestore');
    }
    return audioPath;
  }
};


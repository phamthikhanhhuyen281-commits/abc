import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { storage, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Helper to wrap promises with a timeout
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage = 'Timeout'): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

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
      
      // Use 4-second timeout to prevent hanging on unconfigured Firebase Storage
      const snap = await withTimeout(
        uploadString(fileRef, cleanBase64, 'base64', { contentType }),
        4000,
        'Firebase Storage upload timed out'
      );
      
      // Use 3-second timeout for URL retrieval
      const downloadUrl = await withTimeout(
        getDownloadURL(snap.ref),
        3000,
        'Firebase Storage getDownloadURL timed out'
      );
      
      console.log('Successfully saved speaking recording to Firebase Storage:', downloadUrl);
      return downloadUrl;
    } catch (err) {
      console.warn('Firebase Storage upload failed or timed out. Falling back to Firestore collection... Error:', err);
    }

    // 2. Fall back to storing in a custom Firestore collection "candidate_audios"
    // Only attempt this if the payload is under 1MB to avoid Firestore document limits
    if (base64Data.length < 1000000) {
      try {
        const docId = `${candidateId}_${part}`;
        const docRef = doc(db, 'candidate_audios', docId);
        
        // Use 4-second timeout to prevent Firestore writes from hanging
        await withTimeout(
          setDoc(docRef, {
            candidateId,
            part,
            audioData: base64Data,
            createdAt: new Date().toISOString()
          }),
          4000,
          'Firestore audio upload timed out'
        );
        
        console.log('Successfully saved speaking recording to Firestore collection candidate_audios:', docId);
        return `db_audio:${docId}`;
      } catch (err) {
        console.warn('Firestore fallback audio saving failed, trying local Express server fallback:', err);
      }
    } else {
      console.warn('Audio data is too large for Firestore document limit (>1MB). Skipping Firestore fallback...');
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


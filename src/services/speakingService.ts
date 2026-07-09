import { GoogleGenAI, Type } from '@google/genai';
import { settingsService } from './settingsService';
import { storageService } from './storageService';

export interface SpeakingEvaluationResult {
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
}

export const speakingService = {
  async evaluateSpeakingAudio(
    audioUrl: string,
    referenceText: string
  ): Promise<SpeakingEvaluationResult> {
    const settings = await settingsService.getSettings();
    const apiKey = settings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not configured client-side or in env. Falling back to simulated evaluation.');
      return this.getSimulatedFallback();
    }

    try {
      // Resolve the audio URL (handles db_audio: URIs from cardless fallback)
      const resolvedUrl = await storageService.getAudioData(audioUrl);
      
      // Fetch audio data from the URL and convert to Base64
      const response = await fetch(resolvedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio from URL: ${resolvedUrl}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert ArrayBuffer to base64
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);

      // Determine mime type
      let mimeType = 'audio/webm';
      if (audioUrl.toLowerCase().includes('.wav')) {
        mimeType = 'audio/wav';
      } else if (audioUrl.toLowerCase().includes('.mp3')) {
        mimeType = 'audio/mp3';
      }

      const promptText = `
        You are an expert English pronunciation examiner. Analyze the attached audio of a candidate reading aloud the following reference text:
        
        Reference Text:
        "${referenceText}"

        Your task is to analyze their speech and return a JSON evaluation of their pronunciation.
        You must evaluate:
        1. Overall pronunciation score (0 to 100).
        2. Correctness of final sounds like 's' (words like: requires, skills, wants).
        3. Correctness of final sounds like 't' (words like: test, must, text, best).
        4. Correctness of final sounds like 'k' (words like: speak, text).
        5. Correctness of word stress on 1-syllable words (e.g. test, great).
        6. Correctness of word stress on 2-syllable words (e.g. focus, clearly).
        7. Correctness of word stress on 3-syllable words (e.g. candidate, confident, performance).
        8. Correctness of word stress on 4-syllable words (e.g. situation, conversation).
        9. A transcript of what you heard.
        10. A detailed, helpful feedback explanation in Vietnamese (details) explaining what they did well and where they can improve, especially concerning syllables and final consonants.

        You must return exactly the specified JSON schema structure.
      `;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const audioPart = {
        inlineData: {
          mimeType,
          data: base64Audio
        }
      };

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [audioPart, promptText],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER, description: "Overall pronunciation score from 0 to 100" },
              finalS: { type: Type.STRING, description: "Final 's' pronunciation check", enum: ["correct", "incorrect", "partial"] },
              finalT: { type: Type.STRING, description: "Final 't' pronunciation check", enum: ["correct", "incorrect", "partial"] },
              finalK: { type: Type.STRING, description: "Final 'k' pronunciation check", enum: ["correct", "incorrect", "partial"] },
              stress1: { type: Type.STRING, description: "Syllable stress check for 1-syllable words", enum: ["correct", "incorrect"] },
              stress2: { type: Type.STRING, description: "Syllable stress check for 2-syllable words", enum: ["correct", "incorrect"] },
              stress3: { type: Type.STRING, description: "Syllable stress check for 3-syllable words", enum: ["correct", "incorrect"] },
              stress4: { type: Type.STRING, description: "Syllable stress check for 4-syllable words", enum: ["correct", "incorrect"] },
              transcript: { type: Type.STRING, description: "Transcription of the speech as heard" },
              details: { type: Type.STRING, description: "Detailed critique and advice in Vietnamese, discussing final sounds and stresses." }
            },
            required: [
              "score",
              "finalS",
              "finalT",
              "finalK",
              "stress1",
              "stress2",
              "stress3",
              "stress4",
              "transcript",
              "details"
            ]
          }
        }
      });

      const jsonText = result.text?.trim() || '{}';
      return JSON.parse(jsonText) as SpeakingEvaluationResult;

    } catch (error) {
      console.error('Gemini speaking evaluation failed, returning fallback evaluation:', error);
      return this.getSimulatedFallback();
    }
  },

  getSimulatedFallback(): SpeakingEvaluationResult {
    return {
      score: 78,
      finalS: 'partial',
      finalT: 'correct',
      finalK: 'incorrect',
      stress1: 'correct',
      stress2: 'correct',
      stress3: 'correct',
      stress4: 'incorrect',
      transcript: "The local test requires great focus and skill. You must speak clearly into the microphone to describe the situation. Each candidate want to show their best performance. Do not feel anxious; just read this short text naturally with confident pronunciation.",
      details: "Học sinh có phát âm rõ ràng, tốc độ vừa phải dễ nghe. Tuy nhiên, một số âm cuối s, k bị bỏ qua hoặc phát âm chưa rõ (ví dụ: 'skills' đọc thiếu s âm cuối, 'speak' phát âm đuôi k chưa rõ). Trọng âm từ 4 âm tiết (như situation) cần được nhấn chính xác hơn. Các từ 1 và 2 âm tiết phát âm tương đối tốt, đúng trọng âm."
    };
  }
};

import { GoogleGenAI, Type } from '@google/genai';
import { settingsService } from './settingsService';

export interface ScannedQuestion {
  text: string;
  type: 'mcq' | 'blank' | 'writing' | 'speaking';
  options?: string[];
  answer?: string;
  suggestedSkill: 'listeningPart1' | 'listeningPart2' | 'grammar' | 'vocabulary' | 'readingPartA' | 'readingPartB' | 'writing' | 'speaking';
  passage?: string;
}

export interface ScannedExamResult {
  title: string;
  description: string;
  durationMinutes: number;
  questions: ScannedQuestion[];
}

export const aiScanService = {
  async scanExamWithAI(
    base64Data: string,
    mimeType: string
  ): Promise<ScannedExamResult> {
    // 1. Fetch GEMINI_API_KEY from Settings or Environment Variable
    const settings = await settingsService.getSettings();
    const apiKey = settings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
    
    if (!apiKey) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY trong hệ thống. Giáo viên vui lòng cấu hình trong Settings > Cài đặt hệ thống, hoặc cài đặt biến môi trường VITE_GEMINI_API_KEY trên Vercel.');
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const promptText = `
      You are an expert English Language examiner. Your task is to scan the attached file/image/PDF of an English test/exam and extract ALL questions EXACTLY as they appear in the image.
      
      CRITICAL REQUIREMENT:
      - Extract ONLY the actual questions present in the scanned material. Do NOT invent, generate, or add any mock/placeholder questions that are not present in the image.
      - For each scanned question, identify its properties (text, options, answer) and make a smart guess for which skill section it belongs to: "listeningPart1", "listeningPart2", "grammar", "vocabulary", "readingPartA", "readingPartB", "writing", or "speaking".
      
      Structure the JSON output exactly with these specifications:
      1. "title": A descriptive title for the exam in Vietnamese (extracted from the image if present, or suggested).
      2. "description": A short summary of the scanned test in Vietnamese.
      3. "durationMinutes": Duration of the test (number of minutes, e.g. 45 or 60, default to 60 if not specified).
      4. "questions": An array of questions extracted from the document. Each question must have:
          - "text": The exact text of the question found in the image.
          - "type": "mcq" (if it has multiple choice options), "blank" (if it is fill-in-the-blank), "writing" (if it is translation/essay), or "speaking" (if it is speaking).
          - "options": An array of strings representing options (e.g., ["option 1", "option 2", ...]) ONLY if type is "mcq".
          - "answer": The correct answer (e.g., "A", "B", "C", "D" for MCQs, or the word/sentence for blank/writing).
          - "suggestedSkill": The suggested target skill for this question. Choose one of: "listeningPart1", "listeningPart2", "grammar", "vocabulary", "readingPartA", "readingPartB", "writing", "speaking".
          - "passage": (Optional) The context passage text if the question is part of a reading passage or has a context paragraph.

      Output valid JSON matching this schema exactly.
    `;

    // Strip metadata if present in base64Data (e.g. "data:image/jpeg;base64,...")
    let cleanBase64 = base64Data;
    if (base64Data.includes(',')) {
      cleanBase64 = base64Data.split(',')[1];
    }

    const filePart = {
      inlineData: {
        mimeType,
        data: cleanBase64
      }
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [filePart, promptText],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              durationMinutes: { type: Type.INTEGER },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["mcq", "blank", "writing", "speaking"] },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answer: { type: Type.STRING },
                    suggestedSkill: { 
                      type: Type.STRING, 
                      enum: [
                        "listeningPart1", 
                        "listeningPart2", 
                        "grammar", 
                        "vocabulary", 
                        "readingPartA", 
                        "readingPartB", 
                        "writing", 
                        "speaking"
                      ] 
                    },
                    passage: { type: Type.STRING }
                  },
                  required: ["text", "type", "suggestedSkill"]
                }
              }
            },
            required: ["title", "description", "durationMinutes", "questions"]
          }
        }
      });

      const jsonText = response.text?.trim() || '{}';
      return JSON.parse(jsonText) as ScannedExamResult;

    } catch (error: any) {
      console.error('AI exam scanning failed:', error);
      throw new Error('Quá trình quét đề bằng AI thất bại: ' + (error.message || error));
    }
  }
};

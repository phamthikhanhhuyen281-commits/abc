import { GoogleGenAI, Type } from '@google/genai';
import { settingsService } from './settingsService';

export interface ScannedQuestion {
  text: string;
  type: 'mcq' | 'blank' | 'writing' | 'speaking';
  options?: string[];
  answer?: string;
  suggestedSkill: 'listeningPart1' | 'listeningPart2' | 'grammar' | 'vocabulary' | 'readingPartA' | 'readingPartB' | 'writing' | 'speaking';
  passage?: string;
  needs_review?: boolean;
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
      Bạn là AI hỗ trợ import tài liệu vào đề thi. Nhiệm vụ của bạn là phân tích file mà admin tải lên (ảnh chụp đề thi, ảnh chụp màn hình hoặc file PDF) và tự động nhận diện nội dung.

      ## QUY TẮC PHÂN TÍCH:
      1. KHÔNG GIẢ ĐỊNH file có đầy đủ cả 4 kỹ năng (Listening, Reading, Writing, Speaking).
      2. Tự xác định file tải lên thuộc về những kỹ năng/nhóm câu hỏi nào:
         - Listening (Nghe)
         - Reading (Đọc)
         - Writing (Viết)
         - Speaking (Nói)
         - Grammar/Vocabulary (Ngữ pháp & Từ vựng độc lập)
         - Hoặc chứa nhiều kỹ năng kết hợp nếu có.
      3. CHỈ TẠO dữ liệu cho những kỹ năng thực sự xuất hiện trong file. Ví dụ:
         - File chỉ có Reading -> chỉ tạo Reading (readingPartA hoặc readingPartB).
         - File chỉ có Speaking -> chỉ tạo Speaking.
         - File gồm Reading + Writing -> chỉ tạo Reading và Writing.
         - File gồm cả 4 kỹ năng -> tạo đủ cả 4.
      4. Với mỗi kỹ năng được phát hiện, trích xuất cấu trúc tương ứng như sau:
         ### Reading (Đọc hiểu):
         - Tách từng passage (đoạn văn ngữ cảnh).
         - Xác định Part/Passage tương ứng.
         - Tách các dạng bài (MCQ - Trắc nghiệm, T/F/NG - Đúng/Sai/Không đề cập, Matching - Nối cột/Nối câu,...).
         - Ghép đáp án đúng nếu có.
         - Định nghĩa "suggestedSkill" là: "readingPartA" (cho MCQ chọn từ đọc hiểu) hoặc "readingPartB" (cho Đúng/Sai/Không đề cập hoặc Matching).

         ### Listening (Nghe hiểu):
         - Tách từng Part bài nghe.
         - Lưu transcript (nội dung text nghe) vào trường "passage" nếu có sẵn trong file tài liệu.
         - Ghép link audio nếu có đề cập rõ.
         - Tách rõ ràng từng câu hỏi và đáp án lựa chọn tương ứng.
         - Định nghĩa "suggestedSkill" là: "listeningPart1" (cho trắc nghiệm bài nghe) hoặc "listeningPart2" (cho điền khuyết/viết từ bài nghe).

         ### Writing (Viết luận):
         - Tách Task 1, Task 2 (nếu có).
         - Lưu trữ đề bài (prompt), mô tả hình ảnh hoặc đề bài mẫu, sample answer (bài viết mẫu), thang điểm band điểm mục tiêu (nếu có).
         - Định nghĩa "suggestedSkill" là "writing".

         ### Speaking (Nói):
         - Tách Part 1, Part 2, Part 3 của bài nói.
         - Lưu lại cue card, các câu hỏi gợi ý và câu hỏi follow-up (câu hỏi phụ theo sau) trong đề.
         - Định nghĩa "suggestedSkill" là "speaking".

         ### Grammar / Vocabulary:
         - Nếu là các câu trắc nghiệm ngữ pháp độc lập ngắn, gán "suggestedSkill" là "grammar".
         - Nếu là câu trắc nghiệm từ vựng độc lập ngắn, gán "suggestedSkill" là "vocabulary".

      5. Nếu file chứa nhiều đề thi (ví dụ Test 1, Test 2, Test 3...), hãy tự động phân tách và gom chúng lại thành nhiều đề độc lập, gán tên "title" rõ ràng theo từng bộ đề phân tách được.
      6. Nếu có phần đáp án (Answer Key) ở cuối file, hãy tự động phân tích và ghép chính xác đáp án đúng (A, B, C, D hoặc nội dung văn bản cụ thể) tương ứng vào từng câu hỏi.
      7. Nếu bạn không chắc chắn về bất kỳ phần thông tin nào trong câu hỏi bóc tách, hoặc cần giáo viên rà soát lại, hãy đánh dấu: "needs_review": true cho câu hỏi đó.
      8. Xuất kết quả dưới dạng JSON có cấu trúc khớp hoàn toàn với specifications được cung cấp ở schema.

      LƯU Ý:
      - Tuyệt đối không tạo ra kỹ năng hoặc dữ liệu không tồn tại trong file.
      - Không được bỏ sót bất kỳ nội dung câu hỏi nào xuất hiện trong tài liệu.
      - Ưu tiên giữ nguyên định dạng, từ ngữ và nội dung gốc của câu hỏi.
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
                    passage: { type: Type.STRING },
                    needs_review: { type: Type.BOOLEAN }
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

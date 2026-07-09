import React, { useState, useEffect, useRef } from 'react';
import { PenTool, CheckCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { WRITING_QUESTIONS } from '../questions';

interface WritingSectionProps {
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  onSkipQuestion: (questionId: string) => void;
  onSaveProgress: () => Promise<void>;
  questions?: any[];
}

export default function WritingSection({
  answers,
  onAnswerChange,
  onSkipQuestion,
  onSaveProgress,
  questions = WRITING_QUESTIONS
}: WritingSectionProps) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Function to handle text change
  const handleTextChange = (id: string, value: string) => {
    setSaveStatus('dirty');
    onAnswerChange(id, value);

    // Cancel existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer to automatically commit to backend after 1.5s of silence
    setSaveStatus('saving');
    debounceTimer.current = setTimeout(async () => {
      try {
        await onSaveProgress();
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('dirty');
      }
    }, 1500);
  };

  // Ensure any pending changes are saved on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        onSaveProgress().catch(err => console.error('Final unmount save failed:', err));
      }
    };
  }, []);

  return (
    <div id="writing-section-wrapper" className="space-y-6">
      
      {/* Section Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-indigo-900" />
            <h2 className="text-lg font-bold text-slate-800">SECTION 4: WRITING (DỊCH VIẾT)</h2>
          </div>

          {/* Autosave status indicator */}
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border">
            {saveStatus === 'saved' && (
              <span className="text-green-700 bg-green-50 border-green-200 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Đã tự động lưu ✓
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="text-indigo-900 bg-indigo-50 border-indigo-200 flex items-center gap-1 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tự động lưu...
              </span>
            )}
            {saveStatus === 'dirty' && (
              <span className="text-amber-700 bg-amber-50 border-amber-200 flex items-center gap-1">
                Có thay đổi chưa lưu
              </span>
            )}
          </div>
        </div>

        <p className="text-slate-500 text-xs font-medium uppercase tracking-wide leading-relaxed mb-6">
          Dịch các câu tiếng Việt sau đây sang tiếng Anh. Lưu ý viết câu hoàn chỉnh, đúng chính tả, sử dụng đúng dấu câu.
        </p>

        {/* Translation questions list */}
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const val = answers[q.id] || '';
            const isSkipped = val === '__SKIPPED__';

            return (
              <div
                key={q.id}
                id={`writing-card-${q.id}`}
                className={`border rounded-xl overflow-hidden shadow-2xs transition-colors ${
                  isSkipped ? 'border-amber-200 bg-amber-50/10' : 'border-slate-150 bg-slate-50/20'
                }`}
              >
                {/* Vietnamese Question Label */}
                <div className="bg-slate-50 border-b border-slate-150 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-indigo-950">
                    <span className="bg-indigo-900 text-white text-xs px-2 py-0.5 rounded-md">
                      Câu {idx + 1}
                    </span>
                    <p className="leading-relaxed font-sans">{q.vietnamese}</p>
                  </div>
                  <span className="text-slate-400 font-mono text-[10px] uppercase font-bold shrink-0">
                    [1 POINT]
                  </span>
                </div>

                {/* English Answer Input area */}
                <div className="p-4 bg-white">
                  {isSkipped ? (
                    <div className="bg-amber-100/40 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        ⚠️ Bạn đã bỏ qua câu hỏi này.
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTextChange(q.id, '');
                        }}
                        className="bg-white border border-amber-300 text-indigo-900 hover:bg-indigo-50 px-3 py-1 rounded-lg font-bold shadow-sm transition-colors cursor-pointer text-[11px]"
                      >
                        LÀM LẠI CÂU NÀY
                      </button>
                    </div>
                  ) : (
                    <textarea
                      id={`textarea-writing-${q.id}`}
                      placeholder="Type your English translation here..."
                      rows={2}
                      value={val}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      className="w-full p-3.5 border-2 border-slate-200 rounded-lg focus:border-indigo-900 focus:outline-none text-sm font-sans text-slate-800 leading-relaxed placeholder-slate-400 resize-y"
                    />
                  )}

                  {/* Skip control and Note footer inside the question box */}
                  <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-dashed border-slate-150 text-[11px] text-slate-400">
                    <span className="font-medium italic">*(Bỏ qua nếu bạn không dịch được)*</span>
                    {!isSkipped && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSkipQuestion(q.id);
                          handleTextChange(q.id, '__SKIPPED__');
                        }}
                        className="text-slate-400 hover:text-amber-700 font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        BỎ QUA CÂU NÀY
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}

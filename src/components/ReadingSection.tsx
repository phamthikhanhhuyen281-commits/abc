import React, { useEffect } from 'react';
import { BookOpen, HelpCircle, CheckCircle } from 'lucide-react';
import { READING_PASSAGE } from '../questions';

interface ReadingSectionProps {
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  onSkipQuestion: (questionId: string) => void;
  currentQuestionId: string;
  setCurrentQuestionId: (id: string) => void;
  passage?: {
    title: string;
    text: string;
    questionsPartA: any[];
    questionsPartB: any[];
  };
}

export default function ReadingSection({
  answers,
  onAnswerChange,
  onSkipQuestion,
  currentQuestionId,
  setCurrentQuestionId,
  passage = READING_PASSAGE
}: ReadingSectionProps) {
  // Combine all reading questions
  const allReadingQuestions = [
    ...(passage.questionsPartA || []).map(q => ({ ...q, part: 'A' })),
    ...(passage.questionsPartB || []).map(q => ({ ...q, part: 'B' }))
  ];

  // Scroll to active question clicked from Navigator
  useEffect(() => {
    if (currentQuestionId) {
      const element = document.getElementById(`reading-q-${currentQuestionId}`);
      if (element) {
        const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
        element.scrollIntoView({ behavior: isMobile ? 'auto' : 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
        const timer = setTimeout(() => {
          element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentQuestionId]);

  return (
    <div id="reading-section-wrapper" className="space-y-6">
      
      {/* 2-Pane Split Grid for IELTS exam feel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Pane: Reading Passage (Continuous reference) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[650px] overflow-hidden">
          <div className="border-b border-slate-100 pb-3 mb-4 shrink-0">
            <h3 className="font-extrabold text-indigo-950 text-sm flex items-center gap-1.5 uppercase">
              <BookOpen className="w-4 h-4 text-indigo-900" /> Reading Passage
            </h3>
          </div>
          
          {/* Scrollable text container */}
          <div className="flex-grow overflow-y-auto pr-2 font-serif text-slate-800 leading-relaxed text-sm space-y-4 whitespace-pre-wrap select-none scrollbar-thin text-justify">
            <h2 className="text-lg md:text-xl font-bold font-sans text-slate-900 border-b border-dashed border-slate-150 pb-2 mb-3">
              {passage.title}
            </h2>
            {passage.text}
          </div>
        </div>

        {/* Right Pane: All reading questions in one list */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[650px] overflow-hidden">
          
          <div className="border-b border-slate-100 pb-3 mb-4 shrink-0 flex items-center justify-between">
            <h3 className="font-extrabold text-indigo-950 text-sm flex items-center gap-1.5 uppercase">
              <HelpCircle className="w-4 h-4 text-indigo-900" /> Questions List (Câu 1 - 6)
            </h3>
            <span className="text-xs font-mono bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded-md font-bold">
              Tất cả câu hỏi
            </span>
          </div>

          {/* Scrollable Questions list */}
          <div className="flex-grow overflow-y-auto pr-2 space-y-6 scrollbar-thin">
            {allReadingQuestions.map((q, idx) => {
              const currentAnswer = answers[q.id] || '';
              const isSkipped = currentAnswer === '__SKIPPED__';
              const isSelected = !!currentAnswer && !isSkipped;

              return (
                <div
                  key={q.id}
                  id={`reading-q-${q.id}`}
                  className={`p-4 rounded-xl border transition-all ${
                    isSkipped
                      ? 'border-amber-300 bg-amber-50/10'
                      : isSelected ? 'bg-indigo-50/15 border-indigo-200' : 'bg-slate-50/25 border-slate-150'
                  } ${q.id === currentQuestionId ? 'ring-2 ring-indigo-900/60' : ''}`}
                  onClick={() => setCurrentQuestionId(q.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-black font-mono text-indigo-900 bg-indigo-100/70 px-2 py-0.5 rounded-md mt-0.5 shrink-0">
                        Q{(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 leading-snug">
                        {q.text}
                      </h4>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                  </div>

                  {/* Level details badge */}
                  <div className="mb-2.5">
                    <span className="text-[9px] font-black uppercase text-indigo-900/60 tracking-wider">
                      {q.part === 'A' ? 'Phần A: Chọn đáp án đúng' : 'Phần B: True / False / Not Given'}
                    </span>
                  </div>

                  {/* Options Panel */}
                  {isSkipped ? (
                    <div className="bg-amber-100/40 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        ⚠️ Bạn đã bỏ qua câu hỏi này.
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnswerChange(q.id, '');
                        }}
                        className="bg-white border border-amber-300 text-indigo-900 hover:bg-indigo-50 px-3 py-1 rounded-lg font-bold shadow-sm transition-colors cursor-pointer text-[11px]"
                      >
                        LÀM LẠI CÂU NÀY
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {q.options?.map((option, oIdx) => {
                        let identifier = '';
                        if (q.part === 'A') {
                          identifier = String.fromCharCode(65 + oIdx); // A, B, C, D
                        } else {
                          identifier = option; // "True", "False", "Not Given"
                        }

                        const isOptionSelected = currentAnswer === identifier;

                        return (
                          <button
                            key={oIdx}
                            id={`option-${q.id}-${identifier}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnswerChange(q.id, identifier);
                              setCurrentQuestionId(q.id);
                            }}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-2.5 text-xs font-medium ${
                              isOptionSelected
                                ? 'bg-indigo-900 border-indigo-900 text-white font-semibold'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[9px] shrink-0 ${
                              isOptionSelected ? 'bg-white text-indigo-900 border-white' : 'border-slate-300 text-slate-400 bg-slate-50'
                            }`}>
                              {q.part === 'A' ? identifier : (oIdx + 1)}
                            </div>
                            <span className="leading-tight">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Skip control and Note footer inside the question box */}
                  <div className="flex items-center justify-between mt-3.5 pt-2 border-t border-dashed border-slate-200 text-[11px] text-slate-400">
                    <span className="font-medium italic">*(Bỏ qua nếu bạn không làm được)*</span>
                    {!isSkipped && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSkipQuestion(q.id);
                          onAnswerChange(q.id, '__SKIPPED__');
                        }}
                        className="text-slate-400 hover:text-amber-700 font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        BỎ QUA CÂU NÀY
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend and help info in footer */}
          <div className="pt-3 border-t border-slate-100 shrink-0">
            <p className="text-[10px] text-slate-400 italic text-center font-medium">
              Bạn có thể làm bài và tự do quay lại thay đổi câu trả lời bất cứ lúc nào trước khi nộp bài.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}

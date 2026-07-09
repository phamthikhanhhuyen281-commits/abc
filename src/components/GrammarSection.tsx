import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, HelpCircle, CheckCircle } from 'lucide-react';
import { GRAMMAR_QUESTIONS } from '../questions';

interface GrammarSectionProps {
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  onSkipQuestion: (questionId: string) => void;
  currentQuestionId: string;
  setCurrentQuestionId: (id: string) => void;
  questions?: any[];
}

export default function GrammarSection({
  answers,
  onAnswerChange,
  onSkipQuestion,
  currentQuestionId,
  setCurrentQuestionId,
  questions = GRAMMAR_QUESTIONS
}: GrammarSectionProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const QUESTIONS_PER_PAGE = 5;
  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);

  // Sync with currentQuestionId from QuestionNavigator
  useEffect(() => {
    if (currentQuestionId) {
      const qIndex = questions.findIndex(q => q.id === currentQuestionId);
      if (qIndex >= 0) {
        const targetPage = Math.floor(qIndex / QUESTIONS_PER_PAGE);
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }

        // Delay slightly to allow rendering before scroll
        setTimeout(() => {
          const element = document.getElementById(`grammar-q-${currentQuestionId}`);
          if (element) {
            const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
            element.scrollIntoView({ behavior: isMobile ? 'auto' : 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
            }, 1500);
          }
        }, 100);
      }
    }
  }, [currentQuestionId, questions]);

  // Set the first question of the current page as the active question when page changes manually
  const handlePageChange = (pageIdx: number) => {
    setCurrentPage(pageIdx);
    const firstQOfPage = questions[pageIdx * QUESTIONS_PER_PAGE];
    if (firstQOfPage) {
      setCurrentQuestionId(firstQOfPage.id);
    }
  };

  const getPageQuestions = () => {
    const start = currentPage * QUESTIONS_PER_PAGE;
    return questions.slice(start, start + QUESTIONS_PER_PAGE);
  };

  return (
    <div id="grammar-section-wrapper" className="space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: 5-Question Paginated Canvas */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-900" />
              <h2 className="text-base font-black text-slate-800 uppercase">SECTION 2: GRAMMAR (NGỮ PHÁP)</h2>
            </div>
            
            {/* Page indicators */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePageChange(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center border transition-all cursor-pointer select-none ${
                    currentPage === idx
                      ? 'bg-indigo-900 text-white border-indigo-900 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* List of 5 Questions for the Active Page */}
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
            {getPageQuestions().map((q, localIdx) => {
              const globalIdx = currentPage * QUESTIONS_PER_PAGE + localIdx;
              const currentAnswer = answers[q.id] || '';
              const isSkipped = currentAnswer === '__SKIPPED__';
              const isSelected = !!currentAnswer && !isSkipped;

              return (
                <div
                  key={q.id}
                  id={`grammar-q-${q.id}`}
                  className={`p-5 rounded-2xl border transition-all relative ${
                    isSkipped
                      ? 'border-amber-300 bg-amber-50/10'
                      : isSelected
                      ? 'bg-indigo-50/15 border-indigo-200'
                      : 'bg-slate-50/25 border-slate-150'
                  } ${q.id === currentQuestionId ? 'ring-2 ring-indigo-900/60' : ''}`}
                  onClick={() => setCurrentQuestionId(q.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-xs font-black font-mono text-indigo-900 bg-indigo-100/70 px-2 py-0.5 rounded-md mt-0.5 shrink-0">
                        Q{(globalIdx + 1).toString().padStart(2, '0')}
                      </span>
                      <h4 className="text-sm md:text-base font-bold text-slate-800 leading-snug">
                        {q.text}
                      </h4>
                    </div>

                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                  </div>

                  {/* Input Renderers */}
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
                  ) : q.type === 'mcq' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                      {q.options?.map((option, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx); // A, B, C, D
                        const isOptionSelected = currentAnswer === letter;

                        return (
                          <button
                            key={oIdx}
                            id={`option-${q.id}-${letter}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnswerChange(q.id, letter);
                              setCurrentQuestionId(q.id);
                            }}
                            className={`text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-2.5 text-xs font-medium ${
                              isOptionSelected
                                ? 'bg-indigo-900 border-indigo-900 text-white font-semibold'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              isOptionSelected ? 'bg-white text-indigo-900 border-white' : 'border-slate-300 text-slate-400 bg-slate-50'
                            }`}>
                              {letter}
                            </div>
                            <span className="leading-tight">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pt-1 max-w-sm" onClick={(e) => e.stopPropagation()}>
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                        Nhập câu trả lời (Viết đáp án trực tiếp):
                      </label>
                      <input
                        id={`input-blank-${q.id}`}
                        type="text"
                        placeholder="Nhập đáp án..."
                        value={currentAnswer}
                        onChange={(e) => onAnswerChange(q.id, e.target.value)}
                        onFocus={() => setCurrentQuestionId(q.id)}
                        className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-indigo-900 focus:outline-none bg-white transition-colors text-xs font-bold text-slate-800 shadow-sm"
                      />
                    </div>
                  )}

                  {/* Skip control and Note footer inside the question box */}
                  <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-dashed border-slate-200 text-[11px] text-slate-400">
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

          {/* Pagination Footer controls */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-extrabold transition-colors select-none cursor-pointer flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" /> Trang trước
            </button>

            <span className="text-xs text-slate-500 font-bold">
              Trang {currentPage + 1} / {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-850 text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-extrabold transition-colors select-none cursor-pointer flex items-center gap-1.5"
            >
              Trang sau <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Right Side Info Box */}
        <div className="lg:col-span-4 bg-indigo-950 text-white rounded-2xl p-5 shadow-md border border-indigo-900 space-y-4">
          <h3 className="font-bold flex items-center gap-1.5 text-xs uppercase tracking-wider border-b border-indigo-900 pb-2.5 text-indigo-200">
            <HelpCircle className="w-4 h-4" /> Hướng dẫn làm bài
          </h3>
          <ul className="text-xs space-y-3 leading-relaxed text-indigo-100/95 list-disc list-inside font-medium">
            <li>
              Các câu hỏi được nhóm <strong className="text-white">5 câu chung một lượt hiển thị</strong> trên màn hình để bạn dễ bao quát và so sánh.
            </li>
            <li>
              Bạn có thể dễ dàng dùng nút <strong className="text-white">Trang trước</strong> và <strong className="text-white">Trang sau</strong> để quay trở lại sửa đổi câu trả lời bất cứ lúc nào.
            </li>
            <li>
              Để di chuyển nhanh đến một câu hỏi bất kỳ, hãy nhấp chuột vào số câu hỏi tương ứng trong bảng <strong className="text-white">Question Navigator</strong> ở bên phải.
            </li>
          </ul>
        </div>

      </div>

    </div>
  );
}

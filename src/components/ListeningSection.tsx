import React, { useRef, useState, useEffect } from 'react';
import { Play, Volume2, Headphones, AlertTriangle, HelpCircle } from 'lucide-react';
import { LISTENING_PART_1, LISTENING_PART_2 } from '../questions';

interface ListeningSectionProps {
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  onSkipQuestion: (questionId: string) => void;
  currentQuestionId: string;
  setCurrentQuestionId: (id: string) => void;
  questionsPart1?: any[];
  questionsPart2?: any[];
  audio1Url?: string;
  audio2Url?: string;
}

export default function ListeningSection({
  answers,
  onAnswerChange,
  onSkipQuestion,
  currentQuestionId,
  setCurrentQuestionId,
  questionsPart1 = LISTENING_PART_1,
  questionsPart2 = LISTENING_PART_2,
  audio1Url = 'https://storage.m3cdn.xyz/audio/1782652891560-hotel.mp3',
  audio2Url = 'https://storage.m3cdn.xyz/audio/1782652932822-rental.mp3'
}: ListeningSectionProps) {
  const getProxiedUrl = (url?: string) => {
    if (!url || url.trim() === '') return undefined;
    return url;
  };

  const renderInlineBlank = (qId: string, itemNum: number, displayNum: string) => {
    const currentVal = answers[qId] || '';
    const isSkipped = currentVal === '__SKIPPED__';
    const isActive = currentQuestionId === qId;
    
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          setCurrentQuestionId(qId);
        }}
        className={`inline-flex flex-col relative transition-all align-middle mx-1.5 p-1 rounded-lg border leading-normal ${
          isSkipped 
            ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm'
            : isActive
            ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20'
            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className="flex items-center gap-1.5 px-1">
          {/* Number badge matching image and preserving index */}
          <span className="text-[10px] font-black font-mono text-indigo-900 shrink-0 select-none bg-indigo-100/70 px-1 py-0.5 rounded leading-none">
            ({displayNum})
          </span>
          
          {isSkipped ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 leading-none">
              <span>Đã bỏ qua</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAnswerChange(qId, '');
                }}
                className="text-[10px] text-indigo-900 hover:text-indigo-700 underline font-black uppercase cursor-pointer px-1 py-0.5"
              >
                Làm lại
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-1 leading-none">
              <input
                type="text"
                id={`input-blank-${qId}`}
                placeholder="..........."
                value={currentVal}
                onChange={(e) => {
                  onAnswerChange(qId, e.target.value);
                }}
                className="border-b border-dashed border-slate-400 focus:border-indigo-600 focus:bg-white outline-none px-1 font-bold text-indigo-950 w-24 text-xs bg-transparent py-0 transition-all text-center leading-none"
              />
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSkipQuestion(qId);
                  onAnswerChange(qId, '__SKIPPED__');
                }}
                className="text-[9px] text-slate-400 hover:text-amber-700 hover:bg-amber-50 px-1 py-0.5 rounded transition-all font-bold cursor-pointer uppercase leading-none border border-slate-200"
                title="Bỏ qua câu này"
              >
                Bỏ qua
              </button>
            </span>
          )}
        </span>
        <span className="text-[8px] text-slate-400 leading-none px-1 mt-0.5 select-none font-medium text-center">
          Bỏ qua nếu không làm được
        </span>
      </span>
    );
  };

  const [audio1State, setAudio1State] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [audio2State, setAudio2State] = useState<'idle' | 'playing' | 'ended'>('idle');

  const [audio1Progress, setAudio1Progress] = useState(0);
  const [audio2Progress, setAudio2Progress] = useState(0);

  const audio1Ref = useRef<HTMLAudioElement | null>(null);
  const audio2Ref = useRef<HTMLAudioElement | null>(null);

  // Initialize audio state from localStorage and respect "never play again" rule
  useEffect(() => {
    const isL1Played = localStorage.getItem('audio_l1_played') === 'true';
    const isL2Played = localStorage.getItem('audio_l2_played') === 'true';
    
    if (isL1Played) {
      setAudio1State('ended');
    } else {
      const savedAudio1 = localStorage.getItem('audio_l1_state');
      if (savedAudio1 === 'ended') setAudio1State('ended');
    }

    if (isL2Played) {
      setAudio2State('ended');
    } else {
      const savedAudio2 = localStorage.getItem('audio_l2_state');
      if (savedAudio2 === 'ended') setAudio2State('ended');
    }
  }, []);

  // Scroll to targeted question when active question changes in Navigator
  useEffect(() => {
    if (currentQuestionId) {
      const targetElement = document.getElementById(`listening-q-${currentQuestionId}`);
      if (targetElement) {
        const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
        targetElement.scrollIntoView({ behavior: isMobile ? 'auto' : 'smooth', block: 'center' });
        // Add temporary highlight effect
        targetElement.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
        const timer = setTimeout(() => {
          targetElement.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentQuestionId]);

  const handlePlayAudio1 = () => {
    if (audio1State !== 'idle') return;
    
    // Lock immediately to prevent re-triggering ever again
    localStorage.setItem('audio_l1_played', 'true');
    setAudio1State('playing');

    if (audio1Ref.current) {
      audio1Ref.current.play().catch((err) => {
        console.error('Audio 1 playback failed:', err);
      });
    }
  };

  const handlePlayAudio2 = () => {
    if (audio2State !== 'idle') return;
    
    // Lock immediately to prevent re-triggering ever again
    localStorage.setItem('audio_l2_played', 'true');
    setAudio2State('playing');

    if (audio2Ref.current) {
      audio2Ref.current.play().catch((err) => {
        console.error('Audio 2 playback failed:', err);
      });
    }
  };

  const handleAudio1TimeUpdate = () => {
    if (audio1Ref.current) {
      const prog = (audio1Ref.current.currentTime / audio1Ref.current.duration) * 100;
      setAudio1Progress(prog || 0);
    }
  };

  const handleAudio1Ended = () => {
    setAudio1State('ended');
    localStorage.setItem('audio_l1_state', 'ended');
    localStorage.setItem('audio_l1_played', 'true');
  };

  const handleAudio2TimeUpdate = () => {
    if (audio2Ref.current) {
      const prog = (audio2Ref.current.currentTime / audio2Ref.current.duration) * 100;
      setAudio2Progress(prog || 0);
    }
  };

  const handleAudio2Ended = () => {
    setAudio2State('ended');
    localStorage.setItem('audio_l2_state', 'ended');
    localStorage.setItem('audio_l2_played', 'true');
  };

  return (
    <div id="listening-section-wrapper" className="space-y-6">
      
      {/* Strict Warning Alert banner */}
      <div className="bg-red-55 text-red-900 border-l-4 border-red-600 p-4 rounded-r-xl flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <p className="text-red-950 text-xs font-semibold leading-relaxed">
          <strong className="uppercase">CHÚ Ý QUAN TRỌNG:</strong> Thí sinh <strong className="underline">CHỈ ĐƯỢC NGHE 1 LẦN DUY NHẤT</strong>. Khi đã nhấn Play hoặc audio đã bắt đầu chạy, bạn sẽ không thể tua lại, không thể Pause và không thể nghe lại dù có reload hay đăng nhập lại. Vui lòng kiểm tra kỹ thiết bị âm thanh trước khi nhấn phát.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Audio Controls + All Questions displayed in place */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* ================= BÀI 1 SECTION ================= */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-indigo-900" />
                <h3 className="text-base font-black text-slate-800 uppercase">Bài 1: Lisa Checking into a Hotel (Câu 1 - 7)</h3>
              </div>
              <span className="text-xs font-mono bg-indigo-50 text-indigo-900 px-2.5 py-1 rounded-md font-bold">
                Trắc nghiệm MCQ
              </span>
            </div>

            {/* Audio 1 Control Panel */}
            <div className="p-5 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/65 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">Audio Clip 01</h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-none mt-1">Audio can only be played ONCE. Please listen carefully.</p>
                  </div>
                </div>

                <audio
                  ref={audio1Ref}
                  src={getProxiedUrl(audio1Url)}
                  onTimeUpdate={handleAudio1TimeUpdate}
                  onEnded={handleAudio1Ended}
                  preload="auto"
                  referrerPolicy="no-referrer"
                  controlsList="nodownload"
                />

                <button
                  id="play-audio1-btn"
                  onClick={handlePlayAudio1}
                  disabled={audio1State !== 'idle'}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer select-none transition-all sm:w-auto w-full justify-center ${
                    audio1State === 'idle'
                      ? 'bg-indigo-900 hover:bg-indigo-850 text-white'
                      : audio1State === 'playing'
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  {audio1State === 'idle' && <><Play className="w-3.5 h-3.5 fill-current" /> PLAY AUDIO 1</>}
                  {audio1State === 'playing' && <><Volume2 className="w-3.5 h-3.5 animate-bounce" /> LISTENING...</>}
                  {audio1State === 'ended' && <>AUDIO PLAYED (BLOCKED)</>}
                </button>
              </div>

              {/* Progress bar */}
              {audio1State === 'playing' && (
                <div className="mt-3 w-full bg-slate-200/85 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-900 h-1.5 transition-all duration-300" style={{ width: `${audio1Progress}%` }} />
                </div>
              )}
            </div>

            {/* Questions list for Part 1 */}
            <div className="space-y-6 pt-2">
              <p className="text-sm font-semibold text-slate-700 leading-relaxed italic">
                Listen to a woman checking into a hotel, and for questions 1 to 7, choose the correct answer (A, B, or C).
              </p>

              <div className="space-y-6">
                {questionsPart1.map((q, idx) => {
                  const currentAnswer = answers[q.id] || '';
                  const isSkipped = currentAnswer === '__SKIPPED__';
                  return (
                    <div
                      key={q.id}
                      id={`listening-q-${q.id}`}
                      className={`p-5 rounded-xl border transition-all ${
                        isSkipped 
                          ? 'border-amber-300 bg-amber-50/10' 
                          : currentAnswer 
                          ? 'border-indigo-100 bg-indigo-50/15' 
                          : 'border-slate-150 bg-slate-50/20'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-3">
                        <span className="text-xs font-bold font-mono text-indigo-900 bg-indigo-100/70 px-2 py-0.5 rounded-md mt-0.5 shrink-0">
                          Q{(idx + 1).toString().padStart(2, '0')}
                        </span>
                        <h4 className="text-sm md:text-base font-bold text-slate-800 leading-snug">
                          {q.text}
                        </h4>
                      </div>

                      {/* Optional Question Image */}
                      {q.imageUrl && q.imageUrl.trim() !== '' && (
                        <div className="mb-4 max-w-full md:max-w-md overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white p-1">
                          <img
                            src={q.imageUrl}
                            alt={`Question ${idx + 1}`}
                            className="w-full h-auto object-cover rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {isSkipped ? (
                        <div className="bg-amber-100/40 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex items-center justify-between text-xs font-semibold">
                          <span className="flex items-center gap-1.5 text-slate-700">
                            ⚠️ Bạn đã bỏ qua câu hỏi này.
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onAnswerChange(q.id, '');
                            }}
                            className="bg-white border border-amber-300 text-indigo-900 hover:bg-indigo-50 px-3 py-1 rounded-lg font-bold shadow-sm transition-colors cursor-pointer text-[11px]"
                          >
                            LÀM LẠI CÂU NÀY
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {q.options.map((option, oIdx) => {
                            const optionLetter = String.fromCharCode(65 + oIdx); // A, B, C
                            const isSelected = currentAnswer === optionLetter;

                            return (
                              <button
                                key={oIdx}
                                id={`option-${q.id}-${optionLetter}`}
                                onClick={() => {
                                  onAnswerChange(q.id, optionLetter);
                                  setCurrentQuestionId(q.id);
                                }}
                                className={`text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-2.5 text-xs font-medium ${
                                  isSelected
                                    ? 'bg-indigo-900 border-indigo-900 text-white font-semibold'
                                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  isSelected ? 'bg-white text-indigo-900 border-white' : 'border-slate-300 text-slate-400 bg-slate-50'
                                }`}>
                                  {optionLetter}
                                </div>
                                <span className="leading-tight">{option}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Skip button and Note */}
                      <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-dashed border-slate-200 text-[11px] text-slate-400">
                        <span className="font-medium italic">*(Bỏ qua nếu bạn không làm được)*</span>
                        {!isSkipped && (
                          <button
                            type="button"
                            onClick={() => {
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
            </div>
          </div>

          {/* ================= BÀI 2 SECTION ================= */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-indigo-900" />
                <h3 className="text-base font-black text-slate-800 uppercase">Bài 2: Rented Properties (Câu 8 - 17)</h3>
              </div>
              <span className="text-xs font-mono bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md font-bold">
                Điền Từ Vào Chỗ Trống
              </span>
            </div>

            {/* Audio 2 Control Panel */}
            <div className="p-5 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/65 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">Audio Clip 02</h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-none mt-1">Audio can only be played ONCE. Please listen carefully.</p>
                  </div>
                </div>

                <audio
                  ref={audio2Ref}
                  src={getProxiedUrl(audio2Url)}
                  onTimeUpdate={handleAudio2TimeUpdate}
                  onEnded={handleAudio2Ended}
                  preload="auto"
                  referrerPolicy="no-referrer"
                  controlsList="nodownload"
                />

                <button
                  id="play-audio2-btn"
                  onClick={handlePlayAudio2}
                  disabled={audio2State !== 'idle'}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer select-none transition-all sm:w-auto w-full justify-center ${
                    audio2State === 'idle'
                      ? 'bg-indigo-900 hover:bg-indigo-850 text-white'
                      : audio2State === 'playing'
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  {audio2State === 'idle' && <><Play className="w-3.5 h-3.5 fill-current" /> PLAY AUDIO 2</>}
                  {audio2State === 'playing' && <><Volume2 className="w-3.5 h-3.5 animate-bounce" /> LISTENING...</>}
                  {audio2State === 'ended' && <>AUDIO PLAYED (BLOCKED)</>}
                </button>
              </div>

              {/* Progress bar */}
              {audio2State === 'playing' && (
                <div className="mt-3 w-full bg-slate-200/85 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-900 h-1.5 transition-all duration-300" style={{ width: `${audio2Progress}%` }} />
                </div>
              )}
            </div>

            {/* Question as cohesive Renting Form / Text with inline inputs */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700 italic leading-relaxed">
                Listen to the recording and fill in the blanks. Type <strong className="text-indigo-900 font-black underline uppercase">ONLY ONE WORD OR A NUMBER</strong> for each answer.
              </p>

              {questionsPart2.length === 10 && questionsPart2[0]?.id === 'l2_1' ? (
                <div className="border border-slate-200 rounded-2xl p-6 md:p-8 bg-white shadow-sm space-y-6 font-serif text-slate-900 leading-relaxed text-sm">
                  {/* Outer Frame with elegant header */}
                  <div className="border-b-2 border-indigo-950 pb-3 mb-4 text-center">
                    <h4 className="text-base md:text-lg font-bold font-sans text-indigo-950 tracking-wider uppercase">
                      RENTED PROPERTIES: INFORMATION ABOUT A HOUSE
                    </h4>
                  </div>

                  <div className="space-y-6">
                    {/* Availability & Pricing Group */}
                    <div className="space-y-3">
                      <h5 className="font-sans font-bold text-[#1e3a8a] border-b border-dashed border-slate-200 pb-1 text-xs uppercase tracking-wide">
                        Availability & Pricing
                      </h5>
                      <ul className="list-disc pl-5 space-y-2">
                        <li id="listening-q-l2_1" className="transition-all hover:bg-slate-50 p-1 rounded">
                          Available date: {renderInlineBlank('l2_1', 8, '8')}
                        </li>
                        <li id="listening-q-l2_2" className="transition-all hover:bg-slate-50 p-1 rounded">
                          Prices Rent: $ {renderInlineBlank('l2_2', 9, '9')} per month
                        </li>
                        <li className="text-slate-500 p-1">
                          Deposit: $1,500
                        </li>
                        <li id="listening-q-l2_3" className="transition-all hover:bg-slate-50 p-1 rounded">
                          Credit check: {renderInlineBlank('l2_3', 10, '10')}
                        </li>
                      </ul>
                    </div>

                    {/* Facilities Group */}
                    <div className="space-y-3">
                      <h5 className="font-sans font-bold text-[#1e3a8a] border-b border-dashed border-slate-200 pb-1 text-xs uppercase tracking-wide">
                        Facilities
                      </h5>
                      <ul className="list-disc pl-5 space-y-2">
                        <li className="text-slate-500 p-1">
                          Bedrooms and bathrooms: 3 bedrooms and 2 bathrooms
                        </li>
                        <li id="listening-q-l2_4" className="transition-all hover:bg-slate-50 p-1 rounded">
                          A remodelled: {renderInlineBlank('l2_4', 11, '11')}
                        </li>
                        <li id="listening-q-l2_5" className="transition-all hover:bg-slate-50 p-1 rounded">
                          No: {renderInlineBlank('l2_5', 12, '12')}
                        </li>
                        <li id="listening-q-l2_6" className="transition-all hover:bg-slate-50 p-1 rounded">
                          Parking: A {renderInlineBlank('l2_6', 13, '13')} with a work area
                        </li>
                      </ul>
                    </div>

                    {/* Utilities Group */}
                    <div className="space-y-3">
                      <h5 className="font-sans font-bold text-[#1e3a8a] border-b border-dashed border-slate-200 pb-1 text-xs uppercase tracking-wide">
                        Utilities
                      </h5>
                      <ul className="list-disc pl-5 space-y-2">
                        <li id="listening-q-l2_7" className="transition-all hover:bg-slate-50 p-1 rounded">
                          Garden care: The landlord will provide landscaping service, but the tenants must {renderInlineBlank('l2_7', 14, '14')} the grass.
                        </li>
                        <li id="listening-q-l2_8" className="transition-all hover:bg-slate-50 p-1 rounded">
                          The tenants should pay $15 for trashing and {renderInlineBlank('l2_8', 15, '15')} service.
                        </li>
                        <li className="text-slate-500 p-1">
                          Other bills: The tenants should pay for electricity, water and gas bills.
                        </li>
                      </ul>
                    </div>

                    {/* Other Information Group */}
                    <div className="space-y-3">
                      <h5 className="font-sans font-bold text-[#1e3a8a] border-b border-dashed border-slate-200 pb-1 text-xs uppercase tracking-wide">
                        Other Information
                      </h5>
                      <ul className="list-disc pl-5 space-y-2">
                        <li id="listening-q-l2_9" className="transition-all hover:bg-slate-50 p-1 rounded">
                          Air conditioning: There is no central air conditioning, but there is a {renderInlineBlank('l2_9', 16, '16')} conditioning unit.
                        </li>
                        <li id="listening-q-l2_10" className="transition-all hover:bg-slate-50 p-1 rounded">
                          Student's name: Sam {renderInlineBlank('l2_10', 17, '17')}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-150 rounded-2xl p-6 md:p-8 bg-slate-50/30 shadow-sm space-y-4">
                  {questionsPart2.map((q, idx) => {
                    const currentAnswer = answers[q.id] || '';
                    return (
                      <div
                        key={q.id}
                        id={`listening-q-${q.id}`}
                        className={`p-4 rounded-xl border transition-all ${
                          currentAnswer ? 'border-indigo-100 bg-indigo-50/15' : 'border-slate-150 bg-slate-50/20'
                        }`}
                      >
                        <div className="flex flex-col gap-3 text-slate-700 text-xs md:text-sm">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-bold font-mono text-indigo-900 bg-indigo-100/70 px-2 py-0.5 rounded-md shrink-0">
                              Q{(idx + 1 + questionsPart1.length).toString().padStart(2, '0')}
                            </span>
                            <span className="font-bold text-slate-800 leading-snug grow">{q.text}</span>
                          </div>

                          {/* Optional Question Image */}
                          {q.imageUrl && q.imageUrl.trim() !== '' && (
                            <div className="max-w-full md:max-w-md overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white p-1">
                              <img
                                src={q.imageUrl}
                                alt={`Question ${idx + 1 + questionsPart1.length}`}
                                className="w-full h-auto object-cover rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs font-semibold text-slate-500">Đáp án:</span>
                            <input
                              type="text"
                              id={`input-blank-${q.id}`}
                              placeholder="Nhập câu trả lời..."
                              value={currentAnswer}
                              onChange={(e) => {
                                onAnswerChange(q.id, e.target.value);
                                setCurrentQuestionId(q.id);
                              }}
                              className="border-b-2 border-indigo-300 focus:border-indigo-600 focus:bg-indigo-50/30 outline-none px-2 font-bold text-indigo-950 min-w-[200px] bg-transparent py-0.5 transition-all text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom quote banner */}
          <div className="text-center bg-slate-100/60 py-3.5 rounded-2xl border border-slate-150 select-none">
            <p className="text-slate-500 text-xs italic font-sans font-medium">
              "Không sao nếu bạn chưa biết đáp án. Mỗi câu hỏi đều là một cơ hội để học hỏi."
            </p>
          </div>

        </div>

        {/* Right Side Info Box */}
        <div className="lg:col-span-4 bg-indigo-950 text-white rounded-2xl p-5 shadow-md border border-indigo-900 space-y-4">
          <h3 className="font-bold flex items-center gap-1.5 text-xs uppercase tracking-wider border-b border-indigo-900 pb-2.5 text-indigo-200">
            <HelpCircle className="w-4 h-4" /> Hướng dẫn làm bài nghe
          </h3>
          <ul className="text-xs space-y-3.5 leading-relaxed text-indigo-100/90 list-disc list-inside font-medium">
            <li>
              <strong className="text-white text-[13px] block mb-1">Bài 1 (MCQ 1-7):</strong>
              Nghe cuộc hội thoại đăng ký khách sạn của cô Lisa. Chọn đáp án chính xác bằng cách nhấp chọn trực tiếp.
            </li>
            <li>
              <strong className="text-white text-[13px] block mb-1">Bài 2 (Điền Từ 8-17):</strong>
              Nghe thông tin thuê nhà của Sam Dressler. Điền đúng đáp án bằng cách nhấp và nhập trực tiếp vào phiếu đăng ký bên trái.
            </li>
            <li>
              <span className="text-amber-300 font-bold">Lưu ý:</span> Cả hai bài thi nghe đã được hiển thị đầy đủ trên màn hình này giúp bạn không tốn thời gian chuyển trang, bắt kịp nhịp độ phát của audio một cách tốt nhất.
            </li>
          </ul>
        </div>

      </div>

    </div>
  );
}

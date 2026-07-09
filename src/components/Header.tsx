import React from 'react';
import { Clock, ShieldCheck, User2, Award } from 'lucide-react';
import LanguageToggle from './LanguageToggle';

interface HeaderProps {
  fullName: string;
  phone: string;
  timeLeftSeconds: number;
  currentSection: string;
  onSectionSelect: (sectionName: string) => void;
  sectionsList: { id: string; label: string }[];
  examTitle?: string;
}

export default function Header({
  fullName,
  phone,
  timeLeftSeconds,
  currentSection,
  onSectionSelect,
  sectionsList,
  examTitle
}: HeaderProps) {
  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '00:00';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Timer Color & Indicator logic
  const getTimerStyles = () => {
    const minutesLeft = timeLeftSeconds / 60;
    if (minutesLeft <= 5) {
      return {
        bgClass: 'bg-red-600 border-red-700 text-white font-extrabold animate-pulse shadow-lg shadow-red-900/45 scale-105',
        indicatorClass: 'bg-white animate-ping'
      };
    }
    if (minutesLeft <= 10) {
      return {
        bgClass: 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold',
        indicatorClass: 'bg-amber-400 animate-pulse'
      };
    }
    return {
      bgClass: 'bg-white/10 border-white/20 text-white',
      indicatorClass: 'bg-green-400'
    };
  };

  const timerStyle = getTimerStyles();

  return (
    <header id="exam-header" className="bg-indigo-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto">
        {/* Main Header Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between px-6 py-4 border-b border-indigo-850 gap-4">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 border border-white/20 text-white rounded-xl flex items-center justify-center shrink-0 shadow-inner">
              <Award className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
                ENGLISH PLACEMENT TEST
              </h1>
              <p className="text-[10px] md:text-xs text-indigo-200 font-bold uppercase tracking-widest leading-none mt-0.5">
                Kỳ thi: {examTitle || 'Đang tải...'}
              </p>
            </div>
          </div>

          {/* Right Side: Candidate Card & Timer */}
          <div className="flex flex-wrap items-center gap-4 justify-between md:justify-end">
            
            {/* Candidate Box */}
            <div className="px-4 py-1.5 rounded-xl border border-indigo-700 bg-indigo-950/40 text-left shrink-0">
              <div className="text-[9px] uppercase tracking-wider text-indigo-300 font-semibold opacity-80 leading-none">Candidate</div>
              <div className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
                <span>{fullName}</span>
                <span className="text-indigo-400">•</span>
                <span className="font-mono text-[11px] text-indigo-100">{phone}</span>
              </div>
            </div>

            {/* High-Contrast Countdown Timer */}
            <div
              id="countdown-timer"
              className={`px-4 py-1.5 rounded-xl border flex items-center gap-3 text-sm select-none shadow-sm transition-all duration-300 ${timerStyle.bgClass}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${timerStyle.indicatorClass}`} />
                <span className="text-[10px] font-sans uppercase font-bold tracking-wider leading-none opacity-80">Remaining</span>
              </div>
              <div className="font-mono text-2xl font-black tracking-tighter leading-none">
                {formatTime(timeLeftSeconds)}
              </div>
            </div>

            {/* Language Selection Toggle */}
            <LanguageToggle />

          </div>
        </div>

        {/* Section Selection Bar (Secondary Row) */}
        <div className="bg-indigo-950/45 px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-b border-indigo-850">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>CHUYỂN PHẦN THI (SECTIONS):</span>
          </div>

          <div className="w-full sm:w-auto overflow-x-auto flex items-center select-none scrollbar-none">
            <div className="flex bg-indigo-950/80 p-1 rounded-xl shrink-0 border border-indigo-850 gap-1">
              {sectionsList.map((sec) => (
                <button
                  key={sec.id}
                  id={`tab-sec-${sec.id}`}
                  onClick={() => onSectionSelect(sec.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                    currentSection === sec.id
                      ? 'bg-white text-indigo-900 shadow-md font-extrabold scale-[1.02]'
                      : 'text-indigo-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {sec.label.split('. ')[1] || sec.label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Clock,
  AlertOctagon,
  LogOut,
  Send,
  HelpCircle,
  Eye,
  CheckCircle2,
  Phone,
  Sun,
  Moon,
  BookOpen,
  FileText,
  Video,
  ExternalLink
} from 'lucide-react';

// Components
import StartScreen from './components/StartScreen';
import Header from './components/Header';
import QuestionNav from './components/QuestionNav';
import ListeningSection from './components/ListeningSection';
import SpeakingSection from './components/SpeakingSection';
import GrammarSection from './components/GrammarSection';
import VocabularySection from './components/VocabularySection';
import ReadingSection from './components/ReadingSection';
import WritingSection from './components/WritingSection';
import AdminPanel from './components/AdminPanel';

// Firebase Services
import { candidateService } from './services/candidateService';
import { settingsService } from './services/settingsService';
import { examService } from './services/examService';
import { materialService } from './services/materialService';

// Data questions
import {
  LISTENING_PART_1,
  LISTENING_PART_2,
  SPEAKING_QUESTIONS,
  SPEAKING_READ_ALOUD,
  GRAMMAR_QUESTIONS,
  VOCABULARY_QUESTIONS,
  READING_PASSAGE,
  WRITING_QUESTIONS
} from './questions';

const THEMES: Record<string, Record<string, string>> = {
  indigo: {
    '--theme-50': '#eff6ff',
    '--theme-100': '#dbeafe',
    '--theme-200': '#bfdbfe',
    '--theme-300': '#93c5fd',
    '--theme-400': '#60a5fa',
    '--theme-500': '#3b82f6',
    '--theme-600': '#2563eb',
    '--theme-700': '#1d4ed8',
    '--theme-800': '#1e40af',
    '--theme-900': '#1e3a8a',
    '--theme-950': '#0f172a',
  },
  emerald: {
    '--theme-50': '#ecfdf5',
    '--theme-100': '#d1fae5',
    '--theme-200': '#a7f3d0',
    '--theme-300': '#6ee7b7',
    '--theme-400': '#34d399',
    '--theme-500': '#10b981',
    '--theme-600': '#059669',
    '--theme-700': '#047857',
    '--theme-800': '#065f46',
    '--theme-900': '#064e3b',
    '--theme-950': '#022c22',
  },
  blue: {
    '--theme-50': '#f0f9ff',
    '--theme-100': '#e0f2fe',
    '--theme-200': '#bae6fd',
    '--theme-300': '#7dd3fc',
    '--theme-400': '#38bdf8',
    '--theme-500': '#0ea5e9',
    '--theme-600': '#0284c7',
    '--theme-700': '#0369a1',
    '--theme-800': '#075985',
    '--theme-900': '#0c4a6e',
    '--theme-950': '#082f49',
  },
  violet: {
    '--theme-50': '#f5f3ff',
    '--theme-100': '#ede9fe',
    '--theme-200': '#ddd6fe',
    '--theme-300': '#c4b5fd',
    '--theme-400': '#a78bfa',
    '--theme-500': '#8b5cf6',
    '--theme-600': '#7c3aed',
    '--theme-700': '#6d28d9',
    '--theme-800': '#5b21b6',
    '--theme-900': '#4c1d95',
    '--theme-950': '#2e1065',
  },
  rose: {
    '--theme-50': '#fff1f2',
    '--theme-100': '#ffe4e6',
    '--theme-200': '#fecdd3',
    '--theme-300': '#fda4af',
    '--theme-400': '#fb7185',
    '--theme-500': '#f43f5e',
    '--theme-600': '#e11d48',
    '--theme-700': '#be123c',
    '--theme-800': '#9f1239',
    '--theme-900': '#881337',
    '--theme-950': '#4c0519',
  },
  slate: {
    '--theme-50': '#f8fafc',
    '--theme-100': '#f1f5f9',
    '--theme-200': '#e2e8f0',
    '--theme-300': '#cbd5e1',
    '--theme-400': '#94a3b8',
    '--theme-500': '#64748b',
    '--theme-600': '#475569',
    '--theme-700': '#334155',
    '--theme-800': '#1e293b',
    '--theme-900': '#0f172a',
    '--theme-950': '#020617',
  }
};

export function applyTheme(colorName: string) {
  const selectedTheme = THEMES[colorName] || THEMES.indigo;
  Object.entries(selectedTheme).forEach(([prop, val]) => {
    document.documentElement.style.setProperty(prop, val);
  });
}

export default function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidate, setCandidate] = useState<any | null>(null);
  const [settings, setSettings] = useState<any>({
    logoUrl: '',
    themeColor: 'indigo',
    slogan: 'Your English Journey Starts Here.',
    teacherPhone: '0987.654.321',
    teacherEmail: 'teacher@english.edu.vn',
  });
  
  // Theme Dark/Light Mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme_mode') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme_mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme_mode', 'light');
    }
  }, [darkMode]);

  // Test State
  const [currentSection, setCurrentSection] = useState('listening');
  const [currentQuestionId, setCurrentQuestionId] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<Record<string, boolean>>({});
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(2700); // Dynamic timer, starts at default
  const [tabSwitches, setTabSwitches] = useState(0);
  const [testCompleted, setTestCompleted] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [showPhoneOptions, setShowPhoneOptions] = useState(false);

  // Scroll to top when section changes (essential for mobile view UX to prevent missing questions)
  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
    window.scrollTo({ top: 0, behavior: isMobile ? 'auto' : 'smooth' });
  }, [currentSection]);

  // Skipping question states
  const [skippingQuestionId, setSkippingQuestionId] = useState<string | null>(null);
  const [skipNoteText, setSkipNoteText] = useState('');

  // Modals / Overlays
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen to admin path toggle (can also click in footer)
  useEffect(() => {
    if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
      setIsAdminMode(true);
    }
  }, []);

  // Fetch Public settings on mount
  useEffect(() => {
    settingsService.getSettings()
      .then((data) => {
        if (data) {
          setSettings(data);
          applyTheme(data.themeColor || 'indigo');
        }
      })
      .catch((err) => console.error('Error loading settings:', err));

    materialService.getMaterials()
      .then((mList) => {
        setMaterials(mList || []);
      })
      .catch((err) => console.error('Error loading materials:', err));
  }, []);

  // Restore session from localStorage if candidate info is already present
  useEffect(() => {
    const savedCandidate = localStorage.getItem('candidate_session');
    if (savedCandidate) {
      const parsed = JSON.parse(savedCandidate);
      setCandidate(parsed);
      resumeSession(parsed.id);
    }
  }, []);

  // Sync Timer Countdown
  useEffect(() => {
    if (!candidate || testCompleted || isAdminMode || !activeExam) return;

    const totalSecs = (activeExam.durationMinutes || 45) * 60;

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        
        // Periodically save duration seconds to server in background (every 10 seconds)
        const currentElapsed = totalSecs - (prev - 1);
        if (currentElapsed % 10 === 0) {
          saveProgressToServer(currentElapsed);
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [candidate, testCompleted, isAdminMode, activeExam, answers]);

  // Tab Switch / Visibility Change Monitoring
  useEffect(() => {
    if (!candidate || testCompleted || isAdminMode) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTabSwitchDetected();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [candidate, testCompleted, isAdminMode, tabSwitches]);

  const handleTabSwitchDetected = async () => {
    if (!candidate) return;

    const newCount = tabSwitches + 1;
    setTabSwitches(newCount);
    setShowCheatWarning(true);

    try {
      // Log cheating event to backend database
      await candidateService.addLog(candidate.id, `Tab Switched (Lần ${newCount})`);
    } catch (e) {
      console.error('Error logging tab switch:', e);
    }
  };

  // 1. Candidate Registration
  const handleRegister = async (fullName: string, phone: string, examId: string) => {
    setLoading(true);
    try {
      const data = await candidateService.registerCandidate(fullName, phone, examId);

      setCandidate(data.candidate);
      setActiveExam(data.exam);
      localStorage.setItem('candidate_session', JSON.stringify(data.candidate));

      // Handle resuming incomplete test
      if (data.restoredAnswers) {
        setAnswers(data.restoredAnswers);
        // Restore skipped questions state
        const skips: Record<string, boolean> = {};
        Object.entries(data.restoredAnswers).forEach(([qId, val]) => {
          if (val === '__SKIPPED__') {
            skips[qId] = true;
          }
        });
        setSkippedQuestions(skips);
      }

      // Calculate elapsed time from candidate session
      const elapsed = data.candidate.durationSeconds || 0;
      if (elapsed === 0) {
        localStorage.removeItem('audio_l1_played');
        localStorage.removeItem('audio_l2_played');
      }
      const totalSecs = (data.exam?.durationMinutes || 45) * 60;
      const remaining = totalSecs - elapsed;
      setTimeLeftSeconds(remaining > 0 ? remaining : 0);
      setTabSwitches(data.candidate.tabSwitches || 0);

      if (data.candidate.submittedAt) {
        setTestCompleted(true);
      }

      setLoading(false);
      return { success: true };
    } catch (err) {
      setLoading(false);
      return { success: false, error: 'Đường truyền mạng gặp sự cố. Vui lòng thử lại.' };
    }
  };

  // Resume Session helper
  const resumeSession = async (id: string) => {
    try {
      const data = await candidateService.startSession(id);
      if (data) {
        setCandidate(data.candidate);
        setActiveExam(data.exam);
        const restoredAnswers = data.answers || {};
        setAnswers(restoredAnswers);
        
        // Restore skipped questions state
        const skips: Record<string, boolean> = {};
        Object.entries(restoredAnswers).forEach(([qId, val]) => {
          if (val === '__SKIPPED__') {
            skips[qId] = true;
          }
        });
        setSkippedQuestions(skips);
        
        const elapsed = data.candidate.durationSeconds || 0;
        if (elapsed === 0) {
          localStorage.removeItem('audio_l1_played');
          localStorage.removeItem('audio_l2_played');
        }
        const totalSecs = (data.exam?.durationMinutes || 45) * 60;
        const remaining = totalSecs - elapsed;
        setTimeLeftSeconds(remaining > 0 ? remaining : 0);
        setTabSwitches(data.candidate.tabSwitches || 0);

        if (data.candidate.submittedAt) {
          setTestCompleted(true);
        }
      }
    } catch (e) {
      console.error('Session resume failure:', e);
    }
  };

  // 2. Answer Change Handler
  const handleAnswerChange = (questionId: string, value: string) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);

    // If answer is set (and is not '__SKIPPED__'), remove from skipped map
    if (value.trim() !== '' && value !== '__SKIPPED__') {
      const skippedCopy = { ...skippedQuestions };
      delete skippedCopy[questionId];
      setSkippedQuestions(skippedCopy);
    } else if (value === '__SKIPPED__') {
      setSkippedQuestions((prev) => ({ ...prev, [questionId]: true }));
    }

    // Fire off async background save to server
    saveAnswersToServer(updated);
  };

  // Skip Question Handler
  const handleSkipQuestion = (questionId: string) => {
    setSkippingQuestionId(questionId);
    setSkipNoteText('');
  };

  // 3. Save progress to server
  const saveAnswersToServer = async (answersObj: Record<string, string>) => {
    if (!candidate || !activeExam) return;
    try {
      const totalSecs = (activeExam.durationMinutes || 45) * 60;
      const elapsed = totalSecs - timeLeftSeconds;
      await candidateService.updateAnswers(candidate.id, answersObj, elapsed);
    } catch (e) {
      console.error('Error saving answers in background:', e);
    }
  };

  const saveProgressToServer = async (elapsedSeconds: number) => {
    if (!candidate) return;
    try {
      await candidateService.updateAnswers(candidate.id, answers, elapsedSeconds);
    } catch (e) {
      console.error('Error saving duration in background:', e);
    }
  };

  // 4. Submit Handlers
  const handleConfirmSubmit = async () => {
    if (!candidate) return;
    setLoading(true);
    setShowConfirmSubmit(false);

    try {
      await candidateService.submitTest(candidate.id);
      setTestCompleted(true);
      localStorage.removeItem('candidate_session');
      localStorage.removeItem('audio_l1_state');
      localStorage.removeItem('audio_l2_state');
    } catch (err) {
      alert('Không thể kết nối đến máy chủ để nộp bài. Vui lòng kiểm tra mạng.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmit = async () => {
    if (!candidate) return;
    try {
      await candidateService.submitTest(candidate.id);
      setTestCompleted(true);
      localStorage.removeItem('candidate_session');
    } catch (e) {
      console.error('Auto submit error:', e);
      setTestCompleted(true);
    }
  };

  const handleManualExit = async () => {
    if (!candidate) return;
    if (confirm('BẠN CÓ CHẮC CHẮN MUỐN RỜI PHÒNG THI? Toàn bộ kết quả bài làm của bạn sẽ BỊ XOÁ SẠCH và bạn sẽ KHÔNG THỂ thi lại nếu không được giáo viên reset.')) {
      setLoading(true);
      try {
        await candidateService.leaveRoom(candidate.id);
        localStorage.removeItem('candidate_session');
        localStorage.removeItem('audio_l1_state');
        localStorage.removeItem('audio_l2_state');
        setCandidate(null);
        setAnswers({});
        setSkippedQuestions({});
        setTestCompleted(false);
        setCurrentSection('listening');
      } catch (err) {
        console.error('Error leaving room:', err);
        alert('Lỗi khi rời phòng thi. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSectionChange = (secId: string) => {
    setCurrentSection(secId);
    
    let firstQId = '';
    switch (secId) {
      case 'listening':
        if (listeningPart1.length > 0) firstQId = listeningPart1[0].id;
        else if (listeningPart2.length > 0) firstQId = listeningPart2[0].id;
        break;
      case 'speaking':
        firstQId = 'speaking_p1';
        break;
      case 'grammar':
        if (grammarQuestions.length > 0) firstQId = grammarQuestions[0].id;
        break;
      case 'vocabulary':
        if (vocabularyQuestions.length > 0) firstQId = vocabularyQuestions[0].id;
        break;
      case 'reading':
        if (readingPassage?.questionsPartA && readingPassage.questionsPartA.length > 0) {
          firstQId = readingPassage.questionsPartA[0].id;
        } else if (readingPassage?.questionsPartB && readingPassage.questionsPartB.length > 0) {
          firstQId = readingPassage.questionsPartB[0].id;
        }
        break;
      case 'writing':
        if (writingQuestions.length > 0) firstQId = writingQuestions[0].id;
        break;
    }
    
    setCurrentQuestionId(firstQId);
  };

  // Dynamic question resolving based on current activeExam with fallback to static constants
  const isCustomExam = activeExam && activeExam.id !== 'default-exam';

  const listeningPart1 = isCustomExam ? (activeExam?.questions?.listeningPart1 || []) : (activeExam?.questions?.listeningPart1 || LISTENING_PART_1);
  const listeningPart2 = isCustomExam ? (activeExam?.questions?.listeningPart2 || []) : (activeExam?.questions?.listeningPart2 || LISTENING_PART_2);
  const speakingQuestions = isCustomExam ? (activeExam?.questions?.speakingQuestions || []) : (activeExam?.questions?.speakingQuestions || SPEAKING_QUESTIONS);
  const speakingReadAloud = isCustomExam ? (activeExam?.questions?.speakingReadAloud || { text: "", wordCount: 0 }) : (activeExam?.questions?.speakingReadAloud || SPEAKING_READ_ALOUD);
  const grammarQuestions = isCustomExam ? (activeExam?.questions?.grammar || []) : (activeExam?.questions?.grammar || GRAMMAR_QUESTIONS);
  const vocabularyQuestions = isCustomExam ? (activeExam?.questions?.vocabulary || []) : (activeExam?.questions?.vocabulary || VOCABULARY_QUESTIONS);
  const readingPassage = isCustomExam ? (activeExam?.questions?.readingPassage || { title: "", text: "", questionsPartA: [], questionsPartB: [] }) : (activeExam?.questions?.readingPassage || READING_PASSAGE);
  const writingQuestions = isCustomExam ? (activeExam?.questions?.writingQuestions || []) : (activeExam?.questions?.writingQuestions || WRITING_QUESTIONS);

  // Define active question bank for the side navigator palette
  const getActiveSectionQuestions = () => {
    switch (currentSection) {
      case 'listening':
        return [
          ...listeningPart1.map((q: any, idx: number) => ({ id: q.id, label: `L${idx + 1}` })),
          ...listeningPart2.map((q: any, idx: number) => ({ id: q.id, label: `L${idx + 1 + listeningPart1.length}` }))
        ];
      case 'speaking':
        return [
          { id: 'speaking_p1', label: 'S1' },
          ...speakingQuestions.map((q: any, idx: number) => ({ id: `speaking_p2_q${idx + 1}`, label: `S2-Q${idx + 1}` }))
        ];
      case 'grammar':
        return grammarQuestions.map((q: any, idx: number) => ({ id: q.id, label: `G${idx + 1}` }));
      case 'vocabulary':
        return vocabularyQuestions.map((q: any, idx: number) => ({ id: q.id, label: `V${idx + 1}` }));
      case 'reading':
        return [
          ...(readingPassage?.questionsPartA || []).map((q: any, idx: number) => ({ id: q.id, label: `R${idx + 1}` })),
          ...(readingPassage?.questionsPartB || []).map((q: any, idx: number) => ({ id: q.id, label: `R${idx + 1 + (readingPassage?.questionsPartA?.length || 0)}` }))
        ];
      case 'writing':
        return writingQuestions.map((q: any, idx: number) => ({ id: q.id, label: `W${idx + 1}` }));
      default:
        return [];
    }
  };

  // Section List mapping (Dynamically filter out sections with no questions)
  const ALL_SECTIONS_LIST = [
    { id: 'listening', label: 'Listening' },
    { id: 'speaking', label: 'Speaking' },
    { id: 'grammar', label: 'Grammar' },
    { id: 'vocabulary', label: 'Vocabulary' },
    { id: 'reading', label: 'Reading' },
    { id: 'writing', label: 'Writing' }
  ];

  const SECTIONS_LIST = ALL_SECTIONS_LIST.filter(sec => {
    switch (sec.id) {
      case 'listening':
        return listeningPart1.length > 0 || listeningPart2.length > 0;
      case 'speaking':
        return speakingQuestions.length > 0 || (speakingReadAloud && speakingReadAloud.text && speakingReadAloud.text.trim().length > 0);
      case 'grammar':
        return grammarQuestions.length > 0;
      case 'vocabulary':
        return vocabularyQuestions.length > 0;
      case 'reading':
        return (readingPassage?.questionsPartA?.length || 0) > 0 || (readingPassage?.questionsPartB?.length || 0) > 0 || (readingPassage?.text?.trim()?.length || 0) > 0;
      case 'writing':
        return writingQuestions.length > 0;
      default:
        return false;
    }
  }).map((sec, idx) => ({
    id: sec.id,
    label: `${idx + 1}. ${sec.label}`
  }));

  // Renders the specific active section
  const renderActiveSection = () => {
    switch (currentSection) {
      case 'listening':
        return (
          <ListeningSection
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onSkipQuestion={handleSkipQuestion}
            currentQuestionId={currentQuestionId}
            setCurrentQuestionId={setCurrentQuestionId}
            questionsPart1={listeningPart1}
            questionsPart2={listeningPart2}
            audio1Url={activeExam?.audio1Url}
            audio2Url={activeExam?.audio2Url}
          />
        );
      case 'speaking':
        return (
          <SpeakingSection
            candidateId={candidate.id}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onRefreshSession={() => resumeSession(candidate.id)}
            speakingQuestions={speakingQuestions}
            speakingReadAloud={speakingReadAloud}
          />
        );
      case 'grammar':
        return (
          <GrammarSection
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onSkipQuestion={handleSkipQuestion}
            currentQuestionId={currentQuestionId}
            setCurrentQuestionId={setCurrentQuestionId}
            questions={grammarQuestions}
          />
        );
      case 'vocabulary':
        return (
          <VocabularySection
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onSkipQuestion={handleSkipQuestion}
            currentQuestionId={currentQuestionId}
            setCurrentQuestionId={setCurrentQuestionId}
            questions={vocabularyQuestions}
          />
        );
      case 'reading':
        return (
          <ReadingSection
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onSkipQuestion={handleSkipQuestion}
            currentQuestionId={currentQuestionId}
            setCurrentQuestionId={setCurrentQuestionId}
            passage={readingPassage}
          />
        );
      case 'writing':
        return (
          <WritingSection
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onSkipQuestion={handleSkipQuestion}
            onSaveProgress={async () => {
              await saveAnswersToServer(answers);
            }}
            questions={writingQuestions}
          />
        );
      default:
        return null;
    }
  };

  // 1. RENDER ADMIN PORTAL
  if (isAdminMode) {
    return <AdminPanel onBackToTest={() => setIsAdminMode(false)} />;
  }

  // 2. RENDER WELCOME / START SCREEN
  if (!candidate) {
    return <StartScreen onRegister={handleRegister} loading={loading} onAdminClick={() => setIsAdminMode(true)} settings={settings} />;
  }

  // 3. RENDER THANK YOU PAGE (TEST COMPLETED)
  if (testCompleted) {
    return (
      <div id="thank-you-screen" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between transition-colors duration-200">
        <div className="h-2 bg-indigo-900 w-full" />
        
        <main className="max-w-5xl w-full mx-auto px-4 py-12 flex-grow flex flex-col justify-center gap-8">
          {/* Header Card */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-6 text-center max-w-2xl mx-auto w-full space-y-4"
          >
            <div className="flex justify-center">
              <div className="bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 p-3.5 rounded-full shadow-inner flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-black text-indigo-950 dark:text-slate-100 uppercase tracking-tight">
                You have already completed this exam.
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Hệ thống ghi nhận bạn đã hoàn thành bài thi này. Kết quả chi tiết đang được cập nhật.
              </p>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-md mx-auto">
              Bài làm của bạn đã được lưu trữ an toàn trên máy chủ đám mây. Giáo viên sẽ tiến hành đánh giá chi tiết phần thi viết (Writing) và trả kết quả toàn diện trong thời gian sớm nhất.
            </p>
          </motion.div>

          {/* Grid Area: Contact + Materials */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Column 1: Interactive Contact Options */}
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="md:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-6 space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 font-black text-indigo-950 dark:text-slate-100 uppercase text-xs tracking-wide">
                <Phone className="w-4 h-4 text-indigo-900 dark:text-indigo-400" />
                <span>Liên hệ giáo viên phụ trách</span>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold space-y-1">
                <div>Giáo viên phụ trách:</div>
                <div className="text-indigo-950 dark:text-slate-100 font-black text-sm">{settings.teacherName || 'Teacher Anna'}</div>
              </div>

              {settings.teacherAddress && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                  📍 <strong>Địa chỉ trung tâm/văn phòng:</strong>
                  <div className="mt-1 font-medium">{settings.teacherAddress}</div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                {/* Phone Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowPhoneOptions(!showPhoneOptions)}
                    className="w-full flex items-center justify-center gap-1.5 p-3 bg-indigo-50/50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-750 border border-indigo-100 dark:border-slate-700 rounded-xl text-indigo-950 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-indigo-900 dark:text-indigo-400" />
                    <span>Gọi điện / SMS / Zalo</span>
                  </button>

                  {showPhoneOptions && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 text-xs text-slate-700 dark:text-slate-200">
                      <a
                        href={`tel:${settings.teacherPhone || '0987.654.321'}`}
                        className="flex items-center gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-semibold"
                      >
                        📞 Gọi Hotline trực tiếp
                      </a>
                      <a
                        href={`sms:${settings.teacherPhone || '0987.654.321'}`}
                        className="flex items-center gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-semibold"
                      >
                        💬 Gửi tin nhắn SMS
                      </a>
                      <a
                        href={`https://zalo.me/${(settings.teacherZalo || settings.teacherPhone || '0987.654.321').replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-bold text-indigo-600 dark:text-indigo-400"
                      >
                        💬 Mở ứng dụng Zalo Chat
                      </a>
                    </div>
                  )}
                </div>

                <a
                  href={`mailto:${settings.teacherEmail || 'teacher@english.edu.vn'}`}
                  className="w-full flex items-center justify-center gap-1.5 p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-750 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  ✉️ Gửi thư điện tử (Email)
                </a>

                {settings.teacherFacebook && (
                  <a
                    href={settings.teacherFacebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-750 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    🔵 Theo dõi qua Facebook
                  </a>
                )}

                {settings.teacherWebsite && (
                  <a
                    href={settings.teacherWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-750 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                  >
                    🌐 Truy cập Website
                  </a>
                )}
              </div>
            </motion.div>

            {/* Column 2: Exclusive Study Materials */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl p-6 space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 font-black text-indigo-950 dark:text-slate-100 uppercase text-xs tracking-wide">
                <BookOpen className="w-4 h-4 text-indigo-900 dark:text-indigo-400" />
                <span>Tài liệu học tập bổ trợ cho bạn</span>
              </div>

              {materials.length > 0 ? (
                <>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Giáo viên đã chia sẻ các tài liệu ôn luyện độc quyền dưới đây dành riêng cho học sinh đã tham gia thi thử thành công. Hãy click để xem và tải về.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    {materials.map((m) => {
                      let IconComponent = BookOpen;
                      if (m.type === 'document') IconComponent = FileText;
                      else if (m.type === 'video') IconComponent = Video;
                      else if (m.type === 'link') IconComponent = ExternalLink;

                      return (
                        <a
                          key={m.id}
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/40 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500 rounded-2xl transition-all duration-150 cursor-pointer"
                        >
                          <div className="flex-none p-2 bg-indigo-50 dark:bg-slate-700 rounded-xl text-indigo-900 dark:text-indigo-300 group-hover:bg-indigo-100/70 transition-colors h-10 w-10 flex items-center justify-center">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5 overflow-hidden text-left">
                            <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide line-clamp-1 group-hover:text-indigo-900 dark:group-hover:text-indigo-300 transition-colors">
                              {m.title}
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {m.description || 'Tài liệu hướng dẫn bổ trợ.'}
                            </p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-10 space-y-2 border-2 border-dashed border-slate-150 dark:border-slate-800 rounded-2xl">
                  <div className="text-slate-400 text-3xl">📚</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 font-bold">Chưa có tài liệu bổ trợ nào được đăng tải.</div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Logout Action Area */}
          <div className="text-center pt-4">
            <button
              onClick={() => {
                localStorage.removeItem('candidate_session');
                setCandidate(null);
                setAnswers({});
                setSkippedQuestions({});
                setTestCompleted(false);
                setCurrentSection('listening');
              }}
              className="bg-indigo-900 hover:bg-indigo-850 dark:bg-slate-800 dark:hover:bg-slate-700 text-white dark:text-slate-100 font-extrabold py-3 px-8 rounded-2xl shadow hover:shadow-md transition-all cursor-pointer text-xs uppercase tracking-wider"
            >
              Đăng xuất & Quay về Trang chủ
            </button>
          </div>
        </main>

        <footer className="bg-indigo-950 text-slate-400 text-center py-4 text-xs border-t border-indigo-900">
          <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <div>© 2026 Professional English Placement Test System.</div>
            <button
              onClick={() => setIsAdminMode(true)}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-mono"
            >
              [ Teacher Admin Access ]
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // 4. RENDER TEST TAKING CANVAS
  return (
    <div id="test-taking-container" className="min-h-screen bg-slate-50 flex flex-col justify-between">
      
      {/* Dynamic Header */}
      <Header
        fullName={candidate.fullName}
        phone={candidate.phone}
        timeLeftSeconds={timeLeftSeconds}
        currentSection={currentSection}
        onSectionSelect={handleSectionChange}
        sectionsList={SECTIONS_LIST}
        examTitle={activeExam?.title}
      />

      {/* Warning Banner below Header */}
      <div className="bg-red-50 border-b border-red-200 py-2.5 px-6 flex items-center justify-center gap-3">
        <span className="flex-none bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
          Warning
        </span>
        <p className="text-xs md:text-sm text-red-700 font-medium italic">
          Thí sinh không được sử dụng từ điển, AI, công cụ dịch thuật hoặc nhờ người khác hỗ trợ. Nếu không biết đáp án, hãy bỏ qua.
        </p>
      </div>

      {/* Main Testing Workspace */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex-grow w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Active Section Canvas Column */}
          <div className="lg:col-span-9 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSection}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderActiveSection()}
              </motion.div>
            </AnimatePresence>

            {/* Quick Navigation Panel at the bottom of Section content */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <button
                type="button"
                disabled={SECTIONS_LIST.findIndex(s => s.id === currentSection) <= 0}
                onClick={() => {
                  const idx = SECTIONS_LIST.findIndex(s => s.id === currentSection);
                  if (idx > 0) {
                    handleSectionChange(SECTIONS_LIST[idx - 1].id);
                  }
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-slate-150"
              >
                ← Phần thi trước
              </button>
              
              <span className="text-[10px] font-black text-indigo-900 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full uppercase tracking-wider select-none">
                {SECTIONS_LIST.findIndex(s => s.id === currentSection) + 1} / {SECTIONS_LIST.length}: {SECTIONS_LIST.find(s => s.id === currentSection)?.label.split('. ')[1]}
              </span>

              {SECTIONS_LIST.findIndex(s => s.id === currentSection) < SECTIONS_LIST.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    const idx = SECTIONS_LIST.findIndex(s => s.id === currentSection);
                    if (idx < SECTIONS_LIST.length - 1) {
                      handleSectionChange(SECTIONS_LIST[idx + 1].id);
                    }
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-900 hover:bg-indigo-850 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                >
                  Phần tiếp theo →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                >
                  Nộp bài thi ✓
                </button>
              )}
            </div>
          </div>

          {/* Side Questions Palette Navigator */}
          <div className="lg:col-span-3">
            <div className="sticky top-24 space-y-4">
              <QuestionNav
                questions={getActiveSectionQuestions()}
                currentQuestionId={currentQuestionId}
                onQuestionSelect={(qId) => setCurrentQuestionId(qId)}
                answers={answers}
                skippedQuestions={skippedQuestions}
              />

              {/* Final Submit action button card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                <p className="text-slate-500 text-[10px] font-medium leading-normal">
                  * Nhấp "Nộp bài thi" khi đã hoàn thành toàn bộ 6 phần thi đánh giá năng lực.
                </p>
                <button
                  id="final-submit-trigger"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="w-full bg-indigo-900 hover:bg-indigo-850 text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" /> NỘP BÀI THI (SUBMIT)
                </button>
                <button
                  onClick={handleManualExit}
                  className="w-full bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 py-2.5 px-4 rounded-xl text-[10px] font-bold transition-all"
                >
                  Rời phòng thi
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer info bar */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center select-none shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-2">
          <div>Hệ thống thi đánh giá năng lực tiếng Anh trực tuyến chuẩn đầu vào IELTS/Cambridge.</div>
          <button
            onClick={() => setIsAdminMode(true)}
            className="text-slate-300 hover:text-slate-500 font-mono transition-colors"
          >
            [ Dành cho Giáo viên ]
          </button>
        </div>
      </footer>

      {/* ================= MODAL OVERLAYS ================= */}
      
      {/* A. TAB SWITCH CHEATING WARNING MODAL */}
      {showCheatWarning && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center p-6 select-none overflow-hidden animate-fade-in">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl border-2 border-red-500 text-center space-y-6"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-rose-50 rounded-full text-rose-600 animate-pulse">
                <AlertOctagon className="w-16 h-16" />
              </div>
              <h2 className="text-2xl font-black text-rose-600 uppercase tracking-wide mt-2">MÀN HÌNH BỊ KHÓA TẠM THỜI</h2>
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full">
                Phát hiện hành vi rời phòng thi
              </p>
            </div>
            
            <div className="space-y-3 max-w-md mx-auto text-slate-600">
              <p className="text-sm font-semibold">
                Hệ thống vừa ghi nhận bạn đã <span className="text-rose-600 font-bold underline">rời khỏi trang làm bài hoặc chuyển sang tab khác</span>.
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                Đây là hành vi vi phạm nghiêm trọng quy chế phòng thi trực tuyến. Hệ thống đã lưu lại lịch sử vi phạm này kèm mốc thời gian để gửi cho Giáo viên chấm thi.
              </p>
            </div>

            <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl max-w-md mx-auto">
              <span className="text-xs text-rose-800 font-semibold block mb-1">Số lần chuyển tab / thoát trang đã lưu:</span>
              <strong className="text-3xl font-black text-rose-700 font-mono tracking-tight">{tabSwitches} lần</strong>
            </div>

            <div className="pt-2 max-w-sm mx-auto">
              <button
                onClick={() => {
                  setShowCheatWarning(false);
                  candidateService.addLog(candidate.id, `Thí sinh đã xác nhận cảnh báo vi phạm chuyển tab để mở khóa làm bài tiếp.`).catch(() => {});
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-4 px-6 rounded-2xl text-xs tracking-wider uppercase shadow-lg shadow-red-600/20 active:scale-95 transition-all cursor-pointer"
              >
                Tôi cam kết không tái phạm & tiếp tục thi
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* B. CONFIRM SUBMIT MODAL */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-indigo-950/70 backdrop-blur-xs z-99 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-2xl p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-indigo-900 border-b border-slate-100 pb-3">
              <Eye className="w-6 h-6" />
              <h3 className="text-base font-bold uppercase">XÁC NHẬN NỘP BÀI THI</h3>
            </div>

            <p className="text-xs font-medium text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn nộp bài thi đánh giá năng lực tiếng Anh ngay bây giờ? 
              Một khi đã nộp, bạn <strong>không thể chỉnh sửa hoặc thực hiện lại bài thi</strong> lần thứ hai.
            </p>

            <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 text-[11px] text-indigo-950 font-semibold space-y-1">
              <div>• Số lượng câu đã trả lời: {Object.keys(answers).length} câu</div>
              <div>• Số lần chuyển tab cảnh báo: {tabSwitches} lần</div>
              <div>• Thời gian còn lại: {Math.floor(timeLeftSeconds / 60)} phút {timeLeftSeconds % 60} giây</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Hủy (Làm tiếp)
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={loading}
                className="bg-indigo-900 hover:bg-indigo-850 disabled:bg-indigo-300 text-white py-2.5 px-5 rounded-xl text-xs font-bold transition-all shadow cursor-pointer"
              >
                {loading ? 'Đang gửi bài...' : 'Đồng ý nộp bài'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* C. SKIP NOTE MODAL */}
      {skippingQuestionId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4"
          >
            <h3 className="text-sm font-black text-indigo-950 uppercase tracking-wide">
              Ghi chú lý do bỏ qua
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Bạn đang bỏ qua câu hỏi này. Bạn có muốn ghi chú lý do bỏ qua (ví dụ: "chưa học đến", "không hiểu từ vựng", v.v.) để giáo viên biết không?
            </p>
            <textarea
              value={skipNoteText}
              onChange={(e) => setSkipNoteText(e.target.value)}
              placeholder="Nhập ghi chú tại đây (không bắt buộc)..."
              rows={3}
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-950 text-xs font-medium text-slate-800 placeholder-slate-400"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const qId = skippingQuestionId;
                  setSkippingQuestionId(null);
                  handleAnswerChange(qId, '__SKIPPED__');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-lg text-[11px] transition-colors cursor-pointer"
              >
                Bỏ qua không ghi chú
              </button>
              <button
                type="button"
                onClick={() => {
                  const qId = skippingQuestionId;
                  setSkippingQuestionId(null);
                  
                  // Save answer as '__SKIPPED__' and save note as `__NOTE__<qId>`
                  const updated = {
                    ...answers,
                    [qId]: '__SKIPPED__',
                    [`__NOTE__${qId}`]: skipNoteText.trim()
                  };
                  setAnswers(updated);
                  setSkippedQuestions((prev) => ({ ...prev, [qId]: true }));
                  saveAnswersToServer(updated);
                }}
                className="px-4 py-2 bg-indigo-900 hover:bg-indigo-850 text-white font-extrabold rounded-lg text-[11px] transition-colors cursor-pointer shadow-sm"
              >
                Lưu và Bỏ qua
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dynamic Floating Theme Toggle button */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed bottom-6 right-6 z-[9999] p-3 rounded-full bg-indigo-900 text-amber-300 dark:bg-white dark:text-indigo-950 shadow-2xl hover:scale-110 active:scale-95 transition-all border border-indigo-800 dark:border-slate-200 cursor-pointer group"
        title={darkMode ? 'Chuyển sang Giao diện Sáng' : 'Chuyển sang Giao diện Tối'}
      >
        {darkMode ? (
          <Sun className="w-6 h-6 transition-transform group-hover:rotate-45" />
        ) : (
          <Moon className="w-6 h-6 transition-transform group-hover:-rotate-12" />
        )}
      </button>

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  Users,
  CheckCircle,
  Clock,
  Award,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Play,
  Volume2,
  Trash2,
  Lock,
  Unlock,
  Search,
  Filter,
  Check,
  X,
  FileText,
  Save,
  MessageSquare,
  Sparkles,
  RotateCcw,
  BookOpen,
  Plus,
  ExternalLink,
  Video,
  Settings,
  BarChart2,
  Activity,
  Globe,
  Share2,
  Eye
} from 'lucide-react';
import { WRITING_QUESTIONS, LISTENING_PART_1, LISTENING_PART_2, GRAMMAR_QUESTIONS, VOCABULARY_QUESTIONS, READING_PASSAGE } from '../questions';

// Firebase Services
import { authService } from '../services/auth';
import { candidateService } from '../services/candidateService';
import { examService } from '../services/examService';
import { materialService } from '../services/materialService';
import { settingsService } from '../services/settingsService';
import { storageService } from '../services/storageService';
import { aiScanService } from '../services/aiScanService';
import { languageService, Language } from '../services/languageService';
import LanguageToggle from './LanguageToggle';

// Secure Audio Utilities
import { SecureAudioPlayer, SecureAudioDownloadButton } from './SecureAudioPlayer';


interface CandidateSummary {
  id: string;
  fullName: string;
  phone: string;
  registeredAt: string;
  startedAt: string | null;
  submittedAt: string | null;
  durationSeconds: number;
  tabSwitches: number;
  scores: {
    listening: number;
    grammar: number;
    vocabulary: number;
    reading: number;
    writing: number;
    total: number;
    maxPossible: number;
    percentage: number;
  } | null;
  writingScore: number;
  writingComment: string;
  isLocked?: boolean;
}

interface AdminPanelProps {
  onBackToTest: () => void;
}

// Client-side exact replication of server grading comparison
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function checkAnswerClient(userAnswer: string, correctAnswer: string): boolean {
  if (!userAnswer) return false;
  const normUser = normalizeString(userAnswer);
  const normCorrect = normalizeString(correctAnswer);

  if (!normUser) return false;

  // Exact match
  if (normUser === normCorrect) return true;

  // Specific question overrides:
  if (normCorrect === '1700') {
    return normUser === '1700' || normUser.includes('1700');
  }
  if (normCorrect === '15') {
    return normUser === '15' || normUser.includes('15');
  }
  if (normCorrect === 'may 5th') {
    const valid = ['may 5th', 'may 5', '5 may', '5th may', 'may fifth', 'fifth of may'];
    return valid.includes(normUser) || normUser.includes('may 5');
  }
  if (normCorrect === 'have never tried') {
    const valid = ['have never tried', 'never tried', 'havent tried', 'has never tried', 'tried'];
    return valid.includes(normUser);
  }

  // Prevent matching extremely short substrings (e.g. typing "a" matching "water")
  if (normUser.length < 3) {
    return normUser === normCorrect;
  }

  // If correct is a multi-word phrase, check if user includes it or vice versa
  const correctWords = normCorrect.split(' ');
  if (correctWords.length > 1) {
    return normUser.includes(normCorrect) || normCorrect.includes(normUser);
  }

  // Single word: exact match is required!
  return normUser === normCorrect;
}

function countTabSwitches(candidate: any): number {
  if (!candidate) return 0;
  let logCount = 0;
  if (Array.isArray(candidate.logs)) {
    candidate.logs.forEach((log: any) => {
      const act = (log.action || '').toLowerCase();
      if (
        act.includes('tab switch') ||
        act.includes('chuyển tab') ||
        act.includes('rời khỏi trang') ||
        act.includes('rời trang') ||
        act.includes('hidden')
      ) {
        logCount++;
      }
    });
  }
  return Math.max(candidate.tabSwitches || 0, logCount);
}

export default function AdminPanel({ onBackToTest }: AdminPanelProps) {
  const [lang, setLang] = useState<Language>(languageService.getLanguage());
  const t = (key: Parameters<typeof languageService.t>[0]) => languageService.t(key);

  useEffect(() => {
    return languageService.onChange((newLang) => {
      setLang(newLang);
    });
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [token, setToken] = useState('');

  // Dashboard Data
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    active: 0,
    averageScore: 0,
    averagePercentage: 0,
    bands: { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 }
  });

  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'completed' | 'active'>('all');
  const [filterExamId, setFilterExamId] = useState<string>('all');
  const [expandedPhones, setExpandedPhones] = useState<string[]>([]);
  const [lockLoadingPhone, setLockLoadingPhone] = useState<string | null>(null);

  // Candidate Details state
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [viewingDetailId, setViewingDetailId] = useState<string | null>(null);
  const [activeAuditTab, setActiveAuditTab] = useState<'listening' | 'grammar' | 'vocabulary' | 'reading'>('listening');

  // Materials state
  const [adminTab, setAdminTab] = useState<'exams' | 'candidates' | 'materials' | 'settings' | 'logs'>('exams');
  const [materials, setMaterials] = useState<any[]>([]);
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialDesc, setNewMaterialDesc] = useState('');
  const [newMaterialUrl, setNewMaterialUrl] = useState('');

  // Settings State
  const [logoUrl, setLogoUrl] = useState('');
  const [themeColor, setThemeColor] = useState('indigo');
  const [slogan, setSlogan] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherZalo, setTeacherZalo] = useState('');
  const [teacherFacebook, setTeacherFacebook] = useState('');
  const [teacherWebsite, setTeacherWebsite] = useState('');
  const [teacherAddress, setTeacherAddress] = useState('');
  const [websiteName, setWebsiteName] = useState('English Placement');
  const [primaryColor, setPrimaryColor] = useState('#1e3a8a');
  const [secondaryColor, setSecondaryColor] = useState('#3b82f6');
  const [favicon, setFavicon] = useState('');
  const [cefrA1Max, setCefrA1Max] = useState<number>(19);
  const [cefrA2Max, setCefrA2Max] = useState<number>(39);
  const [cefrB1Max, setCefrB1Max] = useState<number>(59);
  const [cefrB2Max, setCefrB2Max] = useState<number>(74);
  const [cefrC1Max, setCefrC1Max] = useState<number>(89);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [newMaterialType, setNewMaterialType] = useState('document'); // document | link | video | other
  const [materialSubmitting, setMaterialSubmitting] = useState(false);

  // Exam management states
  const [exams, setExams] = useState<any[]>([]);
  const [examLoading, setExamLoading] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examActiveSubTab, setExamActiveSubTab] = useState<'candidates' | 'settings'>('candidates');
  const [examTitle, setExamTitle] = useState('');
  const [examDesc, setExamDesc] = useState('');
  const [examDuration, setExamDuration] = useState<number>(60);
  const [examAudio1Url, setExamAudio1Url] = useState('');
  const [examAudio2Url, setExamAudio2Url] = useState('');
  const [examQuestionsJson, setExamQuestionsJson] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scannedQuestions, setScannedQuestions] = useState<any[]>([]);

  // Visual Question Builder states
  const [qbSkill, setQbSkill] = useState<string>('listeningPart1');
  const [qbQuestionText, setQbQuestionText] = useState<string>('');
  const [qbAudioUrl, setQbAudioUrl] = useState<string>('');
  const [qbImageUrl, setQbImageUrl] = useState<string>('');
  const [qbOptions, setQbOptions] = useState<string[]>(['', '', '', '']);
  const [qbCorrectAnswer, setQbCorrectAnswer] = useState<string>('A');
  const [qbPassage, setQbPassage] = useState<string>('');

  // Custom alert action
  const showAlert = (title: string, message: string, type: 'success' | 'error') => {
    setAlertConfig({
      show: true,
      title,
      message,
      type
    });
  };

  // Exam CRUD & scanning functions
  const fetchExams = async () => {
    try {
      const list = await examService.getExams();
      setExams(list || []);
    } catch (e) {
      console.error('Error fetching exams:', e);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tiêu đề đề thi.', 'error');
      return;
    }
    setExamLoading(true);
    try {
      let parsedQuestions = {};
      if (examQuestionsJson.trim()) {
        try {
          parsedQuestions = JSON.parse(examQuestionsJson);
        } catch (err) {
          showAlert('Cảnh báo', 'JSON câu hỏi không hợp lệ nên chưa thể lưu các câu hỏi.', 'error');
        }
      }

      const id = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      const newExam = {
        id,
        title: examTitle.trim(),
        description: examDesc.trim(),
        durationMinutes: examDuration,
        audio1Url: examAudio1Url,
        audio2Url: examAudio2Url,
        questions: parsedQuestions
      };

      await examService.saveExam(newExam as any);
      showAlert('Thành công', 'Đã tạo đề thi mới thành công!', 'success');

      setExamTitle('');
      setExamDesc('');
      setExamDuration(60);
      setExamAudio1Url('');
      setExamAudio2Url('');
      setExamQuestionsJson('');
      setEditingExamId(null);
      fetchExams();
    } catch (err: any) {
      showAlert('Thất bại', err.message || 'Lỗi khi tạo đề thi.', 'error');
    } finally {
      setExamLoading(false);
    }
  };

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExamId) return;
    if (!examTitle.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập tiêu đề đề thi.', 'error');
      return;
    }

    let parsedQuestions = {};
    if (examQuestionsJson.trim()) {
      try {
        parsedQuestions = JSON.parse(examQuestionsJson);
      } catch (err) {
        showAlert('Lỗi định dạng', 'Dữ liệu JSON câu hỏi không hợp lệ. Vui lòng kiểm tra lại cú pháp JSON.', 'error');
        return;
      }
    }

    setExamLoading(true);
    try {
      const updatedExam = {
        id: editingExamId,
        title: examTitle.trim(),
        description: examDesc.trim(),
        durationMinutes: examDuration,
        audio1Url: examAudio1Url,
        audio2Url: examAudio2Url,
        questions: parsedQuestions
      };

      await examService.saveExam(updatedExam as any);
      showAlert('Thành công', 'Cập nhật đề thi thành công!', 'success');
      setEditingExamId(null);
      setExamTitle('');
      setExamDesc('');
      setExamDuration(60);
      setExamAudio1Url('');
      setExamAudio2Url('');
      setExamQuestionsJson('');
      fetchExams();
    } catch (err: any) {
      showAlert('Thất bại', err.message || 'Lỗi khi cập nhật đề thi.', 'error');
    } finally {
      setExamLoading(false);
    }
  };

  const handleAdminDeleteExam = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đề thi "${title}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }
    try {
      await examService.deleteExam(id);
      showAlert('Đã xóa', 'Xóa đề thi thành công!', 'success');
      fetchExams();
    } catch (err: any) {
      showAlert('Thất bại', err.message, 'error');
    }
  };

  const handleSelectEditExam = (exam: any) => {
    setEditingExamId(exam.id);
    setExamTitle(exam.title);
    setExamDesc(exam.description);
    setExamDuration(exam.durationMinutes);
    setExamAudio1Url(exam.audio1Url || '');
    setExamAudio2Url(exam.audio2Url || '');
    setExamQuestionsJson(JSON.stringify(exam.questions || {}, null, 2));
    setExamActiveSubTab('candidates');
  };

  const handleAddToQuestionsJson = () => {
    if (!qbQuestionText.trim() && qbSkill !== 'readingPartA' && qbSkill !== 'readingPartB') {
      showAlert('Lỗi', 'Vui lòng nhập nội dung câu hỏi hoặc đề bài!', 'error');
      return;
    }

    let currentObj: any = {};
    try {
      currentObj = examQuestionsJson.trim() ? JSON.parse(examQuestionsJson) : {};
    } catch (e) {
      showAlert('Lỗi cú pháp', 'Dữ liệu JSON hiện tại đang bị lỗi cú pháp. Vui lòng bấm "Tải Cấu trúc Mẫu (JSON Template)" để làm mới trước khi tự động thêm.', 'error');
      return;
    }

    // Ensure fundamental structures exist
    if (!currentObj.listeningPart1) currentObj.listeningPart1 = [];
    if (!currentObj.listeningPart2) currentObj.listeningPart2 = [];
    if (!currentObj.grammar) currentObj.grammar = [];
    if (!currentObj.vocabulary) currentObj.vocabulary = [];
    if (!currentObj.readingPassage) {
      currentObj.readingPassage = {
        passagePartA: "",
        questionsPartA: [],
        passagePartB: "",
        questionsPartB: []
      };
    }
    if (!currentObj.writingQuestions) currentObj.writingQuestions = [];
    if (!currentObj.speakingQuestions) currentObj.speakingQuestions = [];

    const uniqueId = `${qbSkill}_${Date.now()}`;

    if (qbSkill === 'listeningPart1') {
      currentObj.listeningPart1.push({
        id: uniqueId,
        audioUrl: qbAudioUrl.trim() || undefined,
        imageUrl: qbImageUrl.trim() || undefined,
        question: qbQuestionText.trim(),
        options: [...qbOptions],
        answer: qbCorrectAnswer
      });
    } else if (qbSkill === 'listeningPart2') {
      currentObj.listeningPart2.push({
        id: uniqueId,
        imageUrl: qbImageUrl.trim() || undefined,
        question: qbQuestionText.trim(),
        options: [...qbOptions],
        answer: qbCorrectAnswer
      });
    } else if (qbSkill === 'grammar') {
      currentObj.grammar.push({
        id: uniqueId,
        question: qbQuestionText.trim(),
        options: [...qbOptions],
        answer: qbCorrectAnswer
      });
    } else if (qbSkill === 'vocabulary') {
      currentObj.vocabulary.push({
        id: uniqueId,
        question: qbQuestionText.trim(),
        options: [...qbOptions],
        answer: qbCorrectAnswer
      });
    } else if (qbSkill === 'readingPartA') {
      if (qbPassage.trim()) {
        currentObj.readingPassage.passagePartA = qbPassage.trim();
      }
      if (qbQuestionText.trim()) {
        currentObj.readingPassage.questionsPartA.push({
          id: uniqueId,
          question: qbQuestionText.trim(),
          options: [...qbOptions],
          answer: qbCorrectAnswer
        });
      }
    } else if (qbSkill === 'readingPartB') {
      if (qbPassage.trim()) {
        currentObj.readingPassage.passagePartB = qbPassage.trim();
      }
      if (qbQuestionText.trim()) {
        currentObj.readingPassage.questionsPartB.push({
          id: uniqueId,
          question: qbQuestionText.trim(),
          options: [...qbOptions],
          answer: qbCorrectAnswer
        });
      }
    } else if (qbSkill === 'writing') {
      currentObj.writingQuestions.push({
        id: uniqueId,
        prompt: qbQuestionText.trim()
      });
    } else if (qbSkill === 'speaking') {
      currentObj.speakingQuestions.push({
        id: uniqueId,
        prompt: qbQuestionText.trim(),
        allowRecord: true
      });
    }

    setExamQuestionsJson(JSON.stringify(currentObj, null, 2));
    setQbQuestionText('');
    setQbAudioUrl('');
    setQbImageUrl('');
    showAlert('Thành công', 'Đã chèn câu hỏi mới vào cấu trúc JSON bên dưới!', 'success');
  };

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>, audioSlot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExamLoading(true);
    try {
      const downloadUrl = await storageService.uploadFile(file, 'exams/audio');
      if (audioSlot === 1) {
        setExamAudio1Url(downloadUrl);
        showAlert('Thành công', 'Đã tải lên Audio 1 thành công!', 'success');
      } else {
        setExamAudio2Url(downloadUrl);
        showAlert('Thành công', 'Đã tải lên Audio 2 thành công!', 'success');
      }
    } catch (err: any) {
      showAlert('Thất bại', err.message || 'Lỗi tải audio.', 'error');
    } finally {
      setExamLoading(false);
    }
  };

  const renderVisualQuestionBuilder = () => {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
          <Sparkles className="w-4 h-4 text-indigo-950" />
          <h4 className="text-[10px] font-black uppercase text-indigo-950 tracking-wider">
            TRÌNH THÊM CÂU HỎI TRỰC QUAN (VISUAL QUESTION BUILDER)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Skill Selector */}
          <div className="space-y-1">
            <label className="block text-[9px] font-bold text-slate-500 uppercase">1. Chọn kỹ năng (Skill)</label>
            <select
              value={qbSkill}
              onChange={(e) => setQbSkill(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-900 bg-white"
            >
              <option value="listeningPart1">Listening Part 1 (Có Tranh / Ảnh minh họa)</option>
              <option value="listeningPart2">Listening Part 2 (Hội thoại / Độc thoại ngắn)</option>
              <option value="grammar">Grammar (Ngữ pháp trắc nghiệm)</option>
              <option value="vocabulary">Vocabulary (Từ vựng trắc nghiệm)</option>
              <option value="readingPartA">Reading Part A (Bài đọc điền từ trắc nghiệm)</option>
              <option value="readingPartB">Reading Part B (Bài đọc đọc hiểu trắc nghiệm)</option>
              <option value="writing">Writing (Viết luận tự luận)</option>
              <option value="speaking">Speaking (Nói - Học sinh thu âm câu trả lời)</option>
            </select>
          </div>

          {/* If Listening: allow adding audio URL and image URL */}
          {(qbSkill === 'listeningPart1' || qbSkill === 'listeningPart2') && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase">
                  2A. Link Audio hoặc Tải file nghe câu này (Nếu có)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập URL file mp3..."
                    value={qbAudioUrl}
                    onChange={(e) => setQbAudioUrl(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-900 bg-white"
                  />
                  <label className="bg-indigo-900 hover:bg-indigo-850 text-white text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors font-bold shrink-0 flex items-center justify-center">
                    Tải file
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await storageService.uploadFile(file, 'exams/questions/audio');
                            setQbAudioUrl(url);
                            showAlert('Thành công', 'Đã tải lên audio cho câu hỏi!', 'success');
                          } catch (err: any) {
                            showAlert('Lỗi', err.message, 'error');
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase">
                  2B. Link Tranh / Ảnh minh họa hoặc Tải ảnh (Nếu có)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập URL hình ảnh..."
                    value={qbImageUrl}
                    onChange={(e) => setQbImageUrl(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-900 bg-white"
                  />
                  <label className="bg-indigo-900 hover:bg-indigo-850 text-white text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors font-bold shrink-0 flex items-center justify-center">
                    Tải ảnh
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const url = await storageService.uploadFile(file, 'exams/questions/images');
                            setQbImageUrl(url);
                            showAlert('Thành công', 'Đã tải lên ảnh minh họa thành công!', 'success');
                          } catch (err: any) {
                            showAlert('Lỗi', err.message, 'error');
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* If Reading Part A or Part B: Passage input */}
          {(qbSkill === 'readingPartA' || qbSkill === 'readingPartB') && (
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[9px] font-bold text-slate-500 uppercase">
                2. Đoạn văn đọc hiểu (Reading Passage) - Nhập một lần cho toàn bài đọc
              </label>
              <textarea
                placeholder="Nhập đoạn văn đọc hiểu tại đây..."
                value={qbPassage}
                onChange={(e) => setQbPassage(e.target.value)}
                rows={3}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-900 bg-white"
              />
            </div>
          )}
        </div>

        {/* Question Text Prompt */}
        <div className="space-y-1">
          <label className="block text-[9px] font-bold text-slate-500 uppercase">
            {qbSkill === 'writing' ? '2. Đề bài viết luận' : qbSkill === 'speaking' ? '2. Đề bài / Câu hỏi nói ghi âm (Speaking Record Prompt)' : '3. Câu hỏi (Question Text)'}
          </label>
          <input
            type="text"
            placeholder={
              qbSkill === 'writing'
                ? "Ví dụ: Write an essay (150-200 words) about your family..."
                : qbSkill === 'speaking'
                ? "Ví dụ: Describe a memorable trip you took recently..."
                : "Ví dụ: What is the correct form of 'be' in 'He ___ a doctor'?"
            }
            value={qbQuestionText}
            onChange={(e) => setQbQuestionText(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-900 bg-white"
          />
        </div>

        {/* If NOT writing or speaking: render Multiple Choice Options */}
        {qbSkill !== 'writing' && qbSkill !== 'speaking' && (
          <div className="space-y-3 border-t border-slate-150 pt-3">
            <label className="block text-[9px] font-bold text-slate-500 uppercase">4. Các phương án lựa chọn & Đáp án đúng</label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {qbOptions.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-bold text-xs text-indigo-950 w-4 text-center">{letter}.</span>
                    <input
                      type="text"
                      placeholder={`Phương án ${letter}...`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...qbOptions];
                        newOpts[idx] = e.target.value;
                        setQbOptions(newOpts);
                      }}
                      className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-900 bg-white"
                    />
                  </div>
                );
              })}
            </div>

            {/* Correct Answer dropdown */}
            <div className="flex items-center gap-3 w-40">
              <label className="block text-[10px] font-bold text-slate-600 shrink-0">Đáp án đúng:</label>
              <select
                value={qbCorrectAnswer}
                onChange={(e) => setQbCorrectAnswer(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-900 bg-white"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
          </div>
        )}

        {/* If speaking: notify about recording block */}
        {qbSkill === 'speaking' && (
          <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] rounded-lg font-bold flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đề thi Speaking này sẽ kích hoạt tính năng Ghi âm micro trực tiếp cho học sinh trả lời trên website.</span>
          </div>
        )}

        {/* Add question button */}
        <button
          type="button"
          onClick={handleAddToQuestionsJson}
          className="w-full py-2.5 bg-indigo-950 hover:bg-indigo-900 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer text-center uppercase tracking-wider"
        >
          Chèn câu hỏi này vào cấu trúc đề thi bên dưới ↓
        </button>
      </div>
    );
  };

  const renderAIScanner = () => {
    return (
      <div className="space-y-4">
        {/* AI Scan box */}
        <div className="bg-indigo-950 text-white rounded-2xl p-5 shadow-md border border-indigo-900 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-900/40 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <h4 className="text-xs font-black uppercase tracking-wide text-amber-400">QUÉT ĐỀ BẰNG AI (AI EXAM SCANNER)</h4>
          </div>
          <p className="text-[11px] text-indigo-200 leading-relaxed mb-4">
            Tải lên một file ảnh đề thi hoặc file PDF. Trí tuệ nhân tạo Gemini AI sẽ tự động phân tích và bóc tách dữ liệu câu hỏi rồi điền tự động vào đề thi số cho bạn.
          </p>

          <div className="relative border-2 border-dashed border-indigo-700/60 hover:border-indigo-500 rounded-xl p-4 bg-indigo-900/20 text-center transition-all">
            {scanLoading ? (
              <div className="py-4 flex flex-col items-center justify-center space-y-2">
                <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-amber-300">AI đang quét và phân tích đề thi... Vui lòng chờ 10-20 giây...</p>
              </div>
            ) : (
              <label className="cursor-pointer block py-2">
                <input 
                  type="file" 
                  accept="image/*,application/pdf" 
                  className="hidden" 
                  onChange={handleAIScanExam}
                />
                <Sparkles className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                <span className="text-xs font-bold text-indigo-200 block">Kéo thả hoặc click chọn file Đề thi (Ảnh hoặc PDF)</span>
                <span className="text-[9px] text-indigo-400 block mt-1">Hỗ trợ .png, .jpg, .jpeg, .pdf (Quét bằng Gemini-3.5-Flash)</span>
              </label>
            )}
          </div>

          {scanError && (
            <div className="mt-3 p-2 bg-rose-500/20 border border-rose-500/30 rounded-lg text-[10px] text-rose-300">
              Lỗi quét: {scanError}
            </div>
          )}
        </div>

        {/* AI Scanned Questions Review Board */}
        {scannedQuestions && scannedQuestions.length > 0 && (
          <div className="bg-slate-50 border border-indigo-150 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                <div>
                  <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                    DUYỆT CÂU HỎI QUÉT BẰNG AI ({scannedQuestions.length} câu)
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    AI đã quét và trích xuất thành công các câu hỏi từ hình ảnh. Vui lòng kiểm tra, chọn kỹ năng (Skill) và bấm chèn vào đề thi.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleInsertAllScannedQuestions}
                  className="text-[11px] bg-indigo-950 hover:bg-indigo-900 text-white font-bold py-1.5 px-3 rounded-lg transition-all shadow-sm cursor-pointer uppercase tracking-wider"
                >
                  Chèn tất cả ({scannedQuestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScannedQuestions([])}
                  className="text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                >
                  Xóa hết
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
              {scannedQuestions.map((q, qIndex) => {
                return (
                  <div key={qIndex} className="bg-white border border-slate-250 rounded-xl p-4 shadow-xs hover:border-indigo-200 transition-all space-y-3 relative">
                    {/* Header: Select skill for this question */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md self-start uppercase">
                        Câu {qIndex + 1} ({q.type === 'mcq' ? 'Trắc nghiệm' : q.type === 'blank' ? 'Điền khuyết' : q.type === 'writing' ? 'Tự luận viết' : 'Nói'})
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 shrink-0 uppercase">Kỹ năng (Skill):</span>
                        <select
                          value={q.suggestedSkill}
                          onChange={(e) => {
                            const updated = [...scannedQuestions];
                            updated[qIndex].suggestedSkill = e.target.value;
                            setScannedQuestions(updated);
                          }}
                          className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-900 bg-slate-50 cursor-pointer"
                        >
                          <option value="listeningPart1">Listening Part 1 (Trắc nghiệm)</option>
                          <option value="listeningPart2">Listening Part 2 (Điền khuyết)</option>
                          <option value="grammar">Grammar (Trắc nghiệm/Điền khuyết)</option>
                          <option value="vocabulary">Vocabulary (Trắc nghiệm)</option>
                          <option value="readingPartA">Reading Part A (Chọn từ đọc hiểu)</option>
                          <option value="readingPartB">Reading Part B (Đúng / Sai / Không đề cập)</option>
                          <option value="writing">Writing (Viết luận)</option>
                          <option value="speaking">Speaking (Ghi âm câu trả lời)</option>
                        </select>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Nội dung câu hỏi</label>
                      <textarea
                        value={q.text}
                        onChange={(e) => {
                          const updated = [...scannedQuestions];
                          updated[qIndex].text = e.target.value;
                          setScannedQuestions(updated);
                        }}
                        rows={2}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-900 bg-white"
                        placeholder="Nhập câu hỏi..."
                      />
                    </div>

                    {/* Passage (only if readingPartA or readingPartB) */}
                    {(q.suggestedSkill === 'readingPartA' || q.suggestedSkill === 'readingPartB') && (
                      <div className="space-y-1 bg-amber-50/50 p-2 border border-amber-100 rounded-lg">
                        <label className="block text-[10px] font-bold text-amber-800 uppercase">Đoạn văn đọc hiểu (Passage Context)</label>
                        <textarea
                          value={q.passage || ''}
                          onChange={(e) => {
                            const updated = [...scannedQuestions];
                            updated[qIndex].passage = e.target.value;
                            setScannedQuestions(updated);
                          }}
                          rows={3}
                          className="w-full px-3 py-1.5 border border-amber-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                          placeholder="Nhập đoạn văn đọc hiểu cho câu hỏi này..."
                        />
                      </div>
                    )}

                    {/* Options (MCQ only) */}
                    {q.type === 'mcq' && q.options && (
                      <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-2.5 border border-slate-100 rounded-lg">
                        {q.options.map((opt: string, optIdx: number) => (
                          <div key={optIdx} className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-slate-400">{String.fromCharCode(65 + optIdx)}.</span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const updated = [...scannedQuestions];
                                updated[qIndex].options[optIdx] = e.target.value;
                                setScannedQuestions(updated);
                              }}
                              className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs font-medium bg-white"
                              placeholder={`Lựa chọn ${String.fromCharCode(65 + optIdx)}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Answer (MCQ, Blank, Writing) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Đáp án đúng:</span>
                        {q.type === 'mcq' ? (
                          <select
                            value={q.answer || 'A'}
                            onChange={(e) => {
                              const updated = [...scannedQuestions];
                              updated[qIndex].answer = e.target.value;
                              setScannedQuestions(updated);
                            }}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white cursor-pointer"
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={q.answer || ''}
                            onChange={(e) => {
                              const updated = [...scannedQuestions];
                              updated[qIndex].answer = e.target.value;
                              setScannedQuestions(updated);
                            }}
                            className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium bg-white w-40"
                            placeholder="Nhập từ đáp án..."
                          />
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleInsertSingleScannedQuestion(qIndex)}
                          className="text-[10px] bg-indigo-900 hover:bg-indigo-850 text-white font-bold py-1 px-2.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Chèn câu này
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = scannedQuestions.filter((_, idx) => idx !== qIndex);
                            setScannedQuestions(updated);
                          }}
                          className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-1 px-2.5 rounded-lg transition-colors cursor-pointer border border-rose-100"
                        >
                          Xóa khỏi danh sách
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleInsertSingleScannedQuestion = (index: number) => {
    const q = scannedQuestions[index];
    if (!q) return;

    let currentObj: any = {};
    try {
      currentObj = examQuestionsJson.trim() ? JSON.parse(examQuestionsJson) : {};
    } catch (e) {
      showAlert('Lỗi cú pháp', 'Dữ liệu JSON hiện tại đang bị lỗi cú pháp. Vui lòng sửa lại trước khi thêm.', 'error');
      return;
    }

    // Ensure structures exist
    if (!currentObj.listeningPart1) currentObj.listeningPart1 = [];
    if (!currentObj.listeningPart2) currentObj.listeningPart2 = [];
    if (!currentObj.grammar) currentObj.grammar = [];
    if (!currentObj.vocabulary) currentObj.vocabulary = [];
    if (!currentObj.readingPassage) {
      currentObj.readingPassage = {
        passagePartA: "",
        questionsPartA: [],
        passagePartB: "",
        questionsPartB: []
      };
    }
    if (!currentObj.writingQuestions) currentObj.writingQuestions = [];
    if (!currentObj.speakingQuestions) currentObj.speakingQuestions = [];

    const uniqueId = `${q.suggestedSkill}_${Date.now()}_${index}`;

    if (q.suggestedSkill === 'listeningPart1') {
      currentObj.listeningPart1.push({
        id: uniqueId,
        question: q.text,
        options: q.options || ['', '', '', ''],
        answer: q.answer || 'A'
      });
    } else if (q.suggestedSkill === 'listeningPart2') {
      currentObj.listeningPart2.push({
        id: uniqueId,
        question: q.text,
        options: q.options || undefined,
        answer: q.answer || ''
      });
    } else if (q.suggestedSkill === 'grammar') {
      currentObj.grammar.push({
        id: uniqueId,
        question: q.text,
        options: q.options || undefined,
        answer: q.answer || 'A'
      });
    } else if (q.suggestedSkill === 'vocabulary') {
      currentObj.vocabulary.push({
        id: uniqueId,
        question: q.text,
        options: q.options || ['', '', '', ''],
        answer: q.answer || 'A'
      });
    } else if (q.suggestedSkill === 'readingPartA') {
      if (q.passage?.trim()) {
        currentObj.readingPassage.passagePartA = q.passage.trim();
      }
      currentObj.readingPassage.questionsPartA.push({
        id: uniqueId,
        question: q.text,
        options: q.options || ['', '', '', ''],
        answer: q.answer || 'A'
      });
    } else if (q.suggestedSkill === 'readingPartB') {
      if (q.passage?.trim()) {
        currentObj.readingPassage.passagePartB = q.passage.trim();
      }
      currentObj.readingPassage.questionsPartB.push({
        id: uniqueId,
        question: q.text,
        options: q.options || ['True', 'False', 'Not Given'],
        answer: q.answer || 'True'
      });
    } else if (q.suggestedSkill === 'writing') {
      currentObj.writingQuestions.push({
        id: uniqueId,
        prompt: q.text
      });
    } else if (q.suggestedSkill === 'speaking') {
      currentObj.speakingQuestions.push({
        id: uniqueId,
        prompt: q.text,
        allowRecord: true
      });
    }

    setExamQuestionsJson(JSON.stringify(currentObj, null, 2));
    
    // Remove from scanned list
    const updated = scannedQuestions.filter((_, idx) => idx !== index);
    setScannedQuestions(updated);
    showAlert('Đã chèn câu hỏi', `Đã chèn câu hỏi thành công vào kĩ năng: ${q.suggestedSkill}`, 'success');
  };

  const handleInsertAllScannedQuestions = () => {
    if (scannedQuestions.length === 0) return;

    let currentObj: any = {};
    try {
      currentObj = examQuestionsJson.trim() ? JSON.parse(examQuestionsJson) : {};
    } catch (e) {
      showAlert('Lỗi cú pháp', 'Dữ liệu JSON hiện tại đang bị lỗi cú pháp. Vui lòng sửa lại trước khi thêm.', 'error');
      return;
    }

    // Ensure structures exist
    if (!currentObj.listeningPart1) currentObj.listeningPart1 = [];
    if (!currentObj.listeningPart2) currentObj.listeningPart2 = [];
    if (!currentObj.grammar) currentObj.grammar = [];
    if (!currentObj.vocabulary) currentObj.vocabulary = [];
    if (!currentObj.readingPassage) {
      currentObj.readingPassage = {
        passagePartA: "",
        questionsPartA: [],
        passagePartB: "",
        questionsPartB: []
      };
    }
    if (!currentObj.writingQuestions) currentObj.writingQuestions = [];
    if (!currentObj.speakingQuestions) currentObj.speakingQuestions = [];

    scannedQuestions.forEach((q, index) => {
      const uniqueId = `${q.suggestedSkill}_${Date.now()}_${index}`;

      if (q.suggestedSkill === 'listeningPart1') {
        currentObj.listeningPart1.push({
          id: uniqueId,
          question: q.text,
          options: q.options || ['', '', '', ''],
          answer: q.answer || 'A'
        });
      } else if (q.suggestedSkill === 'listeningPart2') {
        currentObj.listeningPart2.push({
          id: uniqueId,
          question: q.text,
          options: q.options || undefined,
          answer: q.answer || ''
        });
      } else if (q.suggestedSkill === 'grammar') {
        currentObj.grammar.push({
          id: uniqueId,
          question: q.text,
          options: q.options || undefined,
          answer: q.answer || 'A'
        });
      } else if (q.suggestedSkill === 'vocabulary') {
        currentObj.vocabulary.push({
          id: uniqueId,
          question: q.text,
          options: q.options || ['', '', '', ''],
          answer: q.answer || 'A'
        });
      } else if (q.suggestedSkill === 'readingPartA') {
        if (q.passage?.trim()) {
          currentObj.readingPassage.passagePartA = q.passage.trim();
        }
        currentObj.readingPassage.questionsPartA.push({
          id: uniqueId,
          question: q.text,
          options: q.options || ['', '', '', ''],
          answer: q.answer || 'A'
        });
      } else if (q.suggestedSkill === 'readingPartB') {
        if (q.passage?.trim()) {
          currentObj.readingPassage.passagePartB = q.passage.trim();
        }
        currentObj.readingPassage.questionsPartB.push({
          id: uniqueId,
          question: q.text,
          options: q.options || ['True', 'False', 'Not Given'],
          answer: q.answer || 'True'
        });
      } else if (q.suggestedSkill === 'writing') {
        currentObj.writingQuestions.push({
          id: uniqueId,
          prompt: q.text
        });
      } else if (q.suggestedSkill === 'speaking') {
        currentObj.speakingQuestions.push({
          id: uniqueId,
          prompt: q.text,
          allowRecord: true
        });
      }
    });

    setExamQuestionsJson(JSON.stringify(currentObj, null, 2));
    setScannedQuestions([]);
    showAlert('Đã chèn tất cả', `Đã chèn thành công tất cả các câu hỏi quét từ ảnh vào cấu trúc đề thi!`, 'success');
  };

  const handleAIScanExam = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanLoading(true);
    setScanError('');
    showAlert('Đang quét đề', 'AI đang xử lý quét ảnh/file đề thi và bóc tách câu hỏi. Vui lòng chờ trong giây lát...', 'success');

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      try {
        const result = await aiScanService.scanExamWithAI(base64Data, file.type || 'image/jpeg');
        
        if (result) {
          setExamTitle(result.title || examTitle || 'Đề thi Quét bởi AI');
          setExamDesc(result.description || examDesc || 'Đề thi tự động quét và tạo lập bởi AI');
          setExamDuration(result.durationMinutes || examDuration || 60);
          
          if (result.questions && result.questions.length > 0) {
            setScannedQuestions(result.questions);
            showAlert('Quét đề hoàn tất', `AI đã phân tích và bóc tách thành công ${result.questions.length} câu hỏi từ ảnh/file! Vui lòng duyệt qua danh sách câu hỏi ở bên dưới và chọn Skill tương ứng cho mỗi câu.`, 'success');
          } else {
            showAlert('Hoàn tất quét', 'Không phát hiện thấy câu hỏi nào cụ thể trong file tải lên.', 'success');
          }
        } else {
          throw new Error('Dữ liệu quét không hợp lệ.');
        }
      } catch (err: any) {
        setScanError(err.message);
        showAlert('Lỗi quét đề', err.message, 'error');
      } finally {
        setScanLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Manual Grading State
  const [writingScore, setWritingScore] = useState<number>(0);
  const [writingComment, setWritingComment] = useState<string>('');
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingSuccess, setGradingSuccess] = useState(false);

  // Custom Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    type: 'reset' | 'delete';
    id: string;
    name: string;
  } | null>(null);

  // Custom Alert Modal state
  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Check saved admin session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      
      const loadAll = async () => {
        try {
          const cands = await candidateService.getCandidates();
          setCandidates(cands);
          calculateDashboardStats(cands);
          
          const mats = await materialService.getMaterials();
          setMaterials(mats);
          
          fetchExams();
          
           const s = await settingsService.getSettings();
          setLogoUrl(s.logoUrl || '');
          setThemeColor(s.themeColor || 'indigo');
          setSlogan(s.slogan || '');
          setTeacherPhone(s.teacherPhone || '');
          setTeacherEmail(s.teacherEmail || '');
          setGeminiApiKey(s.geminiApiKey || '');
          setTeacherName(s.teacherName || '');
          setTeacherZalo(s.teacherZalo || '');
          setTeacherFacebook(s.teacherFacebook || '');
          setTeacherWebsite(s.teacherWebsite || '');
          setTeacherAddress(s.teacherAddress || '');
          setWebsiteName(s.websiteName || 'English Placement');
          setPrimaryColor(s.primaryColor || '#1e3a8a');
          setSecondaryColor(s.secondaryColor || '#3b82f6');
          setFavicon(s.favicon || '');
          if (s.cefrThresholds) {
            setCefrA1Max(s.cefrThresholds.a1Max);
            setCefrA2Max(s.cefrThresholds.a2Max);
            setCefrB1Max(s.cefrThresholds.b1Max);
            setCefrB2Max(s.cefrThresholds.b2Max);
            setCefrC1Max(s.cefrThresholds.c1Max);
          }
          calculateDashboardStats(cands, s.cefrThresholds);
        } catch (err) {
          console.error('Error loading initial admin data:', err);
        }
      };
      loadAll();
    }
  }, []);

  const calculateDashboardStats = (cands: any[], customThresholds?: any) => {
    const total = cands.length;
    const completed = cands.filter(c => c.submittedAt !== null).length;
    const active = total - completed;
    
    let totalScore = 0;
    let totalPercentage = 0;
    let completedCount = 0;
    
    const bands = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    
    const a1Max = customThresholds ? customThresholds.a1Max : cefrA1Max;
    const a2Max = customThresholds ? customThresholds.a2Max : cefrA2Max;
    const b1Max = customThresholds ? customThresholds.b1Max : cefrB1Max;
    const b2Max = customThresholds ? customThresholds.b2Max : cefrB2Max;
    const c1Max = customThresholds ? customThresholds.c1Max : cefrC1Max;

    cands.forEach(c => {
      if (c.submittedAt !== null && c.scores) {
        completedCount++;
        totalScore += c.scores.total || 0;
        totalPercentage += c.scores.percentage || 0;
        
        const pct = c.scores.percentage || 0;
        if (pct <= a1Max) bands.A1++;
        else if (pct <= a2Max) bands.A2++;
        else if (pct <= b1Max) bands.B1++;
        else if (pct <= b2Max) bands.B2++;
        else if (pct <= c1Max) bands.C1++;
        else bands.C2++;
      }
    });
    
    setStats({
      total,
      completed,
      active,
      averageScore: completedCount > 0 ? Number((totalScore / completedCount).toFixed(1)) : 0,
      averagePercentage: completedCount > 0 ? Math.round(totalPercentage / completedCount) : 0,
      bands
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const ok = await authService.login(password);
      if (!ok || !ok.success) {
        throw new Error(ok?.error || 'Mật khẩu quản trị viên không chính xác.');
      }

      localStorage.setItem('admin_token', 'true');
      setToken('true');
      setIsAuthenticated(true);
      
      const cands = await candidateService.getCandidates();
      setCandidates(cands);
      calculateDashboardStats(cands);
      
      const mats = await materialService.getMaterials();
      setMaterials(mats);
      
      fetchExams();
      
      const s = await settingsService.getSettings();
      setLogoUrl(s.logoUrl || '');
      setThemeColor(s.themeColor || 'indigo');
      setSlogan(s.slogan || '');
      setTeacherPhone(s.teacherPhone || '');
      setTeacherEmail(s.teacherEmail || '');
      setGeminiApiKey(s.geminiApiKey || '');
      setTeacherName(s.teacherName || '');
      setTeacherZalo(s.teacherZalo || '');
      setTeacherFacebook(s.teacherFacebook || '');
      setTeacherWebsite(s.teacherWebsite || '');
      setTeacherAddress(s.teacherAddress || '');
      setWebsiteName(s.websiteName || 'English Placement');
      setPrimaryColor(s.primaryColor || '#1e3a8a');
      setSecondaryColor(s.secondaryColor || '#3b82f6');
      setFavicon(s.favicon || '');
      if (s.cefrThresholds) {
        setCefrA1Max(s.cefrThresholds.a1Max);
        setCefrA2Max(s.cefrThresholds.a2Max);
        setCefrB1Max(s.cefrThresholds.b1Max);
        setCefrB2Max(s.cefrThresholds.b2Max);
        setCefrC1Max(s.cefrThresholds.c1Max);
      }
      calculateDashboardStats(cands, s.cefrThresholds);
    } catch (err: any) {
      setLoginError(err.message || 'Đăng nhập thất bại.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setIsAuthenticated(false);
    setSelectedCandidate(null);
    setViewingDetailId(null);
  };

  const fetchDashboardData = async () => {
    try {
      const cands = await candidateService.getCandidates();
      setCandidates(cands);
      calculateDashboardStats(cands);
    } catch (e) {
      console.error('Error fetching admin stats:', e);
    }
  };

  const fetchCandidates = async () => {
    try {
      const cands = await candidateService.getCandidates();
      setCandidates(cands);
      calculateDashboardStats(cands);
    } catch (e) {
      console.error('Error fetching candidates list:', e);
    }
  };

  const fetchMaterials = async () => {
    try {
      const mats = await materialService.getMaterials();
      setMaterials(mats || []);
    } catch (e) {
      console.error('Error fetching materials list:', e);
    }
  };

  const fetchCandidateDetails = async (id: string) => {
    try {
      const cand = await candidateService.getCandidateById(id);
      if (cand) {
        setSelectedCandidate(cand);
        setWritingScore(cand.writingScore || 0);
        setWritingComment(cand.writingComment || '');
      }
    } catch (e) {
      console.error('Error fetching candidate details:', e);
    }
  };

  const toggleExpandPhone = (phone: string) => {
    setExpandedPhones((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]
    );
  };

  const handleToggleLockPhone = async (phone: string, currentIsLocked: boolean) => {
    setLockLoadingPhone(phone);
    try {
      const newLockState = !currentIsLocked;
      await candidateService.setCandidateLockStateByPhone(phone, newLockState);
      
      setAlertConfig({
        show: true,
        title: 'Thành công',
        message: newLockState
          ? `Đã khóa thí sinh có SĐT "${phone}" thành công! Thí sinh này sẽ không thể tham gia bất kỳ kỳ thi nào nữa.`
          : `Đã mở khóa thí sinh có SĐT "${phone}" thành công!`,
        type: 'success'
      });
      
      // Refresh list
      await fetchCandidates();
    } catch (err: any) {
      setAlertConfig({
        show: true,
        title: 'Lỗi',
        message: err.message || 'Có lỗi xảy ra khi cập nhật trạng thái khóa.',
        type: 'error'
      });
    } finally {
      setLockLoadingPhone(null);
    }
  };

  // Handle candidate search and filter
  useEffect(() => {
    let result = candidates;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }

    if (filterType === 'completed') {
      result = result.filter((c) => c.submittedAt !== null);
    } else if (filterType === 'active') {
      result = result.filter((c) => c.submittedAt === null);
    }

    if (filterExamId !== 'all') {
      result = result.filter((c) => (c as any).examId === filterExamId);
    }

    setFilteredCandidates(result);
  }, [searchQuery, filterType, filterExamId, candidates]);

  // Group candidates by phone for deduplicated candidate management
  const groupedCandidates = React.useMemo(() => {
    const groups: Record<string, {
      phone: string;
      fullName: string;
      isLocked: boolean;
      attempts: any[];
    }> = {};

    filteredCandidates.forEach((c) => {
      const p = c.phone || 'N/A';
      if (!groups[p]) {
        groups[p] = {
          phone: p,
          fullName: c.fullName,
          isLocked: !!c.isLocked,
          attempts: []
        };
      }
      groups[p].attempts.push(c);
      if (c.isLocked) {
        groups[p].isLocked = true;
      }
    });

    return Object.values(groups);
  }, [filteredCandidates]);

  // Group candidates by exam for consolidated exam-wise administration
  const candidatesByExam = React.useMemo(() => {
    const groups: Record<string, CandidateSummary[]> = {};
    filteredCandidates.forEach((c) => {
      const eId = (c as any).examId || 'default-exam';
      if (!groups[eId]) {
        groups[eId] = [];
      }
      groups[eId].push(c);
    });
    return groups;
  }, [filteredCandidates]);

  const handleViewDetail = (id: string) => {
    setViewingDetailId(id);
    fetchCandidateDetails(id);
  };

  const handleCloseDetail = () => {
    setViewingDetailId(null);
    setSelectedCandidate(null);
    // Refresh list to show updated grades
    fetchDashboardData();
    fetchCandidates();
  };

  // Handle Manual Writing grading submit
  const handleGradeWriting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    setGradingLoading(true);
    setGradingSuccess(false);

    try {
      const updatedCand = await candidateService.gradeWriting(selectedCandidate.id, writingScore, writingComment);
      setSelectedCandidate(updatedCand);
      setGradingSuccess(true);
      setTimeout(() => setGradingSuccess(false), 3000);
      fetchCandidates(); // Refresh list to update final scores
    } catch (err: any) {
      setAlertConfig({
        show: true,
        title: 'Thất bại',
        message: err.message || 'Lỗi chấm viết.',
        type: 'error'
      });
    } finally {
      setGradingLoading(false);
    }
  };

  const handleDeleteCandidate = (id: string, name: string) => {
    setConfirmModalConfig({ type: 'delete', id, name });
    setShowConfirmModal(true);
  };

  const handleResetCandidate = (id: string, name: string) => {
    setConfirmModalConfig({ type: 'reset', id, name });
    setShowConfirmModal(true);
  };

  const handleConfirmedAction = async () => {
    if (!confirmModalConfig) return;
    const { type, id, name } = confirmModalConfig;
    setShowConfirmModal(false);

    if (type === 'delete') {
      try {
        await candidateService.deleteCandidate(id);

        setAlertConfig({
          show: true,
          title: 'Thành công',
          message: `Đã xóa thí sinh "${name}" vĩnh viễn khỏi hệ thống!`,
          type: 'success'
        });

        if (selectedCandidate && selectedCandidate.id === id) {
          handleCloseDetail();
        } else {
          fetchCandidates();
        }
      } catch (err: any) {
        setAlertConfig({
          show: true,
          title: 'Thất bại',
          message: err.message || 'Lỗi xóa thí sinh.',
          type: 'error'
        });
      }
    } else if (type === 'reset') {
      try {
        await candidateService.resetCandidate(id);

        setAlertConfig({
          show: true,
          title: 'Thành công',
          message: `Đã reset bài thi của thí sinh "${name}" thành công! Thí sinh có thể làm lại bài thi ngay.`,
          type: 'success'
        });

        if (selectedCandidate && selectedCandidate.id === id) {
          fetchCandidateDetails(id);
        } else {
          fetchCandidates();
        }
      } catch (err: any) {
        setAlertConfig({
          show: true,
          title: 'Thất bại',
          message: err.message || 'Lỗi reset bài thi.',
          type: 'error'
        });
      }
    }
  };

  // Helper to format duration in seconds to hh:mm:ss or mm:ss
  const formatDuration = (totalSecs: number) => {
    if (!totalSecs) return '0 giây';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    let res = '';
    if (hrs > 0) res += `${hrs} giờ `;
    if (mins > 0) res += `${mins} phút `;
    if (secs > 0 || res === '') res += `${secs} giây`;
    return res;
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialTitle.trim()) return;

    setMaterialSubmitting(true);
    try {
      const id = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      const newMat = {
        id,
        title: newMaterialTitle.trim(),
        description: newMaterialDesc.trim(),
        url: newMaterialUrl.trim(),
        type: newMaterialType,
        createdAt: new Date().toISOString()
      };

      await materialService.saveMaterial(newMat);

      setNewMaterialTitle('');
      setNewMaterialDesc('');
      setNewMaterialUrl('');
      setNewMaterialType('document');
      
      // Refresh list
      await fetchMaterials();
      
      // Show alert
      setAlertConfig({
        show: true,
        title: 'Thành công',
        message: 'Tài liệu ôn tập đã được thêm thành công.',
        type: 'success'
      });
    } catch (e: any) {
      console.error(e);
      setAlertConfig({
        show: true,
        title: 'Lỗi',
        message: e.message || 'Có lỗi xảy ra khi thêm tài liệu.',
        type: 'error'
      });
    } finally {
      setMaterialSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu này không?')) return;

    try {
      await materialService.deleteMaterial(id);
      await fetchMaterials();
      
      setAlertConfig({
        show: true,
        title: 'Thành công',
        message: 'Đã xóa tài liệu thành công.',
        type: 'success'
      });
    } catch (e: any) {
      console.error(e);
      setAlertConfig({
        show: true,
        title: 'Lỗi',
        message: e.message || 'Có lỗi xảy ra khi xóa tài liệu.',
        type: 'error'
      });
    }
  };

  // Export Table to CSV
  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // Add BOM for excel Vietnamese characters support
    csvContent += 'Mã thí sinh,Họ tên,Số điện thoại,Thời gian đăng ký,Bắt đầu,Nộp bài,Thời gian làm bài,Lần chuyển tab,Điểm nghe,Điểm ngữ pháp,Điểm từ vựng,Điểm đọc,Điểm viết,Tổng điểm,Tỷ lệ %\n';

    candidates.forEach((c) => {
      const listening = c.scores?.listening ?? '-';
      const grammar = c.scores?.grammar ?? '-';
      const vocabulary = c.scores?.vocabulary ?? '-';
      const reading = c.scores?.reading ?? '-';
      const writing = c.writingScore ?? 0;
      const total = c.scores?.total ?? '-';
      const pct = c.scores?.percentage ?? '-';
      const dur = c.durationSeconds ? `${Math.floor(c.durationSeconds / 60)} phút ${c.durationSeconds % 60} giây` : '-';

      const row = [
        c.id,
        `"${c.fullName}"`,
        `"${c.phone}"`,
        c.registeredAt ? new Date(c.registeredAt).toLocaleString('vi-VN') : '',
        c.startedAt ? new Date(c.startedAt).toLocaleString('vi-VN') : '',
        c.submittedAt ? new Date(c.submittedAt).toLocaleString('vi-VN') : 'Đang thi',
        `"${dur}"`,
        c.tabSwitches,
        listening,
        grammar,
        vocabulary,
        reading,
        writing,
        total,
        pct
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `English_Placement_Test_Candidates_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div id="admin-login-wrapper" className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center mb-4">
            <div className="bg-indigo-900 p-3.5 rounded-full shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-indigo-950 uppercase">
            Admin Portal Log In
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Hệ thống quản lý điểm thi đánh giá năng lực Tiếng Anh
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
            <form className="space-y-6" onSubmit={handleLogin}>
              {loginError && (
                <div id="login-error-alert" className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-semibold border border-red-100 flex items-center gap-2">
                  <ShieldAlert className="shrink-0 w-4 h-4 text-red-600" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Mật khẩu bí mật của Admin
                </label>
                <input
                  id="admin-pwd-input"
                  type="password"
                  required
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-900 focus:outline-none transition-all"
                />
                <p className="text-slate-400 text-[10px] mt-1">
                  * Mật khẩu mặc định khởi tạo ban đầu là: <span className="font-mono bg-slate-50 border border-slate-200 px-1 py-0.5 rounded text-indigo-900 font-bold">admin123</span>
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onBackToTest}
                  className="flex-1 bg-white border border-slate-300 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs hover:bg-slate-50 transition-colors"
                >
                  Quay lại thi
                </button>
                <button
                  id="admin-login-submit"
                  type="submit"
                  className="flex-1 bg-indigo-900 hover:bg-indigo-850 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md hover:shadow-lg transition-colors cursor-pointer"
                >
                  Đăng nhập Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const renderMaterialsManager = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-indigo-950 uppercase tracking-tight">KHO TÀI LIỆU HỌC TẬP & ÔN TẬP</h2>
            <p className="text-xs text-slate-500">Thêm, bớt các tài liệu ôn luyện bổ trợ hiển thị công khai ở màn hình chờ làm bài của học sinh.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Add New Material Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-900" /> Thêm tài liệu mới
            </h3>
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">Tiêu đề tài liệu</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đề cương từ vựng IELTS B1"
                  value={newMaterialTitle}
                  onChange={(e) => setNewMaterialTitle(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">Đường dẫn liên kết (URL)</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/tai-lieu-pdf"
                  value={newMaterialUrl}
                  onChange={(e) => setNewMaterialUrl(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">Loại tài liệu</label>
                <select
                  value={newMaterialType}
                  onChange={(e) => setNewMaterialType(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                >
                  <option value="document">Tài liệu PDF / Word (.pdf, .docx)</option>
                  <option value="link">Trang web ôn thi / Liên kết ngoài</option>
                  <option value="video">Bài giảng video (YouTube, Drive...)</option>
                  <option value="other">Loại khác</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">Mô tả ngắn gọn</label>
                <textarea
                  placeholder="Mô tả nội dung chính giúp học sinh nắm rõ trước khi click..."
                  value={newMaterialDesc}
                  onChange={(e) => setNewMaterialDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={materialSubmitting}
                className="w-full bg-indigo-900 hover:bg-indigo-850 disabled:bg-indigo-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                {materialSubmitting ? 'Đang thêm...' : 'Thêm tài liệu'}
              </button>
            </form>
          </div>

          {/* Column 2: Materials List */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
              <span>Danh sách tài liệu hoạt động ({materials.length})</span>
            </h3>

            {materials.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <BookOpen className="w-12 h-12 mb-2 stroke-1" />
                <p className="text-xs font-semibold">Chưa có tài liệu nào được đăng tải.</p>
                <p className="text-[10px] text-slate-400">Vui lòng điền thông tin bên trái để tạo tài liệu đầu tiên.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
                {materials.map((m) => {
                  let IconComponent = BookOpen;
                  if (m.type === 'document') IconComponent = FileText;
                  else if (m.type === 'video') IconComponent = Video;
                  else if (m.type === 'link') IconComponent = ExternalLink;

                  return (
                    <div key={m.id} className="py-4 first:pt-0 last:pb-0 flex justify-between items-start gap-4 hover:bg-slate-50/50 px-2 rounded-xl transition-colors">
                      <div className="flex gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-900 shrink-0">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                            {m.title}
                            <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md text-indigo-900 font-mono font-semibold">
                              {m.type}
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 leading-relaxed">{m.description || 'Không có mô tả.'}</p>
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-indigo-900 hover:underline font-mono inline-flex items-center gap-1 font-medium pt-1 animate-fade-in"
                          >
                            {m.url} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteMaterial(m.id)}
                        className="text-rose-600 hover:text-rose-800 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const updatedSettings = {
        logoUrl,
        themeColor,
        slogan,
        teacherPhone,
        teacherEmail,
        geminiApiKey,
        teacherName,
        teacherZalo,
        teacherFacebook,
        teacherWebsite,
        teacherAddress,
        websiteName,
        primaryColor,
        secondaryColor,
        favicon,
        cefrThresholds: {
          a1Max: cefrA1Max,
          a2Max: cefrA2Max,
          b1Max: cefrB1Max,
          b2Max: cefrB2Max,
          c1Max: cefrC1Max
        }
      };
      await settingsService.updateSettings(updatedSettings);
      
      // Recalculate stats with the newly saved thresholds
      calculateDashboardStats(candidates, updatedSettings.cefrThresholds);
      
      showAlert('Thành công', 'Đã cập nhật cấu hình hệ thống thành công!', 'success');
    } catch (err: any) {
      showAlert('Thất bại', err.message || 'Lỗi lưu cấu hình.', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập mật khẩu hiện tại.', 'error');
      return;
    }
    if (!newPassword.trim()) {
      showAlert('Lỗi', 'Vui lòng nhập mật khẩu mới.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Lỗi', 'Mật khẩu xác nhận không khớp.', 'error');
      return;
    }
    setPasswordChangeLoading(true);
    try {
      const res = await authService.updateAdminPassword(oldPassword.trim(), newPassword.trim());
      if (!res.success) {
        throw new Error(res.error || 'Lỗi thay đổi mật khẩu.');
      }
      showAlert('Thành công', 'Đã thay đổi mật khẩu quản trị viên thành công!', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showAlert('Thất bại', err.message || 'Lỗi thay đổi mật khẩu.', 'error');
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const renderOverviewTab = () => {
    // 1. Calculate Daily Registrations for last 7 days
    const dailyStats: { [key: string]: number } = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(day => {
      dailyStats[day] = 0;
    });

    candidates.forEach(c => {
      if (c.registeredAt) {
        const day = c.registeredAt.split('T')[0];
        if (dailyStats[day] !== undefined) {
          dailyStats[day]++;
        }
      }
    });

    // 2. Average Duration
    const completedCandidates = candidates.filter(c => c.submittedAt);
    const totalSecs = completedCandidates.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
    const avgMinutes = completedCandidates.length > 0 ? Math.round(totalSecs / completedCandidates.length / 60) : 0;

    // Max count for chart scaling
    const maxDailyCount = Math.max(...Object.values(dailyStats), 1);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-indigo-950 uppercase tracking-tight">Tổng quan hệ thống</h2>
          <p className="text-xs text-slate-500">Thống kê dữ liệu, lượt thi, trình độ năng lực và hoạt động của thí sinh.</p>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-900 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tổng số học sinh</p>
              <p className="text-2xl font-black text-indigo-950">{stats.total}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg text-amber-700 shrink-0">
              <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lượt đang làm bài</p>
              <p className="text-2xl font-black text-amber-600">{stats.active}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg text-green-700 shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lượt đã hoàn thành</p>
              <p className="text-2xl font-black text-green-700">{stats.completed}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-rose-50 rounded-lg text-rose-700 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">T/g làm bài trung bình</p>
              <p className="text-2xl font-black text-rose-950">{avgMinutes} phút</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Candidate Statistics Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs lg:col-span-2 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-900" /> Thống kê học sinh thi theo ngày
              </h3>
              <p className="text-xs text-slate-400 mb-4">Số lượng đăng ký thi trong 7 ngày gần nhất.</p>
            </div>

            {/* Pure CSS/Tailwind Chart */}
            <div className="flex items-end gap-3 h-56 pt-4 border-b border-l border-slate-100 px-2">
              {last7Days.map(day => {
                const count = dailyStats[day] || 0;
                const heightPct = Math.min((count / maxDailyCount) * 100, 100);
                // Format day as DD/MM
                const parts = day.split('-');
                const formattedDate = `${parts[2]}/${parts[1]}`;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <span className="text-[10px] font-bold text-indigo-900 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      {count}
                    </span>
                    <div
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      className="w-full bg-gradient-to-t from-indigo-900 to-indigo-600 rounded-t-lg transition-all duration-500 hover:from-amber-500 hover:to-amber-400 cursor-pointer shadow-xs relative"
                    >
                      {count > 0 && (
                        <div className="absolute inset-x-0 top-1 text-[9px] font-black text-white text-center sm:block hidden">
                          {count}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 shrink-0">
                      {formattedDate}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CEFR Level distribution */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Phân phối trình độ CEFR
            </h3>
            <p className="text-xs text-slate-400 mb-4">Xếp loại năng lực dựa trên điểm thi và ngưỡng cấu hình.</p>

            <div className="space-y-3.5">
              {[
                { label: 'A1', count: stats.bands.A1, range: `0% - ${cefrA1Max}%`, color: 'bg-slate-400' },
                { label: 'A2', count: stats.bands.A2, range: `${cefrA1Max + 1}% - ${cefrA2Max}%`, color: 'bg-emerald-500' },
                { label: 'B1', count: stats.bands.B1, range: `${cefrA2Max + 1}% - ${cefrB1Max}%`, color: 'bg-blue-500' },
                { label: 'B2', count: stats.bands.B2, range: `${cefrB1Max + 1}% - ${cefrB2Max}%`, color: 'bg-indigo-600' },
                { label: 'C1', count: stats.bands.C1, range: `${cefrB2Max + 1}% - ${cefrC1Max}%`, color: 'bg-violet-600' },
                { label: 'C2', count: stats.bands.C2 || 0, range: `${cefrC1Max + 1}% - 100%`, color: 'bg-amber-500' },
              ].map(level => {
                const bands = (stats.bands || {}) as Record<string, number>;
                const totalGraded = Object.values(bands).reduce((a, b) => a + b, 0);
                const pct = totalGraded > 0 ? Math.round(((level.count || 0) / totalGraded) * 100) : 0;
                return (
                  <div key={level.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${level.color}`} />
                        <span className="font-extrabold text-slate-800 text-sm">{level.label}</span>
                        <span className="text-[10px] text-slate-400">({level.range})</span>
                      </div>
                      <div className="font-bold text-slate-700">
                        {level.count} hs <span className="text-[10px] text-slate-400 font-mono">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full ${level.color} transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLogsTab = () => {
    // Collect and flatten logs from all candidates
    const allLogs: Array<{
      timestamp: string;
      candidateName: string;
      candidatePhone: string;
      action: string;
      details: string;
    }> = [];

    candidates.forEach(c => {
      if (c.logs && Array.isArray(c.logs)) {
        c.logs.forEach((log: any) => {
          allLogs.push({
            timestamp: log.timestamp || c.registeredAt || new Date().toISOString(),
            candidateName: c.fullName || 'Thí sinh',
            candidatePhone: c.phone || '',
            action: log.action || 'Thao tác',
            details: log.details || ''
          });
        });
      }
    });

    // Sort descending by timestamp
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-indigo-950 uppercase tracking-tight">Nhật ký hoạt động</h2>
          <p className="text-xs text-slate-500">Ghi nhận chi tiết tất cả hành động chuyển tab, nộp bài, rời phòng thi của thí sinh theo thời gian thực.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lịch sử sự kiện ({allLogs.length})</h3>
          </div>

          <div className="overflow-x-auto">
            {allLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Chưa ghi nhận hoạt động nào từ hệ thống.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider font-mono">
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Thí sinh</th>
                    <th className="py-3 px-4">Sự kiện</th>
                    <th className="py-3 px-4">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {allLogs.slice(0, 100).map((log, idx) => {
                    const timeStr = new Date(log.timestamp).toLocaleString('vi-VN');
                    let badgeColor = 'bg-slate-100 text-slate-700';
                    if (log.action.toLowerCase().includes('cheat') || log.action.toLowerCase().includes('switch') || log.action.toLowerCase().includes('exit')) {
                      badgeColor = 'bg-rose-100 text-rose-700 border border-rose-200 font-extrabold';
                    } else if (log.action.toLowerCase().includes('submit') || log.action.toLowerCase().includes('finish')) {
                      badgeColor = 'bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold';
                    } else if (log.action.toLowerCase().includes('start')) {
                      badgeColor = 'bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold';
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{timeStr}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{log.candidateName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{log.candidatePhone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide select-none ${badgeColor}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {allLogs.length > 100 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400 italic">
              Hiển thị tối đa 100 nhật ký hoạt động gần nhất.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSettingsManager = () => {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-indigo-950 uppercase tracking-tight">Cấu hình hệ thống</h2>
          <p className="text-xs text-slate-500">Tùy chỉnh giao diện, thông tin giáo viên, API Key quét đề bằng AI và mật khẩu quản trị viên.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Config Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-900" /> Cấu hình thương hiệu & Liên hệ
            </h3>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Tên website</label>
                  <input
                    type="text"
                    placeholder="English Placement"
                    value={websiteName}
                    onChange={(e) => setWebsiteName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Khẩu hiệu (Slogan)</label>
                  <input
                    type="text"
                    placeholder="Your English Journey Starts Here."
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Logo URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Favicon URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/favicon.ico"
                    value={favicon}
                    onChange={(e) => setFavicon(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Màu chính (Primary Color)</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-8 p-0 border border-slate-200 rounded-lg cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Màu phụ (Secondary Color)</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-8 p-0 border border-slate-200 rounded-lg cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Tên Giáo viên</label>
                  <input
                    type="text"
                    placeholder="Teacher Anna"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">SĐT Giáo viên</label>
                  <input
                    type="text"
                    placeholder="0987.654.321"
                    value={teacherPhone}
                    onChange={(e) => setTeacherPhone(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Email Giáo viên</label>
                  <input
                    type="email"
                    placeholder="teacher@english.edu.vn"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Số Zalo hỗ trợ</label>
                  <input
                    type="text"
                    placeholder="0987.654.321"
                    value={teacherZalo}
                    onChange={(e) => setTeacherZalo(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Facebook URL</label>
                  <input
                    type="text"
                    placeholder="https://facebook.com/teacher.anna"
                    value={teacherFacebook}
                    onChange={(e) => setTeacherFacebook(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Website URL</label>
                  <input
                    type="text"
                    placeholder="https://placement.edu.vn"
                    value={teacherWebsite}
                    onChange={(e) => setTeacherWebsite(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">Địa chỉ liên hệ</label>
                <input
                  type="text"
                  placeholder="123 Đường Láng, Đống Đa, Hà Nội"
                  value={teacherAddress}
                  onChange={(e) => setTeacherAddress(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  GEMINI_API_KEY <span className="text-[9px] text-indigo-700 font-bold lowercase">(Mã quét đề AI)</span>
                </label>
                <input
                  type="password"
                  placeholder="AI Gemini API Key"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={settingsLoading}
                className="bg-indigo-900 hover:bg-indigo-850 disabled:bg-slate-300 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md transition-colors cursor-pointer mt-2 w-full"
              >
                {settingsLoading ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            {/* CEFR Range Slider Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" /> Ngưỡng phân loại trình độ CEFR
              </h3>
              <p className="text-xs text-slate-500">Điều chỉnh mức điểm tối đa (percentage) để AI tự động xếp loại năng lực học sinh.</p>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Ngưỡng A1 (Tối đa)</span>
                    <span className="text-indigo-900">{cefrA1Max}% (Khoảng: 0% - {cefrA1Max}%)</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={cefrA1Max}
                    onChange={(e) => setCefrA1Max(Number(e.target.value))}
                    className="w-full accent-indigo-900 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Ngưỡng A2 (Tối đa)</span>
                    <span className="text-indigo-900">{cefrA2Max}% (Khoảng: {cefrA1Max + 1}% - {cefrA2Max}%)</span>
                  </div>
                  <input
                    type="range"
                    min={cefrA1Max + 1}
                    max="100"
                    value={cefrA2Max}
                    onChange={(e) => setCefrA2Max(Number(e.target.value))}
                    className="w-full accent-indigo-900 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Ngưỡng B1 (Tối đa)</span>
                    <span className="text-indigo-900">{cefrB1Max}% (Khoảng: {cefrA2Max + 1}% - {cefrB1Max}%)</span>
                  </div>
                  <input
                    type="range"
                    min={cefrA2Max + 1}
                    max="100"
                    value={cefrB1Max}
                    onChange={(e) => setCefrB1Max(Number(e.target.value))}
                    className="w-full accent-indigo-900 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Ngưỡng B2 (Tối đa)</span>
                    <span className="text-indigo-900">{cefrB2Max}% (Khoảng: {cefrB1Max + 1}% - {cefrB2Max}%)</span>
                  </div>
                  <input
                    type="range"
                    min={cefrB1Max + 1}
                    max="100"
                    value={cefrB2Max}
                    onChange={(e) => setCefrB2Max(Number(e.target.value))}
                    className="w-full accent-indigo-900 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Ngưỡng C1 (Tối đa)</span>
                    <span className="text-indigo-900">{cefrC1Max}% (Khoảng: {cefrB2Max + 1}% - {cefrC1Max}%)</span>
                  </div>
                  <input
                    type="range"
                    min={cefrB2Max + 1}
                    max="100"
                    value={cefrC1Max}
                    onChange={(e) => setCefrC1Max(Number(e.target.value))}
                    className="w-full accent-indigo-900 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 font-medium">
                  💡 Học sinh đạt kết quả trên <strong className="text-amber-600">{cefrC1Max}%</strong> sẽ tự động được xếp loại trình độ cao nhất <strong className="text-amber-600 font-extrabold">C2</strong>.
                </div>
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600" /> Đổi mật khẩu Admin
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập mật khẩu cũ để xác thực"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập mật khẩu mới"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    required
                    placeholder="Xác nhận mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordChangeLoading}
                  className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md transition-colors cursor-pointer mt-2 w-full"
                >
                  {passwordChangeLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExamsManager = () => {
    const handleLoadJsonTemplate = () => {
      const template = {
        "listeningPart1": [
          {
            "id": "l1_1",
            "type": "mcq",
            "text": "What is the speaker's main occupation?",
            "options": ["Teacher", "Engineer", "Doctor"],
            "answer": "B"
          }
        ],
        "listeningPart2": [
          {
            "id": "l2_1",
            "type": "blank",
            "text": "The reservation was made for the month of ____.",
            "answer": "September"
          }
        ],
        "speakingReadAloud": {
          "text": "Regular practice is key to mastering a new language. Speak as often as possible and don't be afraid of making mistakes.",
          "wordCount": 20
        },
        "speakingQuestions": [
          { "id": "sp_1", "text": "What is your favorite subject in school and why?" },
          { "id": "sp_2", "text": "Do you prefer studying alone or in a group?" },
          { "id": "sp_3", "text": "Why is learning English important for your future career?" }
        ],
        "grammar": [
          {
            "id": "g_1",
            "type": "mcq",
            "text": "She _______ to school every day.",
            "options": ["go", "goes", "going", "gone"],
            "answer": "B"
          }
        ],
        "vocabulary": [
          {
            "id": "v_1",
            "type": "mcq",
            "text": "The synonym of 'happy' is _______.",
            "options": ["sad", "joyful", "angry", "tired"],
            "answer": "B"
          }
        ],
        "readingPassage": {
          "title": "The Rise of Technology",
          "text": "Technology has evolved rapidly over the past few decades. It has transformed the way we communicate, work, and learn. Today, smartphones and computers are essential tools in daily life, enabling instant connectivity across the globe.",
          "questionsPartA": [
            {
              "id": "r_1",
              "type": "mcq",
              "text": "What has transformed the way we communicate and work?",
              "options": ["Nature", "Technology", "Agriculture", "History"],
              "answer": "B"
            }
          ],
          "questionsPartB": [
            {
              "id": "r_2",
              "type": "mcq",
              "options": ["True", "False", "Not Given"],
              "text": "Technology has remained unchanged over the last few decades.",
              "answer": "False"
            }
          ]
        },
        "writingQuestions": [
          {
            "id": "w_1",
            "text": "Dịch sang tiếng Anh: 'Tôi thích học tiếng Anh cùng bạn bè.'",
            "vietnamese": "Tôi thích học tiếng Anh cùng bạn bè."
          }
        ]
      };
      setExamQuestionsJson(JSON.stringify(template, null, 2));
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-indigo-950 uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-900" /> QUẢN LÝ ĐỀ THI & PHÒNG THI (EXAM MANAGEMENT BOARD)
            </h2>
            <p className="text-xs text-slate-500">Giáo viên tự tạo nhiều đề thi, chỉnh sửa thời gian làm bài, tải file nghe Audio, và sử dụng AI thông minh quét ảnh/file đề để tạo câu hỏi tự động.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Exams List (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm h-fit">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
              <span>DANH SÁCH ĐỀ THI HIỆN TẠI ({exams.length})</span>
            </h3>

            {exams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <FileText className="w-12 h-12 mb-2 stroke-1" />
                <p className="text-xs font-semibold">Chưa có đề thi nào trong hệ thống.</p>
                <p className="text-[10px] text-slate-400">Vui lòng tạo đề thi mới ở biểu mẫu bên phải.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[750px] overflow-y-auto pr-1">
                {exams.map((ex) => (
                  <div 
                    key={ex.id} 
                    className={`p-4 border rounded-xl transition-all relative ${
                      editingExamId === ex.id 
                        ? 'border-indigo-950 bg-indigo-50/20' 
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="pr-12">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">{ex.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{ex.description || 'Không có mô tả.'}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        <span className="text-[9px] px-2 py-0.5 bg-slate-200 text-slate-700 font-mono font-bold rounded-md">
                          Thời gian: {ex.durationMinutes} phút
                        </span>
                        <span className="text-[9px] px-2 py-0.5 bg-indigo-50 text-indigo-900 border border-indigo-100 font-mono font-bold rounded-md">
                          ID: {ex.id}
                        </span>
                      </div>

                      <div className="mt-2 text-[9px] text-slate-400 font-mono space-y-0.5">
                        <div>Audio 1: {ex.audio1Url ? '✅ Đã cài đặt' : '❌ Chưa có'}</div>
                        <div>Audio 2: {ex.audio2Url ? '✅ Đã cài đặt' : '❌ Chưa có'}</div>
                        <div>Tổng số câu hỏi: {
                          (ex.questions?.listeningPart1?.length || 0) +
                          (ex.questions?.listeningPart2?.length || 0) +
                          (ex.questions?.grammar?.length || 0) +
                          (ex.questions?.vocabulary?.length || 0) +
                          (ex.questions?.readingPassage?.questionsPartA?.length || 0) +
                          (ex.questions?.readingPassage?.questionsPartB?.length || 0) +
                          (ex.questions?.writingQuestions?.length || 0) + 
                          (ex.questions?.speakingQuestions?.length || 0 ? 4 : 0) // read aloud + interview
                        } câu</div>
                      </div>
                    </div>

                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      <button
                        onClick={() => handleSelectEditExam(ex)}
                        className="p-1.5 bg-white border border-slate-200 text-indigo-900 hover:bg-indigo-50 rounded-lg shadow-xs transition-colors cursor-pointer"
                        title="Sửa đề thi"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      
                      {ex.id !== 'default-exam' && (
                        <button
                          onClick={() => handleAdminDeleteExam(ex.id, ex.title)}
                          className="p-1.5 bg-white border border-red-200 text-rose-600 hover:bg-rose-50 rounded-lg shadow-xs transition-colors cursor-pointer"
                          title="Xóa đề thi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Tabbed interface for participants or edit settings */}
          <div className="lg:col-span-7 space-y-6">
            {editingExamId ? (
              <>
                {/* Active Exam Header info with sub-tabs */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] bg-indigo-100 text-indigo-900 border border-indigo-200 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">Kỳ thi đang chọn</span>
                      <h4 className="text-base font-black text-indigo-950 uppercase tracking-wide mt-1">{examTitle}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{examDesc || 'Không có mô tả.'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingExamId(null);
                        setExamTitle('');
                        setExamDesc('');
                        setExamDuration(60);
                        setExamAudio1Url('');
                        setExamAudio2Url('');
                        setExamQuestionsJson('');
                      }}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                    >
                      Hủy chọn / Tạo mới
                    </button>
                  </div>
                </div>

                {renderAIScanner()}

                    {/* Main Edit Form */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-900" />
                        <span>CẬP NHẬT ĐỀ THI & THỜI GIAN</span>
                      </h3>

                      <form onSubmit={handleUpdateExam} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2 space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Tiêu đề đề thi</label>
                            <input
                              type="text"
                              required
                              placeholder="Ví dụ: Đề thi thử năng lực tiếng Anh B1 - Kỳ thi tháng 7"
                              value={examTitle}
                              onChange={(e) => setExamTitle(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all font-semibold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Thời gian làm bài (Phút)</label>
                            <input
                              type="number"
                              required
                              min={15}
                              max={180}
                              value={examDuration}
                              onChange={(e) => setExamDuration(parseInt(e.target.value) || 60)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Mô tả đề thi</label>
                          <textarea
                            placeholder="Mô tả tóm tắt mục tiêu đề thi hoặc đối tượng học sinh hướng tới..."
                            value={examDesc}
                            onChange={(e) => setExamDesc(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">File Nghe Audio 1 (Part 1)</label>
                            <input
                              type="text"
                              placeholder="Nhập link audio hoặc tải file bên dưới..."
                              value={examAudio1Url}
                              onChange={(e) => setExamAudio1Url(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all font-mono mb-1.5"
                            />
                            <label className="inline-flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded cursor-pointer transition-colors font-bold">
                              <Download className="w-3 h-3 transform rotate-180" /> Tải lên Audio 1
                              <input 
                                type="file" 
                                accept="audio/*" 
                                className="hidden" 
                                onChange={(e) => handleUploadAudio(e, 1)} 
                              />
                            </label>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">File Nghe Audio 2 (Part 2)</label>
                            <input
                              type="text"
                              placeholder="Nhập link audio hoặc tải file bên dưới..."
                              value={examAudio2Url}
                              onChange={(e) => setExamAudio2Url(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all font-mono mb-1.5"
                            />
                            <label className="inline-flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded cursor-pointer transition-colors font-bold">
                              <Download className="w-3 h-3 transform rotate-180" /> Tải lên Audio 2
                              <input 
                                type="file" 
                                accept="audio/*" 
                                className="hidden" 
                                onChange={(e) => handleUploadAudio(e, 2)} 
                              />
                            </label>
                          </div>
                        </div>

                        {/* Visual Question Builder */}
                        <div className="border-t border-slate-100 pt-4">
                          {renderVisualQuestionBuilder()}
                        </div>



                        <div className="flex gap-3 pt-3 border-t border-slate-100">
                          <button
                            type="submit"
                            disabled={examLoading}
                            className="flex-1 bg-indigo-900 hover:bg-indigo-850 disabled:bg-indigo-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {examLoading ? 'Đang xử lý...' : 'LƯU THAY ĐỔI'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </>
            ) : (
              /* NO EXAM SELECTED - DISPLAY EXPLANATION BANNER & MANUAL CREATE FORM */
              <>
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-2">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">CHƯA CHỌN ĐỀ THI</h4>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                    Vui lòng nhấn trực tiếp vào một đề thi ở danh sách bên trái để xem danh sách thí sinh làm bài, reset lượt thi dở hoặc chỉnh sửa cấu trúc đề thi.
                  </p>
                </div>

                {renderAIScanner()}

                {/* Main Create Form */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-900" />
                    <span>TẠO ĐỀ THI MỚI</span>
                  </h3>

                  <form onSubmit={handleCreateExam} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Tiêu đề đề thi</label>
                        <input
                          type="text"
                          required
                          placeholder="Ví dụ: Đề thi thử năng lực tiếng Anh B1 - Kỳ thi tháng 7"
                          value={examTitle}
                          onChange={(e) => setExamTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Thời gian làm bài (Phút)</label>
                        <input
                          type="number"
                          required
                          min={15}
                          max={180}
                          value={examDuration}
                          onChange={(e) => setExamDuration(parseInt(e.target.value) || 60)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Mô tả đề thi</label>
                      <textarea
                        placeholder="Mô tả tóm tắt mục tiêu đề thi hoặc đối tượng học sinh hướng tới..."
                        value={examDesc}
                        onChange={(e) => setExamDesc(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">File Nghe Audio 1 (Part 1)</label>
                        <input
                          type="text"
                          placeholder="Nhập link audio hoặc tải file bên dưới..."
                          value={examAudio1Url}
                          onChange={(e) => setExamAudio1Url(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all font-mono mb-1.5"
                        />
                        <label className="inline-flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded cursor-pointer transition-colors font-bold">
                          <Download className="w-3 h-3 transform rotate-180" /> Tải lên Audio 1
                          <input 
                            type="file" 
                            accept="audio/*" 
                            className="hidden" 
                            onChange={(e) => handleUploadAudio(e, 1)} 
                          />
                        </label>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">File Nghe Audio 2 (Part 2)</label>
                        <input
                          type="text"
                          placeholder="Nhập link audio hoặc tải file bên dưới..."
                          value={examAudio2Url}
                          onChange={(e) => setExamAudio2Url(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 text-xs transition-all font-mono mb-1.5"
                        />
                        <label className="inline-flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded cursor-pointer transition-colors font-bold">
                          <Download className="w-3 h-3 transform rotate-180" /> Tải lên Audio 2
                          <input 
                            type="file" 
                            accept="audio/*" 
                            className="hidden" 
                            onChange={(e) => handleUploadAudio(e, 2)} 
                          />
                        </label>
                      </div>
                    </div>

                    {/* Visual Question Builder */}
                    <div className="border-t border-slate-100 pt-4">
                      {renderVisualQuestionBuilder()}
                    </div>


                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={examLoading}
                        className="flex-1 bg-indigo-900 hover:bg-indigo-850 disabled:bg-indigo-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {examLoading ? 'Đang xử lý...' : 'LƯU ĐỀ THI'}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    );
  };

  return (
    <div id="admin-dashboard-wrapper" className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Admin Navigation Header */}
      <nav className="bg-indigo-950 text-white py-4 px-6 shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-amber-400 text-indigo-950 font-black text-xs px-2.5 py-1 rounded-md">ADMIN</span>
            <h1 className="text-lg font-bold tracking-tight">Placement Test Administration</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button
              onClick={onBackToTest}
              className="text-xs bg-indigo-900 hover:bg-indigo-800 text-slate-200 font-bold py-2 px-4 rounded-lg border border-indigo-800 transition-colors cursor-pointer"
            >
              Xem trang thi
            </button>
            <button
              onClick={handleLogout}
              className="text-xs bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      {/* Secondary Sub-navigation Tab Bar */}
      <div className="bg-white border-b border-slate-200 py-3 px-6 select-none shadow-xs shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-1 sm:pb-0">
            <button
              onClick={() => {
                setAdminTab('exams');
                setViewingDetailId(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                adminTab === 'exams'
                  ? 'bg-indigo-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Kỳ thi ({exams.length})
            </button>

            <button
              onClick={() => {
                setAdminTab('candidates');
                setViewingDetailId(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                adminTab === 'candidates'
                  ? 'bg-indigo-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Thí sinh ({stats.total})
            </button>

            <button
              onClick={() => {
                setAdminTab('materials');
                setViewingDetailId(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                adminTab === 'materials'
                  ? 'bg-indigo-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Tài liệu ({materials.length})
            </button>

            <button
              onClick={() => {
                setAdminTab('settings');
                setViewingDetailId(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                adminTab === 'settings'
                  ? 'bg-indigo-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Setting
            </button>

            <button
              onClick={() => {
                setAdminTab('logs');
                setViewingDetailId(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                adminTab === 'logs'
                  ? 'bg-indigo-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Nhật ký
            </button>
          </div>
          <p className="text-[10px] text-slate-400 font-mono self-end sm:self-auto">
            Role: Head Teacher / Admin
          </p>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex-grow space-y-8">
        
        {adminTab === 'candidates' ? (
          !viewingDetailId ? (
          <>
            {/* SIMPLIFIED REGISTERED CANDIDATES ROSTER */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              
              {/* Header Filters & Searches */}
              <div className="flex flex-col sm:flex-row justify-between items-center pb-5 border-b border-slate-100 gap-4 mb-5">
                <div>
                  <h3 className="font-bold text-slate-800 uppercase tracking-wide text-sm">
                    Quản lý học sinh đăng nhập
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">Danh sách học sinh đã khởi tạo tài khoản thi trên hệ thống.</p>
                </div>

                <div className="w-full sm:w-auto flex flex-wrap items-center gap-3">
                  {/* Search box */}
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm theo tên, SĐT..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-900 focus:outline-none"
                    />
                  </div>

                  {/* Exam Filter Dropdown */}
                  <select
                    value={filterExamId}
                    onChange={(e) => setFilterExamId(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-900 focus:outline-none bg-white font-semibold text-slate-700"
                  >
                    <option value="all">Tất cả kỳ thi (All Exams)</option>
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.title}</option>
                    ))}
                  </select>

                  {/* Completion Status Dropdown */}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-900 focus:outline-none bg-white font-semibold text-slate-700"
                  >
                    <option value="all">Tất cả trạng thái (All Status)</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="active">Đang làm bài</option>
                  </select>

                  {/* Export button */}
                  <button
                    onClick={exportToCSV}
                    disabled={candidates.length === 0}
                    className="flex items-center gap-1.5 bg-indigo-900 hover:bg-indigo-850 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold px-4 py-2 rounded-xl border border-indigo-950 cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </button>
                </div>
              </div>

              {/* Candidates Grouped by Exam List */}
              <div className="space-y-6">
                {Object.keys(candidatesByExam).length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm italic">
                    Chưa có thí sinh nào đăng nhập hoặc khớp với điều kiện tìm kiếm.
                  </div>
                ) : (
                  Object.entries(candidatesByExam).map(([examId, candList]) => {
                    const list = candList as CandidateSummary[];
                    const exam = exams.find(e => e.id === examId);
                    const examTitle = exam ? exam.title : `Đề thi: ${examId}`;
                    return (
                      <div key={examId} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                        <div className="bg-indigo-50/50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <span className="text-[10px] bg-indigo-100 text-indigo-900 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">Kỳ thi (Exam)</span>
                            <h4 className="font-bold text-slate-900 text-xs md:text-sm mt-0.5">
                              🏆 {examTitle}
                            </h4>
                          </div>
                          <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-150 shrink-0">
                            {list.length} thí sinh
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Học sinh</th>
                                <th className="py-3 px-4">Số điện thoại</th>
                                <th className="py-3 px-4">Thời gian đăng ký</th>
                                <th className="py-3 px-4">Trạng thái bài thi</th>
                                <th className="py-3 px-4 text-center">Trạng thái khóa</th>
                                <th className="py-3 px-4 text-right">Hành động</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                              {list.map((c) => {
                                return (
                                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-4">
                                      <span className="font-bold text-slate-900 text-sm block">{c.fullName}</span>
                                      <span className="text-[10px] text-slate-400 font-mono tracking-wide">ID: {c.id}</span>
                                    </td>
                                    <td className="py-4 px-4 font-mono font-bold text-indigo-950">{c.phone}</td>
                                    <td className="py-4 px-4">
                                      {new Date(c.registeredAt).toLocaleTimeString('vi-VN')} {new Date(c.registeredAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="py-4 px-4">
                                      {c.submittedAt ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-150">
                                          ✓ Đã nộp ({c.scores ? `${c.scores.total}/${c.scores.maxPossible}đ` : 'Chưa chấm'})
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-150 animate-pulse">
                                          •• Đang thi / Chưa nộp
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                      {c.isLocked ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                          <Lock className="w-3 h-3 text-rose-700" /> ĐÃ KHÓA
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-150">
                                          <Unlock className="w-3 h-3 text-emerald-600" /> HOẠT ĐỘNG
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                      <div className="flex justify-end items-center gap-2">
                                        <button
                                          onClick={() => handleViewDetail(c.id)}
                                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1"
                                          title="Xem chi tiết bài làm & Chấm điểm"
                                        >
                                          <Eye className="w-3.5 h-3.5" /> Xem bài làm
                                        </button>
                                        <button
                                          onClick={() => handleResetCandidate(c.id, c.fullName)}
                                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1"
                                          title="Reset kết quả để thi lại từ đầu"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5" /> Reset
                                        </button>
                                        <button
                                          onClick={() => handleToggleLockPhone(c.phone, !!c.isLocked)}
                                          disabled={lockLoadingPhone === c.phone}
                                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                            c.isLocked 
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-250 hover:bg-emerald-100' 
                                              : 'bg-rose-50 text-rose-700 border-rose-250 hover:bg-rose-100'
                                          }`}
                                          title={c.isLocked ? "Mở khóa thí sinh" : "Khóa thí sinh"}
                                        >
                                          {c.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                          {c.isLocked ? "Mở khóa" : "Khóa"}
                                        </button>
                                        <button
                                          onClick={() => handleDeleteCandidate(c.id, c.fullName)}
                                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg hover:shadow-xs transition-colors cursor-pointer flex items-center gap-1 font-bold"
                                          title="Xóa vĩnh viễn học sinh này"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" /> Xóa
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </>
        ) : (
          /* ================= CANDIDATE DETAILS VIEW PANEL ================= */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 space-y-8">
            
            {/* Header section with back button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-150 pb-5 gap-3">
              <button
                onClick={handleCloseDetail}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold text-sm bg-slate-100 px-4 py-2 rounded-xl transition-colors cursor-pointer select-none"
              >
                <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
              </button>
              
              {!selectedCandidate ? (
                <div className="animate-pulse text-indigo-900 font-bold text-sm">Đang tải chi tiết thí sinh...</div>
              ) : (
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 text-right">
                  <div className="flex gap-2 mr-0 sm:mr-4">
                    <button
                      onClick={() => handleResetCandidate(selectedCandidate.id, selectedCandidate.fullName)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl font-bold text-xs cursor-pointer shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset Bài Thi
                    </button>
                    <button
                      onClick={() => handleDeleteCandidate(selectedCandidate.id, selectedCandidate.fullName)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa Thí Sinh
                    </button>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">{selectedCandidate.fullName}</h2>
                    <p className="text-sm font-mono text-slate-500 font-bold">Số điện thoại: {selectedCandidate.phone} | ID: {selectedCandidate.id}</p>
                  </div>
                </div>
              )}
            </div>

            {selectedCandidate && (
              <div className="space-y-8">
                
                {/* 1. CANDIDATE TIME & LOG METRICS CARD */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">THỜI GIAN LÀM BÀI CHI TIẾT</h4>
                    <div className="mt-1.5 space-y-1 text-xs font-semibold text-slate-700">
                      <div>Đăng ký: {new Date(selectedCandidate.registeredAt).toLocaleString('vi-VN')}</div>
                      <div>Bắt đầu: {selectedCandidate.startedAt ? new Date(selectedCandidate.startedAt).toLocaleString('vi-VN') : '-'}</div>
                      <div>Nộp bài: {selectedCandidate.submittedAt ? new Date(selectedCandidate.submittedAt).toLocaleString('vi-VN') : 'Chưa nộp'}</div>
                      <div>Tổng thời gian thi: <strong className="text-indigo-950">{formatDuration(selectedCandidate.durationSeconds)}</strong></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">CHỈ SỐ CHỐNG GIAN LẬN (ANTI-CHEAT INDEX)</h4>
                    <div className="mt-2 space-y-2">
                      {countTabSwitches(selectedCandidate) > 0 ? (
                        <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r-xl space-y-1 text-xs text-rose-950 font-medium">
                          <div className="flex items-center gap-1.5 font-extrabold text-rose-800">
                            <ShieldAlert className="w-4 h-4 text-rose-600 animate-bounce" /> PHÁT HIỆN NGHI VẤN GIAN LẬN!
                          </div>
                          <p className="leading-snug">
                            Thí sinh này đã chuyển tab, mở tài liệu ngoài hoặc thoát chế độ thi <strong className="text-rose-700 font-bold underline">{countTabSwitches(selectedCandidate)} lần</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded-r-xl space-y-1 text-xs text-emerald-950 font-medium">
                          <div className="flex items-center gap-1.5 font-extrabold text-emerald-800">
                            <CheckCircle className="w-4 h-4 text-emerald-600" /> TRUNG THỰC & AN TOÀN
                          </div>
                          <p className="leading-snug text-[11px] text-emerald-800/90">
                            Thí sinh không thực hiện hành vi chuyển tab hay thoát trang nào trong suốt bài thi.
                          </p>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 leading-normal pt-1">
                        * Chi tiết các mốc thời gian chuyển tab và vi phạm được ghi lại đầy đủ trong Nhật ký hoạt động bên phải.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">TỔNG ĐIỂM CHƯA GỒM VIẾT</h4>
                    {selectedCandidate.scores ? (
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="text-3xl font-black text-indigo-900 font-mono bg-indigo-50 border border-indigo-150 p-2.5 rounded-xl">
                          {selectedCandidate.scores.total} <span className="text-xs font-normal text-slate-400">/ 85</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-500">Tỷ lệ chính xác</div>
                          <div className="text-base font-black text-emerald-700">{selectedCandidate.scores.percentage}%</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic mt-2">Thí sinh chưa nộp bài thi chính thức.</div>
                    )}
                  </div>
                </div>

                {/* AI PLACEMENT RECOMMENDATION */}
                {selectedCandidate.scores && (
                  <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 text-white rounded-2xl p-6 border border-indigo-800 shadow-lg space-y-4 relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-center gap-2 border-b border-indigo-800/80 pb-3">
                      <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                      <h3 className="font-extrabold text-xs uppercase tracking-wider text-indigo-100">ĐỀ XUẤT TRÌNH ĐỘ TIẾNG ANH CỦA AI (AI PLACEMENT RECOMMENDATION)</h3>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="flex flex-col items-center justify-center bg-indigo-950/80 border border-indigo-800 px-6 py-5 rounded-2xl shadow-inner shrink-0 text-center min-w-[200px]">
                        <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest block mb-1">RECOMMENDED CLASS</span>
                        <div className="text-4xl font-black text-amber-400 font-mono tracking-tight">
                          {selectedCandidate.scores.total <= 30 ? 'A1' :
                           selectedCandidate.scores.total <= 50 ? 'A2' :
                           selectedCandidate.scores.total <= 65 ? 'B1' :
                           selectedCandidate.scores.total <= 78 ? 'B2' : 'C1'}
                        </div>
                        <span className="text-[11px] font-bold text-white mt-1">
                          {selectedCandidate.scores.total <= 30 ? 'Lớp Starter / Elementary' :
                           selectedCandidate.scores.total <= 50 ? 'Lớp Pre-Intermediate' :
                           selectedCandidate.scores.total <= 65 ? 'Lớp Intermediate' :
                           selectedCandidate.scores.total <= 78 ? 'Lớp Upper-Intermediate' : 'Lớp Advanced'}
                        </span>
                      </div>

                      <div className="space-y-2 flex-grow text-sm leading-relaxed text-indigo-100/95 font-sans">
                        <p className="font-bold text-amber-400 text-xs">Phân tích kết quả kiểm tra năng lực tự động:</p>
                        <ul className="text-xs space-y-1.5 list-disc list-inside font-medium text-justify">
                          <li>
                            Tổng điểm đánh giá đạt <strong className="text-white font-mono">{selectedCandidate.scores.total} / {selectedCandidate.scores.maxPossible}</strong> (Tỉ lệ chính xác <strong className="text-white font-mono">{selectedCandidate.scores.percentage}%</strong>).
                          </li>
                          <li>
                            Trắc nghiệm Đọc hiểu, Ngữ pháp & Từ vựng: Đúng <strong className="text-white font-mono">{selectedCandidate.scores.reading} / 6</strong> câu Reading, <strong className="text-white font-mono">{selectedCandidate.scores.grammar} / 30</strong> câu Ngữ pháp, và <strong className="text-white font-mono">{selectedCandidate.scores.vocabulary} / 22</strong> câu Từ vựng.
                          </li>
                          <li>
                            Kỹ năng Nghe (Listening): Đúng <strong className="text-white font-mono">{selectedCandidate.scores.listening} / 17</strong> câu hỏi.
                          </li>
                          <li>
                            Kỹ năng Nói (Speaking): Thí sinh đã hoàn thành ghi âm các phần thi nói.
                          </li>
                          <li>
                            Kỹ năng Viết (Writing): Điểm viết do Giáo viên chấm là <strong className="text-white font-mono">{selectedCandidate.writingScore} / 10</strong> điểm.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ACTIVITY CHRONOLOGICAL LOGS */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-indigo-950" /> NHẬT KÝ HOẠT ĐỘNG THÍ SINH (LOGS)
                  </h4>
                  <div className="max-h-[150px] overflow-y-auto space-y-1.5 pr-2">
                    {selectedCandidate.logs?.map((l: any, index: number) => (
                      <div key={index} className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-50 py-1 font-mono">
                        <span className="font-bold text-slate-700">{l.action}</span>
                        <span className="text-slate-400 shrink-0 ml-4">{new Date(l.timestamp).toLocaleTimeString('vi-VN')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. SPEAKING EVALUATOR BOARD */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2.5 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-indigo-900" /> QUẢN LÝ BÀI THI SPEAKING (SPEAKING MANAGEMENT)
                  </h4>

                  {(() => {
                    const candidateExam = exams.find(e => e.id === selectedCandidate.examId);
                    const readAloudText = candidateExam?.questions?.speakingReadAloud?.text || "Many people think that learning a new language is difficult. However, with regular practice, it becomes much easier. The key is to speak as much as possible, even if you make mistakes. Reading short stories and watching English movies also help to build vocabulary quickly.";
                    const spQuestions = candidateExam?.questions?.speakingQuestions || [];
                    
                    return (
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-4">
                          
                          {/* Part 1 */}
                          <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                            <h5 className="font-bold text-xs text-indigo-950 mb-2 uppercase">Bài 1: Đọc to đoạn văn</h5>
                            
                            {/* Target source text display */}
                            <div className="bg-indigo-50/40 border border-indigo-100 p-3.5 rounded-lg mb-3">
                              <span className="text-[10px] uppercase font-bold text-indigo-900 block mb-1">Văn bản cần đọc (Source Reading Passage):</span>
                              <p className="text-xs text-slate-800 leading-relaxed font-serif">"{readAloudText}"</p>
                            </div>

                            {selectedCandidate.answers?.speakingPart1?.audioPath && selectedCandidate.answers.speakingPart1.audioPath.trim() !== '' ? (
                              <div className="space-y-3">
                                <SecureAudioPlayer src={selectedCandidate.answers.speakingPart1.audioPath} controls className="w-full h-9 rounded-lg" preload="metadata" />
                                <SecureAudioDownloadButton
                                  src={selectedCandidate.answers.speakingPart1.audioPath}
                                  fileName={`speaking_p1_${selectedCandidate.fullName}.webm`}
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Thí sinh không làm hoặc không có file ghi âm.</span>
                            )}
                          </div>

                          {/* Part 2 interview audios */}
                          <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-4">
                            <h5 className="font-bold text-xs text-indigo-950 border-b border-slate-250 pb-1 uppercase">Bài 2: Ghi âm Trả lời 3 Câu hỏi</h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {Array.from({ length: 3 }).map((_, idx) => {
                                const qText = spQuestions[idx]?.text || (
                                  idx === 0 ? "Do you like watching movies?" :
                                  idx === 1 ? "Is it important to play sports?" :
                                  "Why do many young people prefer living in the cities?"
                                );
                                const audioKey = `sp_${idx + 1}_audioPath` as keyof typeof selectedCandidate.answers.speakingPart2;
                                const audioPath = selectedCandidate.answers?.speakingPart2?.[audioKey];

                                return (
                                  <div key={idx} className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-150 flex flex-col justify-between">
                                    <div>
                                      <p className="text-[10px] text-slate-400 font-extrabold uppercase shrink-0">CÂU {idx + 1}</p>
                                      <p className="text-xs font-bold text-slate-800 leading-snug my-1 italic shrink-0">"{qText}"</p>
                                    </div>
                                    <div className="pt-2">
                                      {audioPath && audioPath.trim() !== '' ? (
                                        <div className="space-y-2">
                                          <SecureAudioPlayer src={audioPath} controls className="w-full h-8" preload="metadata" />
                                          <SecureAudioDownloadButton
                                            src={audioPath}
                                            fileName={`speaking_p2_q${idx + 1}_${selectedCandidate.fullName}.webm`}
                                          />
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic block">Không có ghi âm</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 4. WRITING MANAGEMENT PANEL */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2.5 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-950" /> QUẢN LÝ VÀ CHẤM ĐIỂM WRITING (WRITING MANAGEMENT)
                  </h4>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* View answers */}
                    <div className="lg:col-span-7 space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {WRITING_QUESTIONS.map((q, idx) => {
                        const answer = selectedCandidate.answers?.writing?.[q.id] || '';
                        const isSkipped = answer === '__SKIPPED__';
                        const note = selectedCandidate.answers?.writing?.[`__NOTE__${q.id}`] || '';
                        return (
                          <div key={q.id} className={`p-3.5 border rounded-lg space-y-1.5 text-xs transition-all ${
                            isSkipped ? 'bg-amber-50/20 border-amber-200' : 'bg-slate-50 border-slate-150'
                          }`}>
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                              <span className="flex items-center gap-1">
                                CÂU HỎI {idx + 1}
                                {isSkipped && (
                                  <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-extrabold uppercase text-[8px] flex items-center gap-0.5">
                                    <ShieldAlert className="w-2.5 h-2.5 text-amber-600" /> Đã bỏ qua
                                  </span>
                                )}
                              </span>
                              <span className="text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">Vietnamese</span>
                            </div>
                            <p className="font-bold text-slate-800 font-sans">{q.vietnamese}</p>
                            
                            <div className="pt-2 border-t border-slate-200/60">
                              <span className="text-[10px] font-bold text-indigo-900 block mb-1">BÀI LÀM CỦA THÍ SINH:</span>
                              {isSkipped ? (
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-950 font-sans leading-relaxed">
                                  <span className="font-extrabold block text-[9px] text-amber-600 uppercase">HỌC SINH ĐÃ CHỌN BỎ QUA CÂU NÀY:</span>
                                  <span className="italic font-bold block mt-1">
                                    Lý do: {note || <span className="font-normal text-slate-400">Không có lý do ghi chú.</span>}
                                  </span>
                                </div>
                              ) : (
                                <p className="font-sans italic text-slate-700 bg-white p-2.5 rounded border border-slate-200 select-all leading-relaxed whitespace-pre-wrap font-medium">
                                  {answer ? `"${answer}"` : <span className="text-red-500 font-normal">Thí sinh bỏ trống không làm câu này.</span>}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Grade box */}
                    <form className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4" onSubmit={handleGradeWriting}>
                      <h5 className="font-bold text-xs text-indigo-950 uppercase border-b border-slate-200 pb-2">CHẤM ĐIỂM THỦ CÔNG</h5>

                      {gradingSuccess && (
                        <div className="bg-green-50 text-green-700 p-3 rounded-xl border border-green-200 text-[11px] font-bold flex items-center gap-1">
                          <Check className="w-4 h-4" /> Đã lưu điểm và cập nhật học lực thí sinh thành công!
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Điểm thi viết (Thang điểm từ 0 đến 10)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="10"
                          required
                          value={writingScore}
                          onChange={(e) => setWritingScore(parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm font-bold text-indigo-950 focus:outline-none focus:ring-1 focus:ring-indigo-900"
                        />
                        <p className="text-[9px] text-slate-400 leading-normal">* Mỗi câu viết được cộng tối đa 1 điểm.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Nhận xét chi tiết của giáo viên</label>
                        <textarea
                          rows={6}
                          placeholder="Nhập nhận xét của giáo viên..."
                          value={writingComment}
                          onChange={(e) => setWritingComment(e.target.value)}
                          className="w-full p-3 border border-slate-200 bg-white rounded-xl text-xs font-sans text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-900 resize-y"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={gradingLoading}
                        className="w-full bg-indigo-900 hover:bg-indigo-850 disabled:bg-indigo-300 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors shadow"
                      >
                        <Save className="w-4 h-4" /> {gradingLoading ? 'Đang lưu điểm...' : 'Lưu điểm và Nhận xét'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* 5. AUTO GRADED QUESTIONS AUDIT DETAILS */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-950" /> CHI TIẾT BÀI LÀM TỪNG CÂU (DETAILED ANSWERS AUDIT)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Xem chi tiết từng câu hỏi, các đáp án học sinh đã chọn và đáp án đúng. Đúng hiện màu xanh lá, sai hiện màu đỏ.
                    </p>
                  </div>

                  {/* Tab switcher */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 select-none">
                    <button
                      type="button"
                      onClick={() => setActiveAuditTab('listening')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        activeAuditTab === 'listening' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Listening ({selectedCandidate.scores?.listening}/17)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAuditTab('grammar')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        activeAuditTab === 'grammar' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Grammar ({selectedCandidate.scores?.grammar}/30)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAuditTab('vocabulary')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        activeAuditTab === 'vocabulary' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Vocabulary ({selectedCandidate.scores?.vocabulary}/22)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAuditTab('reading')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        activeAuditTab === 'reading' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Reading ({selectedCandidate.scores?.reading}/6)
                    </button>
                  </div>

                  {/* Audit list */}
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {activeAuditTab === 'listening' && (
                      <div className="space-y-4">
                        <div className="text-xs font-black text-indigo-950 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg">
                          PART 1: MULTIPLE CHOICE QUESTIONS (CÂU 1 - 7)
                        </div>
                        {LISTENING_PART_1.map((q, idx) => {
                          const ans = selectedCandidate.answers?.listeningPart1?.[q.id] || '';
                          const isSkipped = ans === '__SKIPPED__';
                          const isCorrect = !isSkipped && ans.trim().toUpperCase() === q.answer.toUpperCase();
                          return (
                            <div key={q.id} className={`p-4 border rounded-xl space-y-3 transition-all ${
                              isCorrect ? 'bg-emerald-50/40 border-emerald-200' :
                              isSkipped ? 'bg-amber-50/20 border-amber-200' :
                              'bg-rose-50/40 border-rose-150'
                            }`}>
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-[10px] text-slate-500 uppercase">Câu {idx + 1} (Listening Part 1)</span>
                                <span className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                                  isCorrect ? 'bg-emerald-100 text-emerald-850' :
                                  isSkipped ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {isCorrect ? <Check className="w-3.5 h-3.5" /> : isSkipped ? <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> : <X className="w-3.5 h-3.5" />}
                                  {isCorrect ? 'Chính xác (+1đ)' : isSkipped ? 'Đã bỏ qua (0đ)' : 'Chưa chính xác (0đ)'}
                                </span>
                              </div>
                              <p className="font-bold text-slate-800 text-sm font-sans">{q.text}</p>
                              
                              {isSkipped ? (
                                <div className="p-3 bg-amber-50 border border-amber-150 rounded-lg text-xs text-amber-900">
                                  <span className="font-extrabold block text-[10px] text-amber-600 uppercase">HỌC SINH ĐÃ CHỌN BỎ QUA CÂU NÀY:</span>
                                  <span className="italic font-bold block mt-1">
                                    Lý do: {selectedCandidate.answers?.listeningPart1?.[`__NOTE__${q.id}`] || <span className="font-normal text-slate-400">Không có lý do ghi chú.</span>}
                                  </span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                  {q.options.map((opt, oIdx) => {
                                    const letter = String.fromCharCode(65 + oIdx);
                                    const isSelected = ans.trim().toUpperCase() === letter;
                                    const isCorrectLetter = q.answer.toUpperCase() === letter;
                                    return (
                                      <div key={letter} className={`p-2.5 rounded-lg border font-medium ${
                                        isSelected && isCorrectLetter ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold' :
                                        isSelected && !isCorrectLetter ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold' :
                                        !isSelected && isCorrectLetter ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                        'bg-white border-slate-200 text-slate-600'
                                      }`}>
                                        <span className="font-bold mr-1.5">{letter}.</span> {opt}
                                        {isSelected && <span className="text-[9px] uppercase font-black ml-1.5 text-slate-600">(Đã chọn)</span>}
                                        {isCorrectLetter && <span className="text-[9px] uppercase font-black ml-1.5 text-emerald-700">(Đúng)</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <div className="text-xs font-black text-indigo-950 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg mt-6">
                          PART 2: FILL IN THE BLANKS (CÂU 8 - 17)
                        </div>
                        {LISTENING_PART_2.map((q, idx) => {
                          const ans = selectedCandidate.answers?.listeningPart2?.[q.id] || '';
                          const isSkipped = ans === '__SKIPPED__';
                          const isCorrect = !isSkipped && checkAnswerClient(ans, q.answer);
                          return (
                            <div key={q.id} className={`p-4 border rounded-xl space-y-3 transition-all ${
                              isCorrect ? 'bg-emerald-50/40 border-emerald-200' :
                              isSkipped ? 'bg-amber-50/20 border-amber-200' :
                              'bg-rose-50/40 border-rose-150'
                            }`}>
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-[10px] text-slate-500 uppercase">Câu {idx + 8} (Listening Part 2)</span>
                                <span className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                                  isCorrect ? 'bg-emerald-100 text-emerald-850' :
                                  isSkipped ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {isCorrect ? <Check className="w-3.5 h-3.5" /> : isSkipped ? <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> : <X className="w-3.5 h-3.5" />}
                                  {isCorrect ? 'Chính xác (+1đ)' : isSkipped ? 'Đã bỏ qua (0đ)' : 'Chưa chính xác (0đ)'}
                                </span>
                              </div>
                              <p className="font-bold text-slate-800 text-sm font-sans">{q.text}</p>
                              
                              {isSkipped ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  <div className="p-3 rounded-lg border border-amber-250 bg-amber-50 text-xs text-amber-950">
                                    <span className="font-extrabold block text-[10px] text-amber-600 uppercase">HỌC SINH ĐÃ CHỌN BỎ QUA CÂU NÀY:</span>
                                    <span className="italic font-bold block mt-1">
                                      Lý do: {selectedCandidate.answers?.listeningPart2?.[`__NOTE__${q.id}`] || <span className="font-normal text-slate-400">Không có lý do ghi chú.</span>}
                                    </span>
                                  </div>
                                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 flex flex-col justify-center">
                                    <span className="font-extrabold block text-[10px] text-slate-400 uppercase">ĐÁP ÁN ĐÚNG HOẶC CHẤP NHẬN:</span>
                                    <span className="font-mono text-sm font-bold block mt-0.5 text-emerald-850">"{q.answer}"</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  <div className={`p-3 rounded-lg border text-xs ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                                    <span className="font-extrabold block text-[10px] text-slate-400 uppercase">ĐÁP ÁN HỌC SINH NHẬP:</span>
                                    <span className="font-mono text-sm font-bold block mt-0.5">{ans ? `"${ans}"` : <span className="italic text-slate-400 font-normal">Bỏ trống</span>}</span>
                                  </div>
                                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800">
                                    <span className="font-extrabold block text-[10px] text-slate-400 uppercase">ĐÁP ÁN ĐÚNG HOẶC CHẤP NHẬN:</span>
                                    <span className="font-mono text-sm font-bold block mt-0.5 text-emerald-800">"{q.answer}"</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activeAuditTab === 'grammar' && (
                      <div className="space-y-4">
                        {GRAMMAR_QUESTIONS.map((q, idx) => {
                          const ans = selectedCandidate.answers?.grammar?.[q.id] || '';
                          const isSkipped = ans === '__SKIPPED__';
                          const isCorrect = !isSkipped && (q.type === 'mcq'
                            ? ans.trim().toUpperCase() === q.answer.toUpperCase()
                            : checkAnswerClient(ans, q.answer));
                          
                          return (
                            <div key={q.id} className={`p-4 border rounded-xl space-y-3 transition-all ${
                              isCorrect ? 'bg-emerald-50/40 border-emerald-200' :
                              isSkipped ? 'bg-amber-50/20 border-amber-200' :
                              'bg-rose-50/40 border-rose-150'
                            }`}>
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-[10px] text-slate-500 uppercase">Câu {idx + 1} (Grammar)</span>
                                <span className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                                  isCorrect ? 'bg-emerald-100 text-emerald-850' :
                                  isSkipped ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {isCorrect ? <Check className="w-3.5 h-3.5" /> : isSkipped ? <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> : <X className="w-3.5 h-3.5" />}
                                  {isCorrect ? 'Chính xác (+1đ)' : isSkipped ? 'Đã bỏ qua (0đ)' : 'Chưa chính xác (0đ)'}
                                </span>
                              </div>
                              <p className="font-bold text-slate-800 text-sm font-sans">{q.text}</p>
                              
                              {isSkipped ? (
                                <div className="p-3 bg-amber-50 border border-amber-150 rounded-lg text-xs text-amber-900">
                                  <span className="font-extrabold block text-[10px] text-amber-600 uppercase">HỌC SINH ĐÃ CHỌN BỎ QUA CÂU NÀY:</span>
                                  <span className="italic font-bold block mt-1">
                                    Lý do: {selectedCandidate.answers?.grammar?.[`__NOTE__${q.id}`] || <span className="font-normal text-slate-400">Không có lý do ghi chú.</span>}
                                  </span>
                                </div>
                              ) : q.type === 'mcq' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                                  {q.options?.map((opt, oIdx) => {
                                    const letter = String.fromCharCode(65 + oIdx);
                                    const isSelected = ans.trim().toUpperCase() === letter;
                                    const isCorrectLetter = q.answer.toUpperCase() === letter;
                                    return (
                                      <div key={letter} className={`p-2.5 rounded-lg border font-medium ${
                                        isSelected && isCorrectLetter ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold' :
                                        isSelected && !isCorrectLetter ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold' :
                                        !isSelected && isCorrectLetter ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                        'bg-white border-slate-200 text-slate-600'
                                      }`}>
                                        <span className="font-bold mr-1">{letter}.</span> {opt}
                                        {isSelected && <span className="text-[9px] uppercase font-black ml-1.5 text-slate-600">(Đã chọn)</span>}
                                        {isCorrectLetter && <span className="text-[9px] uppercase font-black ml-1.5 text-emerald-700">(Đúng)</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  <div className={`p-3 rounded-lg border text-xs ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                                    <span className="font-extrabold block text-[10px] text-slate-400 uppercase">ĐÁP ÁN HỌC SINH NHẬP:</span>
                                    <span className="font-mono text-sm font-bold block mt-0.5">{ans ? `"${ans}"` : <span className="italic text-slate-400 font-normal">Bỏ trống</span>}</span>
                                  </div>
                                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800">
                                    <span className="font-extrabold block text-[10px] text-slate-400 uppercase">ĐÁP ÁN ĐÚNG HOẶC CHẤP NHẬN:</span>
                                    <span className="font-mono text-sm font-bold block mt-0.5 text-emerald-800">"{q.answer}"</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activeAuditTab === 'vocabulary' && (
                      <div className="space-y-4">
                        {VOCABULARY_QUESTIONS.map((q, idx) => {
                          const ans = selectedCandidate.answers?.vocabulary?.[q.id] || '';
                          const isSkipped = ans === '__SKIPPED__';
                          const isCorrect = !isSkipped && ans.trim().toUpperCase() === q.answer.toUpperCase();
                          
                          return (
                            <div key={q.id} className={`p-4 border rounded-xl space-y-3 transition-all ${
                              isCorrect ? 'bg-emerald-50/40 border-emerald-200' :
                              isSkipped ? 'bg-amber-50/20 border-amber-200' :
                              'bg-rose-50/40 border-rose-150'
                            }`}>
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-[10px] text-slate-500 uppercase">Câu {idx + 1} (Vocabulary)</span>
                                <span className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                                  isCorrect ? 'bg-emerald-100 text-emerald-850' :
                                  isSkipped ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {isCorrect ? <Check className="w-3.5 h-3.5" /> : isSkipped ? <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> : <X className="w-3.5 h-3.5" />}
                                  {isCorrect ? 'Chính xác (+1đ)' : isSkipped ? 'Đã bỏ qua (0đ)' : 'Chưa chính xác (0đ)'}
                                </span>
                              </div>
                              <p className="font-bold text-slate-800 text-sm font-sans">{q.text}</p>
                              
                              {isSkipped ? (
                                <div className="p-3 bg-amber-50 border border-amber-150 rounded-lg text-xs text-amber-900">
                                  <span className="font-extrabold block text-[10px] text-amber-600 uppercase">HỌC SINH ĐÃ CHỌN BỎ QUA CÂU NÀY:</span>
                                  <span className="italic font-bold block mt-1">
                                    Lý do: {selectedCandidate.answers?.vocabulary?.[`__NOTE__${q.id}`] || <span className="font-normal text-slate-400">Không có lý do ghi chú.</span>}
                                  </span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                                  {q.options.map((opt, oIdx) => {
                                    const letter = String.fromCharCode(65 + oIdx);
                                    const isSelected = ans.trim().toUpperCase() === letter;
                                    const isCorrectLetter = q.answer.toUpperCase() === letter;
                                    return (
                                      <div key={letter} className={`p-2.5 rounded-lg border font-medium ${
                                        isSelected && isCorrectLetter ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold' :
                                        isSelected && !isCorrectLetter ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold' :
                                        !isSelected && isCorrectLetter ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                        'bg-white border-slate-200 text-slate-600'
                                      }`}>
                                        <span className="font-bold mr-1">{letter}.</span> {opt}
                                        {isSelected && <span className="text-[9px] uppercase font-black ml-1.5 text-slate-600">(Đã chọn)</span>}
                                        {isCorrectLetter && <span className="text-[9px] uppercase font-black ml-1.5 text-emerald-700">(Đúng)</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activeAuditTab === 'reading' && (
                      <div className="space-y-4">
                        {/* Reading passage display */}
                        <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-5 mb-4 space-y-3 dark:bg-slate-850 dark:border-amber-900/40">
                          <h6 className="font-extrabold text-sm text-amber-900 dark:text-amber-400 border-b border-amber-200/60 dark:border-amber-900/20 pb-1.5 uppercase">
                            BÀI ĐỌC: {READING_PASSAGE.title}
                          </h6>
                          <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                            {READING_PASSAGE.text}
                          </div>
                        </div>

                        <div className="text-xs font-black text-indigo-950 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg">
                          PART A: MULTIPLE CHOICE QUESTIONS (CÂU 1 - 2)
                        </div>
                        {READING_PASSAGE.questionsPartA.map((q, idx) => {
                          const ans = selectedCandidate.answers?.readingPartA?.[q.id] || '';
                          const isSkipped = ans === '__SKIPPED__';
                          const isCorrect = !isSkipped && ans.trim().toUpperCase() === q.answer.toUpperCase();
                          return (
                            <div key={q.id} className={`p-4 border rounded-xl space-y-3 transition-all ${
                              isCorrect ? 'bg-emerald-50/40 border-emerald-200' :
                              isSkipped ? 'bg-amber-50/20 border-amber-200' :
                              'bg-rose-50/40 border-rose-150'
                            }`}>
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-[10px] text-slate-500 uppercase">Câu {idx + 1} (Reading Part A)</span>
                                <span className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                                  isCorrect ? 'bg-emerald-100 text-emerald-850' :
                                  isSkipped ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {isCorrect ? <Check className="w-3.5 h-3.5" /> : isSkipped ? <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> : <X className="w-3.5 h-3.5" />}
                                  {isCorrect ? 'Chính xác (+1đ)' : isSkipped ? 'Đã bỏ qua (0đ)' : 'Chưa chính xác (0đ)'}
                                </span>
                              </div>
                              <p className="font-bold text-slate-800 text-sm font-sans">{q.text}</p>
                              
                              {isSkipped ? (
                                <div className="p-3 bg-amber-50 border border-amber-150 rounded-lg text-xs text-amber-900">
                                  <span className="font-extrabold block text-[10px] text-amber-600 uppercase">HỌC SINH ĐÃ CHỌN BỎ QUA CÂU NÀY:</span>
                                  <span className="italic font-bold block mt-1">
                                    Lý do: {selectedCandidate.answers?.readingPartA?.[`__NOTE__${q.id}`] || <span className="font-normal text-slate-400">Không có lý do ghi chú.</span>}
                                  </span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                                  {q.options.map((opt, oIdx) => {
                                    const letter = String.fromCharCode(65 + oIdx);
                                    const isSelected = ans.trim().toUpperCase() === letter;
                                    const isCorrectLetter = q.answer.toUpperCase() === letter;
                                    return (
                                      <div key={letter} className={`p-2.5 rounded-lg border font-medium ${
                                        isSelected && isCorrectLetter ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold' :
                                        isSelected && !isCorrectLetter ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold' :
                                        !isSelected && isCorrectLetter ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                        'bg-white border-slate-200 text-slate-600'
                                      }`}>
                                        <span className="font-bold mr-1">{letter}.</span> {opt}
                                        {isSelected && <span className="text-[9px] uppercase font-black ml-1.5 text-slate-600">(Đã chọn)</span>}
                                        {isCorrectLetter && <span className="text-[9px] uppercase font-black ml-1.5 text-emerald-700">(Đúng)</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <div className="text-xs font-black text-indigo-950 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg mt-6">
                          PART B: TRUE / FALSE / NOT GIVEN (CÂU 3 - 6)
                        </div>
                        {READING_PASSAGE.questionsPartB.map((q, idx) => {
                          const ans = selectedCandidate.answers?.readingPartB?.[q.id] || '';
                          const isSkipped = ans === '__SKIPPED__';
                          const isCorrect = !isSkipped && ans.trim().toUpperCase() === q.answer.toUpperCase();
                          return (
                            <div key={q.id} className={`p-4 border rounded-xl space-y-3 transition-all ${
                              isCorrect ? 'bg-emerald-50/40 border-emerald-200' :
                              isSkipped ? 'bg-amber-50/20 border-amber-200' :
                              'bg-rose-50/40 border-rose-150'
                            }`}>
                              <div className="flex justify-between items-start">
                                <span className="font-extrabold text-[10px] text-slate-500 uppercase">Câu {idx + 3} (Reading Part B)</span>
                                <span className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                                  isCorrect ? 'bg-emerald-100 text-emerald-850' :
                                  isSkipped ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {isCorrect ? <Check className="w-3.5 h-3.5" /> : isSkipped ? <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> : <X className="w-3.5 h-3.5" />}
                                  {isCorrect ? 'Chính xác (+1đ)' : isSkipped ? 'Đã bỏ qua (0đ)' : 'Chưa chính xác (0đ)'}
                                </span>
                              </div>
                              <p className="font-bold text-slate-800 text-sm font-sans">{q.text}</p>
                              
                              {isSkipped ? (
                                <div className="p-3 bg-amber-50 border border-amber-150 rounded-lg text-xs text-amber-900">
                                  <span className="font-extrabold block text-[10px] text-amber-600 uppercase">HỌC SINH ĐÃ CHỌN BỎ QUA CÂU NÀY:</span>
                                  <span className="italic font-bold block mt-1">
                                    Lý do: {selectedCandidate.answers?.readingPartB?.[`__NOTE__${q.id}`] || <span className="font-normal text-slate-400">Không có lý do ghi chú.</span>}
                                  </span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                  {q.options.map((opt, oIdx) => {
                                    const letter = String.fromCharCode(65 + oIdx);
                                    const isSelected = ans.trim().toUpperCase() === opt.toUpperCase();
                                    const isCorrectLetter = q.answer.toUpperCase() === opt.toUpperCase();
                                    return (
                                      <div key={letter} className={`p-2.5 rounded-lg border font-medium ${
                                        isSelected && isCorrectLetter ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold' :
                                        isSelected && !isCorrectLetter ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold' :
                                        !isSelected && isCorrectLetter ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                                        'bg-white border-slate-200 text-slate-600'
                                      }`}>
                                        <span className="font-bold mr-1">{letter}.</span> {opt}
                                        {isSelected && <span className="text-[9px] uppercase font-black ml-1.5 text-slate-600">(Đã chọn)</span>}
                                        {isCorrectLetter && <span className="text-[9px] uppercase font-black ml-1.5 text-emerald-700">(Đúng)</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        )) : adminTab === 'materials' ? (
          renderMaterialsManager()
        ) : adminTab === 'exams' ? (
          renderExamsManager()
        ) : adminTab === 'settings' ? (
          renderSettingsManager()
        ) : (
          renderLogsTab()
        )}

      </main>

      {/* Custom Confirmation Modal */}
      {showConfirmModal && confirmModalConfig && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-250 shadow-2xl p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-600">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <h3 className="text-base font-black uppercase text-indigo-950 dark:text-slate-100">XÁC NHẬN HÀNH ĐỘNG</h3>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              {confirmModalConfig.type === 'delete' ? (
                <>Bạn có chắc chắn muốn <strong className="text-red-600 dark:text-red-400 font-extrabold">XÓA VĨNH VIỄN</strong> bài làm và thông tin của thí sinh <strong className="dark:text-white font-extrabold">"{confirmModalConfig.name}"</strong> không? Thao tác này KHÔNG THỂ khôi phục.</>
              ) : (
                <>Bạn có chắc chắn muốn <strong className="text-amber-600 dark:text-amber-400 font-extrabold font-mono">RESET</strong> lại toàn bộ bài làm của thí sinh <strong className="dark:text-white font-extrabold">"{confirmModalConfig.name}"</strong>? Thí sinh sẽ được phép đăng ký và thi lại từ đầu.</>
              )}
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmedAction}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer ${
                  confirmModalConfig.type === 'delete' ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertConfig?.show && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-250 shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5">
              {alertConfig.type === 'success' ? (
                <CheckCircle className="w-7 h-7 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-7 h-7 text-red-600 shrink-0" />
              )}
              <h3 className="text-sm font-black uppercase text-indigo-950 dark:text-slate-100">{alertConfig.title}</h3>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              {alertConfig.message}
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setAlertConfig(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-900 hover:bg-indigo-850 rounded-lg transition-colors cursor-pointer"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

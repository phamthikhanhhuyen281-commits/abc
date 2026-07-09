import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, BookOpen, ChevronRight, Phone, Award, ShieldAlert, User, Smartphone, FileText, Video, ExternalLink, Clock, Mail, Globe, MapPin } from 'lucide-react';
import { examService } from '../services/examService';
import { languageService, Language } from '../services/languageService';
import LanguageToggle from './LanguageToggle';

interface StartScreenProps {
  onRegister: (fullName: string, phone: string, examId: string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
  onAdminClick?: () => void;
  settings?: any;
}

export default function StartScreen({ onRegister, loading, onAdminClick, settings = {} }: StartScreenProps) {
  const [lang, setLang] = useState<Language>(languageService.getLanguage());
  const t = (key: Parameters<typeof languageService.t>[0]) => languageService.t(key);

  useEffect(() => {
    return languageService.onChange((newLang) => {
      setLang(newLang);
    });
  }, []);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showTeacherContact, setShowTeacherContact] = useState(false);
  const [showPhoneOptions, setShowPhoneOptions] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('default-exam');
  const [isExamLocked, setIsExamLocked] = useState(false);

  useEffect(() => {
    // 1. Check path first: e.g. /exam/abc123xyz
    const pathMatch = window.location.pathname.match(/\/exam\/([a-zA-Z0-9_-]+)/);
    const pathExamId = pathMatch ? pathMatch[1] : null;

    // 2. Fallback to query param
    const params = new URLSearchParams(window.location.search);
    const queryExamId = params.get('examId');

    const lockedExamId = pathExamId || queryExamId;
    if (lockedExamId) {
      setSelectedExamId(lockedExamId);
      setIsExamLocked(true);
    }
  }, []);

  useEffect(() => {
    examService.getExams()
      .then((eList) => {
        setExams(eList);
        // Only overwrite if exam isn't locked by URL query/path
        const pathMatch = window.location.pathname.match(/\/exam\/([a-zA-Z0-9_-]+)/);
        const pathExamId = pathMatch ? pathMatch[1] : null;
        const params = new URLSearchParams(window.location.search);
        const queryExamId = params.get('examId');
        const lockedExamId = pathExamId || queryExamId;

        if (lockedExamId) {
          setSelectedExamId(lockedExamId);
          setIsExamLocked(true);
        } else if (eList.length > 0) {
          setSelectedExamId(eList[0].id);
        }
      })
      .catch((err) => console.error('Error fetching exams:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Vui lòng nhập Họ và tên của bạn.');
      return;
    }
    if (!phone.trim()) {
      setError('Vui lòng nhập Số điện thoại.');
      return;
    }
    
    // Simple phone regex check
    const phoneRegex = /^[0-9]{8,11}$/;
    if (!phoneRegex.test(phone.trim().replace(/[\s\.-]/g, ''))) {
      setError('Số điện thoại không hợp lệ. Vui lòng nhập từ 8 đến 11 chữ số.');
      return;
    }

    const selectedExam = exams.find((e) => e.id === selectedExamId);
    if (selectedExam?.isClosed) {
      setError('Kỳ thi này hiện đang đóng. Bạn không thể đăng ký tham gia thi.');
      return;
    }

    const res = await onRegister(fullName, phone, selectedExamId);
    if (!res.success && res.error) {
      setError(res.error);
    }
  };

  return (
    <div id="start-screen-container" className="min-h-screen bg-slate-50 dark:bg-[#0b111e] flex flex-col justify-between">
      {/* Top Header Bar with Language Toggle */}
      <header className="bg-indigo-950 text-white shadow-md select-none shrink-0 border-b border-indigo-900">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-slate-100">
              {t('title')}
            </span>
          </div>
          <LanguageToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-12 flex-grow flex flex-col justify-center items-center w-full">
        {!showRegisterForm ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center w-full"
            id="welcome-card"
          >
            {/* Logo Section */}
            <div className="flex justify-center mb-6">
              {settings.logoUrl && settings.logoUrl.trim() !== '' ? (
                <img
                  src={settings.logoUrl}
                  alt="Logo"
                  referrerPolicy="no-referrer"
                  className="h-20 w-auto object-contain max-w-[240px] drop-shadow-md rounded-lg"
                />
              ) : (
                <div className="bg-indigo-900 text-white p-4 rounded-full shadow-lg flex items-center justify-center">
                  <Award className="w-12 h-12" />
                </div>
              )}
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-indigo-950 dark:text-slate-100 mb-3 uppercase">
              {t('welcome_title')}
            </h1>
            <p className="text-base md:text-xl text-slate-600 dark:text-slate-300 font-medium mb-8 font-sans max-w-xl mx-auto">
              {settings.slogan || 'Your English Journey Starts Here.'}
            </p>

            {/* Anti-fraud Red Warning */}
            <div
              id="anti-cheat-warning"
              className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-600 dark:border-red-500 p-5 rounded-r-xl max-w-2xl mx-auto text-left mb-10 shadow-sm"
            >
              <div className="flex items-start">
                <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-red-900 dark:text-red-200 font-bold text-lg mb-1 uppercase tracking-wide">
                    {t('anti_cheat_title')}
                  </h3>
                  <p className="text-red-700 dark:text-red-400 text-sm leading-relaxed">
                    {t('anti_cheat_text')}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions / Closed Exam Alert */}
            {exams.length > 0 && exams.find((e) => e.id === selectedExamId)?.isClosed ? (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl max-w-xl mx-auto text-center space-y-4 shadow-sm mb-6">
                <div className="flex justify-center">
                  <div className="bg-red-100 text-red-700 p-3 rounded-full">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                </div>
                <h3 className="text-red-900 dark:text-red-200 font-extrabold text-lg uppercase tracking-wide">
                  {t('exam_closed_title')}
                </h3>
                <p className="text-red-700 dark:text-red-400 text-xs leading-relaxed max-w-md mx-auto">
                  {t('exam_closed_desc')}
                </p>

                {/* Always-visible Contact Card when closed */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-red-100 dark:border-slate-800 text-left space-y-3 mt-4">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide border-b pb-1.5 border-slate-100 dark:border-slate-800">
                    Thông tin liên hệ Giáo viên:
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Giáo viên phụ trách: <span className="text-indigo-950 dark:text-white font-black text-sm">{settings.teacherName || 'Teacher Anna'}</span>
                  </div>
                  {settings.teacherAddress && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      📍 <strong>Địa chỉ:</strong> {settings.teacherAddress}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPhoneOptions(!showPhoneOptions)}
                        className="w-full flex items-center justify-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 shadow-xs text-xs font-bold cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5 text-indigo-900 dark:text-indigo-400" />
                        <span>Gọi / SMS / Zalo</span>
                      </button>
                      
                      {showPhoneOptions && (
                        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 text-xs text-slate-700 dark:text-slate-200">
                          <a
                            href={`tel:${settings.teacherPhone || '0987.654.321'}`}
                            className="flex items-center gap-2 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-semibold"
                          >
                            📞 Gọi Hotline trực tiếp
                          </a>
                          <a
                            href={`sms:${settings.teacherPhone || '0987.654.321'}`}
                            className="flex items-center gap-2 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-semibold"
                          >
                            💬 Gửi tin nhắn SMS
                          </a>
                          <a
                            href={`https://zalo.me/${(settings.teacherZalo || settings.teacherPhone || '0987.654.321').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-bold text-indigo-600 dark:text-indigo-400"
                          >
                            💬 Mở Zalo trò chuyện
                          </a>
                        </div>
                      )}
                    </div>

                    <a
                      href={`mailto:${settings.teacherEmail || 'teacher@english.edu.vn'}`}
                      className="flex items-center justify-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 shadow-xs text-xs font-bold"
                    >
                      ✉️ Gửi Email hỗ trợ
                    </a>

                    {settings.teacherFacebook && (
                      <a
                        href={settings.teacherFacebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 shadow-xs text-xs font-bold"
                      >
                        🔵 Facebook Cá nhân
                      </a>
                    )}

                    {settings.teacherWebsite && (
                      <a
                        href={settings.teacherWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 shadow-xs text-xs font-bold"
                      >
                        🌐 Ghé thăm Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Actions when Exam is active */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto">
                  <button
                    id="start-test-btn"
                    onClick={() => setShowRegisterForm(true)}
                    className="flex-1 bg-indigo-900 hover:bg-indigo-800 text-white font-semibold py-4 px-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center text-lg gap-2 cursor-pointer"
                  >
                    {t('start_test')} <ChevronRight className="w-5 h-5" />
                  </button>
                  
                  <button
                    id="contact-teacher-btn"
                    onClick={() => setShowTeacherContact(!showTeacherContact)}
                    className="flex-1 bg-white dark:bg-slate-800 border-2 border-indigo-900 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-900 dark:text-slate-200 font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center text-lg gap-2 cursor-pointer"
                  >
                    <Phone className="w-5 h-5" /> {t('contact_teacher')}
                  </button>
                </div>

                {/* Teacher Contact Info */}
                {showTeacherContact && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 p-6 bg-indigo-50 dark:bg-slate-800 rounded-2xl text-left shadow-inner max-w-md mx-auto border border-indigo-100 dark:border-slate-700 space-y-4"
                    id="teacher-contact-info"
                  >
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-black border-b pb-1.5 border-indigo-100 dark:border-slate-700">
                      Kênh liên hệ hỗ trợ trực tiếp từ Giáo viên
                    </div>
                    
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Giáo viên phụ trách: <span className="text-indigo-950 dark:text-white font-black text-sm">{settings.teacherName || 'Teacher Anna'}</span>
                    </div>

                    {settings.teacherAddress && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        📍 <strong>Địa chỉ:</strong> {settings.teacherAddress}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="relative col-span-2">
                        <button
                          type="button"
                          onClick={() => setShowPhoneOptions(!showPhoneOptions)}
                          className="w-full flex items-center justify-center gap-1.5 p-3 bg-white dark:bg-slate-700 border border-indigo-250 dark:border-slate-600 hover:bg-indigo-100/55 dark:hover:bg-slate-650 rounded-xl text-indigo-950 dark:text-slate-200 shadow-xs font-bold cursor-pointer"
                        >
                          <Phone className="w-4 h-4 text-indigo-900 dark:text-indigo-400" /> 
                          <span>Gọi / Nhắn tin / Zalo</span>
                        </button>
                        
                        {showPhoneOptions && (
                          <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 text-xs text-slate-700 dark:text-slate-200">
                            <a
                              href={`tel:${settings.teacherPhone || '0987.654.321'}`}
                              className="flex items-center gap-2 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-semibold"
                            >
                              📞 Gọi Hotline trực tiếp
                            </a>
                            <a
                              href={`sms:${settings.teacherPhone || '0987.654.321'}`}
                              className="flex items-center gap-2 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-semibold"
                            >
                              💬 Gửi tin nhắn SMS
                            </a>
                            <a
                              href={`https://zalo.me/${(settings.teacherZalo || settings.teacherPhone || '0987.654.321').replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer font-bold text-indigo-600 dark:text-indigo-400"
                            >
                              💬 Mở Zalo trò chuyện
                            </a>
                          </div>
                        )}
                      </div>

                      <a
                        href={`mailto:${settings.teacherEmail || 'teacher@english.edu.vn'}`}
                        className="flex items-center justify-center gap-1.5 p-3 bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 hover:bg-indigo-100/55 dark:hover:bg-slate-650 rounded-xl text-indigo-950 dark:text-slate-200 shadow-xs cursor-pointer font-bold"
                      >
                        ✉️ Gửi Email
                      </a>

                      {settings.teacherFacebook && (
                        <a
                          href={settings.teacherFacebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 p-3 bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 hover:bg-indigo-100/55 dark:hover:bg-slate-650 rounded-xl text-indigo-950 dark:text-slate-200 shadow-xs cursor-pointer font-bold"
                        >
                          🔵 Facebook
                        </a>
                      )}

                      {settings.teacherWebsite && (
                        <a
                          href={settings.teacherWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 p-3 bg-white dark:bg-slate-700 border border-indigo-200 dark:border-slate-600 hover:bg-indigo-100/55 dark:hover:bg-slate-650 rounded-xl text-indigo-950 dark:text-slate-200 shadow-xs cursor-pointer font-bold"
                        >
                          🌐 Website
                        </a>
                      )}
                    </div>
                    
                    <p className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-2 text-center leading-normal">
                      (Click chọn kênh liên hệ nếu bạn gặp sự cố kỹ thuật hoặc lỗi đường truyền audio)
                    </p>
                  </motion.div>
                )}
              </>
            )}

            <div className="mt-12 text-slate-400 text-xs font-mono">
              CAMBRIDGE ASSESSMENT & IELTS INSPIRED METHODOLOGY • DURATION: 45 MINUTES
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl overflow-hidden"
            id="register-card"
          >
            {/* Form Header */}
            <div className="bg-indigo-950 text-white p-6 text-center relative">
              <button
                type="button"
                onClick={() => setShowRegisterForm(false)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white text-sm"
              >
                {t('back')}
              </button>
              <h2 className="text-xl font-bold uppercase">{t('register_title')}</h2>
              <p className="text-xs text-indigo-200 mt-1">{t('register_desc')}</p>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div id="register-error" className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm font-medium border border-red-100 dark:border-red-900/40 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-900 dark:text-indigo-400" /> {t('fullname')}
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  placeholder={t('fullname_placeholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-900 dark:focus:border-indigo-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-900 dark:text-indigo-400" /> {t('phone')}
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  placeholder={t('phone_placeholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-900 dark:focus:border-indigo-400 focus:outline-none transition-colors"
                />
                <p className="text-slate-400 dark:text-slate-500 text-xs">
                  {t('phone_notice')}
                </p>
              </div>

              {exams.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                     <FileText className="w-3.5 h-3.5 text-indigo-900 dark:text-indigo-400" /> {t('choose_exam')}
                  </label>
                  {isExamLocked ? (
                    <div className="w-full px-4 py-3 bg-indigo-50 dark:bg-slate-900 border-2 border-indigo-200 dark:border-slate-700 text-indigo-950 dark:text-slate-200 font-bold rounded-xl flex items-center gap-2 text-xs">
                      <span className="bg-indigo-900 text-white text-[10px] uppercase font-black px-1.5 py-0.5 rounded shrink-0">{t('link_locked')}</span>
                      <span className="truncate">
                        {exams.find((e) => e.id === selectedExamId)?.title || selectedExamId} ({exams.find((e) => e.id === selectedExamId)?.durationMinutes || 45} mins)
                      </span>
                    </div>
                  ) : (
                    <select
                      id="reg-exam"
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-900 dark:focus:border-indigo-400 focus:outline-none transition-colors"
                    >
                      {exams.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.title} ({ex.durationMinutes} mins)
                        </option>
                      ))}
                    </select>
                  )}
                  {isExamLocked && (
                    <p className="text-[11px] text-indigo-800 dark:text-indigo-400 italic leading-snug">
                      {t('direct_link_notice')}
                    </p>
                  )}
                </div>
              )}

              {/* Warnings check boxes/notice */}
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-400 space-y-2 border border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-2">
                  <input type="checkbox" required id="agree-check" className="mt-0.5 accent-indigo-900" />
                  <label htmlFor="agree-check" className="cursor-pointer">
                    {t('agree_commit')}
                  </label>
                </div>
              </div>

              <button
                id="submit-register-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-900 hover:bg-indigo-850 disabled:bg-indigo-300 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-md cursor-pointer uppercase tracking-wider text-xs"
              >
                {loading ? t('submitting_info') : t('start_now')} <ChevronRight className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-indigo-950 text-slate-400 text-center py-6 text-sm border-t border-indigo-900">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>© 2026 Professional English Placement Test System. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#welcome-card" onClick={() => setShowTeacherContact(true)} className="hover:text-white transition-colors">Trợ giúp</a>
            <span className="text-indigo-800">|</span>
            <button
              onClick={onAdminClick}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Dành cho Giáo viên
            </button>
            <span className="text-indigo-800">|</span>
            <span className="font-mono text-xs">Version 1.0 (IELTS standard)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { languageService, Language } from '../services/languageService';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
  const [lang, setLang] = useState<Language>(languageService.getLanguage());

  useEffect(() => {
    return languageService.onChange((newLang) => {
      setLang(newLang);
    });
  }, []);

  const toggleLanguage = () => {
    const nextLang = lang === 'vi' ? 'en' : 'vi';
    languageService.setLanguage(nextLang);
  };

  return (
    <button
      id="lang-toggle-btn"
      type="button"
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/25 text-white rounded-xl text-xs font-extrabold cursor-pointer transition-all uppercase tracking-wide select-none"
      title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
    >
      <Globe className="w-3.5 h-3.5 text-indigo-200" />
      <span>{lang === 'vi' ? 'VI 🇻🇳' : 'EN 🇬🇧'}</span>
    </button>
  );
}

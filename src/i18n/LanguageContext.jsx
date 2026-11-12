import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ARABIC_TEXT } from './ar.js';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'az-store-language';

function readSavedLanguage() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(readSavedLanguage);

  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // The language still works for this visit when storage is unavailable.
    }
  }, [language]);

  const value = useMemo(() => ({
    language,
    isArabic: language === 'ar',
    toggleLanguage: () => setLanguage((current) => current === 'ar' ? 'en' : 'ar'),
    t: (text) => language === 'ar' ? (ARABIC_TEXT[text] || text) : text,
    localize: (entity, field = 'name') => {
      const english = typeof entity === 'string' ? entity : entity?.[field];
      if (typeof english !== 'string') return '';
      if (language !== 'ar') return english;
      const arabic = typeof entity === 'string' ? '' : entity?.[`${field}Ar`];
      return (typeof arabic === 'string' && arabic.trim()) || ARABIC_TEXT[english] || english;
    },
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider.');
  return context;
}


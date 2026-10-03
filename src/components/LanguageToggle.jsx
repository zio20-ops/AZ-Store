import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function LanguageToggle({ className = '' }) {
  const { language, toggleLanguage } = useLanguage();
  const target = language === 'en' ? 'العربية' : 'English';

  return (
    <button
      type="button"
      className={`language-toggle ${className}`.trim()}
      onClick={toggleLanguage}
      aria-label={language === 'en' ? 'Switch language to Arabic' : 'التغيير إلى الإنجليزية'}
      title={language === 'en' ? 'العربية' : 'English'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
      <span>{target}</span>
    </button>
  );
}

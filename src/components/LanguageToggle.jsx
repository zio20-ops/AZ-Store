import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function LanguageToggle() {
  const { language, toggleLanguage, t } = useLanguage();
  const nextLanguage = language === 'ar' ? 'English' : 'العربية';

  return (
    <button
      type="button"
      className="language-toggle"
      onClick={toggleLanguage}
      aria-label={`${t('Switch language to')} ${nextLanguage}`}
      title={`${t('Switch language to')} ${nextLanguage}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
      <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
    </button>
  );
}

import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function LanguageToggle() {
  const { isArabic, toggleLanguage } = useLanguage();
  const targetLanguage = isArabic ? 'English' : 'عربي';
  const actionLabel = isArabic ? 'Switch language to English' : 'تغيير اللغة إلى العربية';

  return (
    <button
      className="language-toggle"
      type="button"
      onClick={toggleLanguage}
      aria-label={actionLabel}
      title={actionLabel}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 12h17M12 3c2.3 2.4 3.4 5.4 3.4 9s-1.1 6.6-3.4 9c-2.3-2.4-3.4-5.4-3.4-9S9.7 5.4 12 3Z" />
      </svg>
      <span>{targetLanguage}</span>
    </button>
  );
}

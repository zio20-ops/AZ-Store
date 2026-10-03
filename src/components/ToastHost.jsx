import { useStore } from '../store/StoreContext.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function ToastHost() {
  const { toasts } = useStore();
  const { t } = useLanguage();
  if (!toasts.length) return null;
  return (
    <div className="toast" aria-live="polite">
      {toasts.map((toast) => (
        <div className="toast__inner" key={toast.id}>{t(toast.message)}</div>
      ))}
    </div>
  );
}

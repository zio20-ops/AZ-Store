import { useLanguage } from '../i18n/LanguageContext.jsx';
import { Link } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo.js';

export default function NotFound() {
  const { t } = useLanguage();
  useSeo('Page not found | AZ Store', 'This page wandered off.');
  return (
    <div className="empty" style={{ padding: '120px 24px' }}>
      <h3>{t("This page wandered off.")}</h3>
      <p>{t("Like a good scent trail, it faded. Let’s take you back to the collection.")}</p>
      <Link className="btn btn--primary" to="/">{t("Back home")}</Link>
    </div>
  );
}

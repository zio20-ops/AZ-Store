import { useLanguage } from '../../i18n/LanguageContext.jsx';

export default function ConfirmDialog({ open, title, body, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const { t } = useLanguage();
  if (!open) return null;
  return (
    <div className="admodal" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="admodal__box">
        <h3>{title}</h3>
        {body}
        <div className="admodal__actions">
          <button className="btn btn--ghost" onClick={onCancel}>{t('Cancel')}</button>
          <button className="btn btn--danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

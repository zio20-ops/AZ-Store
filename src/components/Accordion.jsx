import { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function Accordion({ items }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(null);

  return (
    <div>
      {items.map((item, i) => (
        <div className={`acc ${open === i ? 'acc--open' : ''}`} key={item.q}>
          <button
            className="acc__head"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span>{t(item.q)}</span>
            <span className="acc__icon" aria-hidden="true">+</span>
          </button>
          <div className="acc__body" role="region" aria-label={t(item.q)}>
            <div>{t(item.a)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

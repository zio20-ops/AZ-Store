import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { trackOrder } from '../services/orderService.js';
import { useSeo } from '../hooks/useSeo.js';
import { ORDER_STEPS } from '../data/content.js';
import { egp } from '../utils/format.js';
import { isFirebase } from '../services/backend.js';

export default function TrackOrder() {
  const { t } = useLanguage();
  useSeo('Track your order | AZ Store', 'Follow your AZ order from received to delivered.');
  const [params] = useSearchParams();
  const [orderId, setOrderId] = useState(params.get('order') || '');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await trackOrder(orderId.trim(), phone.trim());
      if (!res.ok) {
        setResult(null);
        setError(res.message || 'We couldn’t find that order. Check the number and the phone you checked out with.');
        return;
      }
      setError(null);
      setResult(res.order);
    } catch {
      setResult(null);
      setError('We couldn’t reach the order service. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="track">
      <h1>{t("Track your order")}</h1>
      <p>
        {t("Enter your order number and the phone number used at checkout.")}
        {!isFirebase && ' Try the demo order AZ-2609-1001 with 01000000000.'}
      </p>

      <form className="track__form" onSubmit={submit}>
        <input className="field" placeholder={t("Order number")} value={orderId} aria-label={t("Order number")}
          onChange={(e) => setOrderId(e.target.value)} />
        <input className="field" placeholder={t("Phone number")} value={phone} aria-label={t("Phone number")} inputMode="numeric"
          onChange={(e) => setPhone(e.target.value)} />
        <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? t("Checking…") : t("Track order")}</button>
      </form>

      {error && <p className="field-error" role="alert" style={{ textAlign: 'center' }}>{t(error)}</p>}

      {result && (
        <section aria-label={t("Order progress")}>
          <p style={{ textAlign: 'center', fontSize: 13, opacity: 0.65, marginBottom: 26 }}>
            {result.id} · {result.name} · {egp(result.total)}
          </p>
          <ol className="steps">
            {result.cancelled ? (
              <li className="step step--done step--cancelled">
                <span className="step__dot" aria-hidden="true">✕</span>
                <div>
                  <div className="step__label">{t("Cancelled")}</div>
                  <div className="step__date">{t("This order was cancelled. Contact us if you believe this is a mistake.")}</div>
                </div>
              </li>
            ) : (
              ORDER_STEPS.map((step, i) => {
                const state = i < result.status ? t("done") : i === result.status ? t("now") : t("todo");
                return (
                  <li className={`step step--${state === 'done' ? 'done' : state === 'now' ? 'done step--now' : 'todo'}`} key={step}>
                    <span className="step__dot" aria-hidden="true">{i < result.status ? '✓' : i + 1}</span>
                    <div>
                      <div className="step__label">{t(step)}</div>
                      {state === 'now' && (
                        <div className="step__date">{i === ORDER_STEPS.length - 1 ? t("Completed") : t("Current stage")}</div>
                      )}
                      {state === 'done' && i < result.status && <div className="step__date">{t("Completed")}</div>}
                    </div>
                  </li>
                );
              })
            )}
          </ol>
          <p style={{ textAlign: 'center', marginTop: 34 }}>
            <Link className="btn btn--text" to="/contact">{t("Need help with this order?")}</Link>
          </p>
        </section>
      )}
    </div>
  );
}

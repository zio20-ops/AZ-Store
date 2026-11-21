import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { trackOrder } from '../services/orderService.js';
import { useSeo } from '../hooks/useSeo.js';
import { ORDER_STEPS } from '../data/content.js';
import { egp } from '../utils/format.js';
import { isFirebase } from '../services/backend.js';

export default function TrackOrder() {
  const { t } = useLanguage();
  useSeo('Track your order | AZ Store', 'Follow your AZ order from received to delivered.');
  const location = useLocation();
  const [params] = useSearchParams();
  const [orderId, setOrderId] = useState(params.get('order') || '');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const requestPending = useRef(false);

  const lookup = useCallback(async (id, number) => {
    if (requestPending.current) return;
    requestPending.current = true;
    setBusy(true);
    try {
      const res = await trackOrder(id.trim(), number.trim());
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
      requestPending.current = false;
      setBusy(false);
    }
  }, []);

  const orderFromLink = params.get('order') || '';
  const phoneFromLink = location.state?.phone || '';
  useEffect(() => {
    if (!orderFromLink || !phoneFromLink) return;
    setOrderId(orderFromLink);
    setPhone(phoneFromLink);
    void lookup(orderFromLink, phoneFromLink);
  }, [orderFromLink, phoneFromLink, lookup]);

  const submit = async (e) => {
    e.preventDefault();
    await lookup(orderId, phone);
  };

  return (
    <div className="track">
      <h1>{t("Track your order")}</h1>
      <p>{t("See your order’s latest status in a few steps.")}</p>

      <div className="track__guide">
        <b>{t("What you’ll need")}</b>
        <ol>
          <li>{t("Order number: copy it from your order confirmation page.")}</li>
          <li>{t("Phone number: enter the same mobile number you used at checkout.")}</li>
          <li>{t("Select Track order to see the current step and what happens next.")}</li>
        </ol>
        {!isFirebase && <small>{t("Demo details")}: AZ-2609-1001 · 01000000000</small>}
      </div>

      <form className="track__form" onSubmit={submit}>
        <label>{t("Order number")}<input className="field" placeholder={t("From your order confirmation")} value={orderId} aria-label={t("Order number")} autoComplete="off"
          onChange={(e) => setOrderId(e.target.value)} />
        </label>
        <label>{t("Phone number")}<input className="field" placeholder="01012345678" value={phone} aria-label={t("Phone number")} inputMode="tel" autoComplete="tel"
          onChange={(e) => setPhone(e.target.value)} />
        </label>
        <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? t("Checking…") : t("Track order")}</button>
      </form>

      {error && <p className="field-error" role="alert" style={{ textAlign: 'center' }}>{t(error)}</p>}

      {result && (
        <section className="track__result" aria-label={t("Order progress")}>
          <h2>{t("Order progress")}</h2>
          <div className="track__summary">
            <div><small>{t("Order number")}</small><b className="track__order-id">{result.id}</b></div>
            <div><small>{t("Customer")}</small><b>{result.name}</b></div>
            <div><small>{t("Total")}</small><b>{egp(result.total)}</b></div>
          </div>
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

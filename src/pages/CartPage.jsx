import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { egp } from '../utils/format.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';

export default function CartPage() {
  const { t } = useLanguage();
  useSeo('Your bag | AZ Store', 'Review your AZ bag, apply a promo code and check out securely.');
  const { cart, subtotal, setQty, removeLine, freeThreshold, applyPromo, promo } = useStore();
  const [code, setCode] = useState('');
  const [promoMsg, setPromoMsg] = useState(null);
  const navigate = useNavigate();

  const remaining = Math.max(0, freeThreshold - subtotal);

  const onApply = (e) => {
    e.preventDefault();
    const res = applyPromo(code);
    setPromoMsg(res);
    if (res.ok) setCode('');
  };

  return (
    <div className="container">
      <nav className="crumb" aria-label={t('Breadcrumb')}>
        <Link to="/">{t('Home')}</Link> / <span>{t('Your bag')}</span>
      </nav>

      <section className="bagpage">
        <div className="drawer__head">
          <h1 className="drawer__title">{t('Your bag')}</h1>
          <Link className="drawer__close" to="/shop">{t('Continue shopping')}</Link>
        </div>

        {cart.length === 0 ? (
          <div className="drawer__empty">
            <h3>{t('Your bag is empty.')}</h3>
            <p>{t('Three moods are waiting for you.')}</p>
            <Link className="btn btn--primary" to="/shop">{t('Shop all')}</Link>
          </div>
        ) : (
          <>
            <div className="shipbar" role="status">
              {remaining > 0
                ? <>{t('Add')} <b>{egp(remaining)}</b> {t('more for free delivery')}</>
                : <>{t('You’ve unlocked')} <b>{t('free delivery')}</b></>}
              <div className="shipbar__track"><div className="shipbar__fill" style={{ width: `${Math.min(100, (subtotal / freeThreshold) * 100)}%` }} /></div>
            </div>

            <div className="drawer__items">
              {cart.map((line) => (
                <div className="li" key={line.key}>
                  <div className="li__img"><img src={line.image} alt={line.product.name} loading="lazy" /></div>
                  <div>
                    <div className="li__name">{line.product.name}</div>
                    <div className="li__meta">{t(line.variation.label)} · {t('Qty')} {line.qty}</div>
                    <div className="li__ctrl">
                      <button onClick={() => setQty(line.key, line.qty - 1)} aria-label={`Decrease quantity of ${line.product.name}`}>−</button>
                      <span aria-live="polite">{line.qty}</span>
                      <button onClick={() => setQty(line.key, line.qty + 1)} disabled={line.qty >= line.variation.stock} aria-label={`Increase quantity of ${line.product.name}`}>+</button>
                      <button className="li__remove" onClick={() => removeLine(line.key)}>{t('Remove')}</button>
                    </div>
                  </div>
                  <b className="li__price">{egp(line.price * line.qty)}</b>
                </div>
              ))}
            </div>

            <form className="drawer__promo" onSubmit={onApply}>
              <input className="field field--ink" placeholder={t('Promo code')} value={code} aria-label={t('Promo code')}
                onChange={(e) => { setCode(e.target.value); setPromoMsg(null); }} />
              <button className="btn" type="submit" style={{ padding: '10px 18px' }}>{t('Apply')}</button>
            </form>
            {promoMsg && <p className={`promo-msg ${promoMsg.ok ? 'promo-msg--ok' : 'promo-msg--err'}`} role="status">{t(promoMsg.message)}</p>}
            {promo && !promoMsg && <p className="promo-msg promo-msg--ok" role="status">{promo.code} {t('applied')}</p>}

            <div className="drawer__foot">
              <div className="drawer__subtotal"><span>{t('Subtotal')}</span><b>{egp(subtotal)}</b></div>
              <button className="btn btn--dark btn--block" onClick={() => navigate('/checkout')}>{t('Go to checkout')}</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

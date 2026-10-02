import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { egp } from '../utils/format.js';

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, subtotal, discount, setQty, removeLine, freeThreshold, applyPromo, promo } = useStore();
  const [code, setCode] = useState('');
  const [promoMsg, setPromoMsg] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setCartOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCartOpen]);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [cartOpen]);

  const remaining = Math.max(0, freeThreshold - subtotal);
  const progress = Math.min(100, (subtotal / freeThreshold) * 100);

  const onApply = (e) => {
    e.preventDefault();
    const res = applyPromo(code);
    setPromoMsg(res);
    if (res.ok) setCode('');
  };

  return (
    <>
      <div className={`scrim ${cartOpen ? 'scrim--on' : ''}`} onClick={() => setCartOpen(false)} aria-hidden="true" />
      <aside className={`drawer ${cartOpen ? 'drawer--open' : ''}`} role="dialog" aria-modal="true" aria-label="Your bag" aria-hidden={!cartOpen}>
        <div className="drawer__head">
          <h2 className="drawer__title">Your bag</h2>
          <button className="drawer__close" onClick={() => setCartOpen(false)}>Close</button>
        </div>

        {cart.length === 0 ? (
          <div className="drawer__empty">
            <h3>Your bag is empty.</h3>
            <p>Three moods are waiting for you.</p>
            <button className="btn btn--primary" onClick={() => { setCartOpen(false); navigate('/shop'); }}>Shop all</button>
          </div>
        ) : (
          <>
            <div className="shipbar" role="status">
              {remaining > 0
                ? <>Add <b>{egp(remaining)}</b> more for free delivery</>
                : <>You’ve unlocked <b>free delivery</b></>}
              <div className="shipbar__track"><div className="shipbar__fill" style={{ width: `${progress}%` }} /></div>
            </div>

            <div className="drawer__items">
              {cart.map((line) => (
                <div className="li" key={line.key}>
                  <div className="li__img">
                    <img src={line.image} alt={line.product.name} loading="lazy" />
                  </div>
                  <div className="li__body">
                    <div className="li__name">{line.product.name}</div>
                    <div className="li__meta">{line.variation.label} · Qty {line.qty}</div>
                    <div className="li__ctrl">
                      <button onClick={() => setQty(line.key, line.qty - 1)} aria-label={`Decrease quantity of ${line.product.name}`}>−</button>
                      <span aria-live="polite">{line.qty}</span>
                      <button onClick={() => setQty(line.key, line.qty + 1)} disabled={line.qty >= line.variation.stock} aria-label={`Increase quantity of ${line.product.name}`}>+</button>
                      <button className="li__remove" onClick={() => removeLine(line.key)} aria-label={`Remove ${line.product.name} from your bag`} title="Remove item"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-.8 13H6.8L6 7m4 4v5m4-5v5" /></svg><span>Remove</span></button>
                    </div>
                  </div>
                  <b className="li__price">{egp(line.price * line.qty)}</b>
                </div>
              ))}
            </div>

            <form className="drawer__promo" onSubmit={onApply}>
              <input
                className="field field--ink"
                placeholder="Promo code"
                value={code}
                aria-label="Promo code"
                onChange={(e) => { setCode(e.target.value); setPromoMsg(null); }}
              />
              <button className="btn" type="submit" style={{ padding: '10px 18px' }}>Apply</button>
            </form>
            {promoMsg && <p className={`promo-msg ${promoMsg.ok ? 'promo-msg--ok' : 'promo-msg--err'}`} role="status">{promoMsg.message}</p>}
            {promo && !promoMsg && <p className="promo-msg promo-msg--ok" role="status">{promo.code} applied</p>}

            <div className="drawer__foot">
              {promo && <div className="drawer__subtotal drawer__promo-total"><span>Promo {promo.code}</span><b>{promo.appliesTo === 'shipping' ? 'At checkout' : `−${egp(discount)}`}</b></div>}
              <div className="drawer__subtotal"><span>Subtotal</span><b>{egp(subtotal)}</b></div>
              <button className="btn btn--dark btn--block" onClick={() => { setCartOpen(false); navigate('/checkout'); }}>
                Go to checkout
              </button>
              <button className="drawer__continue" onClick={() => setCartOpen(false)}>Continue shopping</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

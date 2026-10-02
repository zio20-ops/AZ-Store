import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { egp } from '../utils/format.js';

export default function CartPage() {
  useSeo('Your bag | AZ Store', 'Review your AZ bag, apply a promo code and check out securely.');
  const { cart, subtotal, discount, setQty, removeLine, freeThreshold, applyPromo, removePromo, promo } = useStore();
  const [code, setCode] = useState('');
  const [promoMsg, setPromoMsg] = useState(null);
  const navigate = useNavigate();

  const remaining = Math.max(0, freeThreshold - subtotal);

  const onApply = (e) => {
    e.preventDefault();
    const res = applyPromo(code);
    setPromoMsg(res.ok ? null : res);
    if (res.ok) setCode('');
  };

  return (
    <div className="container">
      <nav className="crumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link> / <span>Your bag</span>
      </nav>

      <section className="bagpage">
        <div className="drawer__head">
          <h1 className="drawer__title">Your bag</h1>
          <Link className="drawer__close" to="/shop">Continue shopping</Link>
        </div>

        {cart.length === 0 ? (
          <div className="drawer__empty">
            <h3>Your bag is empty.</h3>
            <p>Three moods are waiting for you.</p>
            <Link className="btn btn--primary" to="/shop">Shop all</Link>
          </div>
        ) : (
          <>
            <div className="shipbar" role="status">
              {remaining > 0
                ? <>Add <b>{egp(remaining)}</b> more for free delivery</>
                : <>You’ve unlocked <b>free delivery</b></>}
              <div className="shipbar__track"><div className="shipbar__fill" style={{ width: `${Math.min(100, (subtotal / freeThreshold) * 100)}%` }} /></div>
            </div>

            <div className="drawer__items">
              {cart.map((line) => (
                <div className="li" key={line.key}>
                  <div className="li__img"><img src={line.image} alt={line.product.name} loading="lazy" /></div>
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
                  <b className="li__price">{line.promoDiscount ? <><del>{egp(line.price * line.qty)}</del><span className="li__sale-price">{egp(line.promoLineTotal)}</span></> : egp(line.price * line.qty)}</b>
                </div>
              ))}
            </div>

            <form className="drawer__promo" onSubmit={onApply}>
              <input className="field field--ink" placeholder="Promo code" value={code} aria-label="Promo code"
                onChange={(e) => { setCode(e.target.value); setPromoMsg(null); }} />
              <button className="btn" type="submit" style={{ padding: '10px 18px' }}>Apply</button>
            </form>
            {promoMsg && <p className={`promo-msg ${promoMsg.ok ? 'promo-msg--ok' : 'promo-msg--err'}`} role="status">{promoMsg.message}</p>}
            {promo && !promoMsg && <p className="promo-msg promo-msg--ok" role="status">{promo.code} applied <button type="button" className="promo-remove" onClick={() => { removePromo(); setPromoMsg(null); }}>Remove</button></p>}

            <div className="drawer__foot">
              {promo && <div className="drawer__subtotal drawer__promo-total"><span>Promo {promo.code}</span><b>{promo.appliesTo === 'shipping' ? 'Delivery discount at checkout' : `−${egp(discount)}`}</b></div>}
              <div className="drawer__subtotal"><span>{promo?.appliesTo === 'products' ? 'Total after promo' : 'Subtotal'}</span><b>{egp(subtotal - discount)}</b></div>
              <button className="btn btn--dark btn--block" onClick={() => navigate('/checkout')}>Go to checkout</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

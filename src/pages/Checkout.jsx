import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { DELIVERY_METHODS, PAYMENT_METHODS } from '../data/products.js';
import { GOVERNORATES } from '../data/content.js';
import { egp, isValidEgyptPhone, isValidEmail } from '../utils/format.js';
import * as auth from '../services/authService.js';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';

const initialForm = {
  name: '', phone: '', email: '', governorate: '', city: '',
  address: '', apartment: '', notes: '',
};

export default function Checkout() {
  const { t } = useLanguage();
  useSeo('Checkout | AZ Store', 'Choose a payment method and complete your AZ Store order.');
  const { cart, subtotal, discount, promo, freeThreshold, settings, placeOrder } = useStore();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => {
    const user = auth.getCurrentUser();
    return { ...initialForm, name: user?.name === user?.email ? '' : (user?.name || ''), email: user?.email || '' };
  });
  const [errors, setErrors] = useState({});
  const [deliveryId, setDeliveryId] = useState('standard');
  const [paymentId, setPaymentId] = useState('cod');
  const [paymentRef, setPaymentRef] = useState('');
  const [placing, setPlacing] = useState(false);

  const method = DELIVERY_METHODS.find((m) => m.id === deliveryId);
  const deliveryFee = useMemo(() => {
    if (promo?.type === 'shipping') return 0;
    if (deliveryId === 'standard' && subtotal >= freeThreshold) return 0;
    return method.price;
  }, [deliveryId, subtotal, freeThreshold, method, promo]);

  const total = subtotal - discount + deliveryFee;
  const payment = PAYMENT_METHODS.find((p) => p.id === paymentId);
  const paymentOptions = PAYMENT_METHODS.filter((p) => settings.paymentMethods?.[p.id]?.enabled ?? p.id === 'cod');
  const paymentConfig = settings.paymentMethods?.[paymentId] || {};

  useEffect(() => {
    if (paymentOptions.length && !paymentOptions.some((p) => p.id === paymentId)) setPaymentId(paymentOptions[0].id);
  }, [paymentId, paymentOptions]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (form.name.trim().length < 3) er.name = 'Please enter your full name.';
    if (!isValidEgyptPhone(form.phone)) er.phone = 'Enter a valid Egyptian mobile number (e.g. 01012345678).';
    if (form.email && !isValidEmail(form.email)) er.email = 'That email address doesn’t look right.';
    if (!form.governorate) er.governorate = 'Choose your governorate.';
    if (!form.city.trim()) er.city = 'Please enter your city.';
    if (form.address.trim().length < 8) er.address = 'Please enter your full street address.';
    if (paymentId !== 'cod' && paymentRef.trim().length < 4) er.paymentRef = 'Enter the transfer reference shown in your payment app.';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      document.querySelector('.field--error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setPlacing(true);
    try {
      const order = await placeOrder({
        name: form.name.trim(),
        phone: form.phone.replace(/\s/g, ''),
        email: form.email.trim(),
        payment: payment.label,
        paymentMethod: paymentId,
        paymentRef: paymentId === 'cod' ? '' : paymentRef.trim(),
        deliveryMethod: `${method.label}, ${method.eta.toLowerCase()}`,
        deliveryOption: deliveryId,
        promoCode: promo?.code || '',
        delivery: deliveryFee,
        address: [form.address.trim(), form.apartment.trim(), form.city.trim(), form.governorate].filter(Boolean).join(', '),
        notes: form.notes.trim(),
      });
      navigate('/order-confirmation', { state: { id: order.id, order } });
    } catch (error) {
      setErrors((old) => ({ ...old, submit: error.message || 'Unable to save the order. Please try again.' }));
    } finally { setPlacing(false); }
  };

  if (cart.length === 0) {
    return (
      <div className="confirm">
        <h1>{t('Your bag is empty.')}</h1>
        <p>{t('Add a scent or two before checking out.')}</p>
        <div className="confirm__actions">
          <Link className="btn btn--dark" to="/shop">{t('Shop all')}</Link>
        </div>
      </div>
    );
  }

  const fieldClass = (key) => `field ${errors[key] ? 'field--error' : ''}`;

  return (
    <>
      <div className="cohead">
        <Link to="/" className="logo" aria-label={t('AZ Store home')}>AZ</Link>
        <span>{t('Checkout')}</span>
        <LanguageToggle />
        <Link to="/cart">{t('Back to bag')}</Link>
      </div>

      <div className="container co">
        <form onSubmit={submit} noValidate>
          <h2>{t('Delivery')}</h2>
          <div className="co__fields">
            <div>
            <input className={fieldClass('name')} placeholder={t('Full name')} value={form.name} onChange={set('name')} aria-label={t('Full name')} autoComplete="name" />
              {errors.name && <p className="field-error" role="alert">{t(errors.name)}</p>}
            </div>
            <div>
            <input className={fieldClass('phone')} placeholder={t('Phone number')} value={form.phone} onChange={set('phone')} aria-label={t('Phone number')} inputMode="numeric" autoComplete="tel" />
              {errors.phone && <p className="field-error" role="alert">{t(errors.phone)}</p>}
            </div>
            <div>
            <input className={fieldClass('email')} placeholder={t('Email address')} value={form.email} onChange={set('email')} aria-label={t('Email address')} type="email" autoComplete="email" />
              {errors.email && <p className="field-error" role="alert">{t(errors.email)}</p>}
            </div>
            <div className="co__grid2">
              <div>
                <select className={fieldClass('governorate')} value={form.governorate} onChange={set('governorate')} aria-label={t('Governorate')}>
                  <option value="">{t('Governorate')}</option>
                  {GOVERNORATES.map((g) => <option key={g} value={g}>{t(g)}</option>)}
                </select>
                {errors.governorate && <p className="field-error" role="alert">{t(errors.governorate)}</p>}
              </div>
              <div>
                <input className={fieldClass('city')} placeholder={t('City')} value={form.city} onChange={set('city')} aria-label={t('City')} />
                {errors.city && <p className="field-error" role="alert">{t(errors.city)}</p>}
              </div>
            </div>
            <div>
              <input className={fieldClass('address')} placeholder={t('Full address')} value={form.address} onChange={set('address')} aria-label={t('Full address')} autoComplete="street-address" />
              {errors.address && <p className="field-error" role="alert">{t(errors.address)}</p>}
            </div>
            <input className="field" placeholder={t('Apartment / Building')} value={form.apartment} onChange={set('apartment')} aria-label={t('Apartment or building')} />
            <textarea className="field" placeholder={t('Additional notes')} value={form.notes} onChange={set('notes')} aria-label={t('Additional notes')} rows={2} />
          </div>

          <h5>{t('Delivery method')}</h5>
          <div className="opts opts--3" role="radiogroup" aria-label={t('Delivery method')}>
            {DELIVERY_METHODS.map((m) => {
              const free = m.id === 'standard' && subtotal >= freeThreshold;
              return (
                <button type="button" key={m.id} className={`opt ${deliveryId === m.id ? 'opt--on' : ''}`}
                  role="radio" aria-checked={deliveryId === m.id} onClick={() => setDeliveryId(m.id)}>
                  {t(m.label)}, {t(m.eta.toLowerCase())}
                  <b>{free ? t('Free') : egp(m.price)}</b>
                </button>
              );
            })}
          </div>

          <h5>{t('Payment')}</h5>
          {paymentOptions.length > 0 ? <div className="opts opts--3" role="radiogroup" aria-label={t('Payment method')}>
            {paymentOptions.map((p) => (
              <button type="button" key={p.id} className={`opt ${paymentId === p.id ? 'opt--on' : ''}`}
                role="radio" aria-checked={paymentId === p.id} onClick={() => setPaymentId(p.id)}>
                {t(p.label)}
                <small>{t(p.note)}</small>
              </button>
            ))}
          </div> : <p className="field-error">{t('The store has no payment method enabled. Contact the store owner.')}</p>}

          {paymentId === 'instapay' && <div className="paynote">
            <p>{t('Transfer')} <b>{egp(total)}</b> {t('to this InstaPay account:')}</p>
            <p><code>{paymentConfig.account}</code>{paymentConfig.accountName ? ` · ${paymentConfig.accountName}` : ''}</p>
            <label className="co__fields">{t('Transfer reference')}<input className="field" value={paymentRef} onChange={(e) => { setPaymentRef(e.target.value); setErrors({ ...errors, paymentRef: undefined }); }} placeholder={t('Reference from your transfer')} /></label>
            {errors.paymentRef && <p className="field-error">{t(errors.paymentRef)}</p>}
            <small>{t('The store will confirm your transfer manually before preparing the order.')}</small>
          </div>}

          {paymentId === 'vodafone' && <div className="paynote">
            <p>{t('Transfer')} <b>{egp(total)}</b> {t('to this Vodafone Cash number:')}</p>
            <p><code>{paymentConfig.number}</code></p>
            <label className="co__fields">{t('Transfer reference')}<input className="field" value={paymentRef} onChange={(e) => { setPaymentRef(e.target.value); setErrors({ ...errors, paymentRef: undefined }); }} placeholder={t('Reference from your transfer')} /></label>
            {errors.paymentRef && <p className="field-error">{t(errors.paymentRef)}</p>}
            <small>{t('The store will confirm your transfer manually before preparing the order.')}</small>
          </div>}

          {errors.submit && <p className="field-error" role="alert">{t(errors.submit)}</p>}

          <button className="btn btn--dark btn--lg" type="submit" style={{ marginTop: 30 }} disabled={placing || paymentOptions.length === 0}>
            {placing ? t('Placing order…') : `${t('Place order')} · ${egp(total)}`}
          </button>
        </form>

        <aside className="sum" aria-label={t('Order summary')}>
          <h2>{t('Order summary')}</h2>
          {cart.map((l) => (
            <div className="sum__row" key={l.key}>
              <span>{l.product.name} × {l.qty}</span>
              <span>{egp(l.price * l.qty)}</span>
            </div>
          ))}
          <div className="sum__row"><span>{t('Delivery')}</span><span>{deliveryFee === 0 ? t('Free') : egp(deliveryFee)}</span></div>
          {promo && (
            <div className="sum__row">
              <span>{t('Promo')} {promo.code}</span>
              <span className="sum__discount">−{egp(discount)}</span>
            </div>
          )}
          <div className="sum__total"><span>{t('Total')}</span><span>{egp(total)}</span></div>
          <p className="sum__note">{t('Prices in Egyptian pounds.')} {paymentId === 'cod' ? t('Pay the courier when your order arrives.') : t('Your transfer will be manually verified by the store.')}</p>
        </aside>
      </div>
    </>
  );
}

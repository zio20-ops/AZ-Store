import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import * as auth from '../services/authService.js';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import { HomeIcon } from '../components/icons.jsx';
import * as orderService from '../services/orderService.js';
import { ORDER_STEPS } from '../data/content.js';
import { egp } from '../utils/format.js';
import { useSeo } from '../hooks/useSeo.js';
import '../styles/account.css';

function getOrderStage(status) {
  if (typeof status === 'number' && Number.isFinite(status)) return status;
  const value = String(status ?? '').trim();
  if (/^\d+$/.test(value)) return Number(value);
  const namedStage = ORDER_STEPS.indexOf(value);
  return namedStage >= 0 ? namedStage : 0;
}

export default function Account() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useStore();
  const [mode, setMode] = useState(location.pathname.endsWith('/signup') ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState('');
  const [orderToCancel, setOrderToCancel] = useState(null);
  const user = auth.getCurrentUser();
  const returnTo = typeof location.state?.returnTo === 'string'
    && location.state.returnTo.startsWith('/')
    && !location.state.returnTo.startsWith('//')
    ? location.state.returnTo
    : '/account';

  useSeo('Your account | AZ Store', 'Sign in or create your AZ Store account.');

  const loadCustomerOrders = useCallback(async () => {
    if (!user || user.isAdmin) { setCustomerOrders([]); return; }
    setOrdersLoading(true);
    setOrdersError('');
    try { setCustomerOrders(await orderService.listMyOrders()); }
    catch (loadError) { setOrdersError(loadError.message || 'Could not load your orders.'); }
    finally { setOrdersLoading(false); }
  }, [user?.uid, user?.isAdmin]);

  useEffect(() => {
    void loadCustomerOrders();
    const refreshOnReturn = () => { if (document.visibilityState === 'visible') void loadCustomerOrders(); };
    window.addEventListener('focus', refreshOnReturn);
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () => {
      window.removeEventListener('focus', refreshOnReturn);
      document.removeEventListener('visibilitychange', refreshOnReturn);
    };
  }, [loadCustomerOrders]);

  useEffect(() => {
    if (!orderToCancel) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !cancellingOrderId) setOrderToCancel(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [orderToCancel, cancellingOrderId]);

  const confirmCancelOrder = async () => {
    if (!orderToCancel || cancellingOrderId) return;
    const order = orderToCancel;
    setCancellingOrderId(order.id);
    setOrdersError('');
    try {
      const cancelled = await orderService.cancelMyOrder(order.id);
      setCustomerOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...cancelled } : item));
      toast(t('Your order has been cancelled.'));
      setOrderToCancel(null);
    } catch (cancelError) {
      setOrdersError(cancelError.message || 'Could not cancel this order. Please try again.');
      setOrderToCancel(null);
    } finally {
      setCancellingOrderId('');
    }
  };

  const onGoogleCredential = useCallback(async (credential) => {
    setBusy(true); setError('');
    const result = await auth.loginWithGoogle(credential);
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    navigate(returnTo, { replace: true });
  }, [navigate, returnTo]);

  if (user) return (
    <div className="auth">
      <section className="auth__card auth__card--profile">
        <Link to="/" className="auth__brand">AZ</Link>
        <span className="auth__eyebrow">{t("YOUR AZ STORE ACCOUNT")}</span>
        <h1>{t("Welcome back.")}</h1>
        <p>{t("Signed in as")} <b>{user.name}</b></p>
        <p className="auth__muted">{user.email}</p>
        <div className="auth__profile-links">
          <Link className="btn btn--ghost auth__home-link" to="/">
            <HomeIcon />
            <span>{t("Go to home")}</span>
          </Link>
          <Link className="btn" to="/wishlist">{t("Your wishlist")}</Link>
          <button className="btn btn--text" onClick={async () => { await auth.logoutCustomer(); toast('You have been signed out.'); navigate('/'); }}>{t("Sign out")}</button>
        </div>
        {!user.isAdmin && <section className="account-orders" aria-labelledby="account-orders-title">
          <div className="account-orders__heading">
            <div><span className="auth__eyebrow">{t("YOUR AZ STORE HISTORY")}</span><h2 id="account-orders-title">{t("Your orders")}</h2></div>
            <button type="button" onClick={loadCustomerOrders} disabled={ordersLoading}>{ordersLoading ? t("Refreshing…") : t("Refresh")}</button>
          </div>
          {ordersLoading && customerOrders.length === 0 && <p className="account-orders__empty">{t("Loading your orders…")}</p>}
          {ordersError && <p className="account-orders__error" role="alert">{ordersError}</p>}
          {!ordersLoading && !ordersError && customerOrders.length === 0 && <p className="account-orders__empty">{t("You haven’t placed an order yet. Orders placed while you’re signed in will appear here.")}</p>}
          <div className="account-orders__list">
            {customerOrders.map((order) => <article className="account-order" key={order.id}>
              <div className="account-order__top">
                <div className="account-order__identity"><span>{t("ORDER")}</span><b>{order.id}</b><small>{new Date(order.placedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</small></div>
                <div className="account-order__total"><span>{t("ORDER TOTAL")}</span><strong>{egp(order.total)}</strong></div>
              </div>
              <div className="account-order__items-wrap"><span className="account-order__label">{t("ITEMS")}</span><ul className="account-order__items">{(order.items || []).map((item, index) => <li key={`${item.productId || item.name}-${item.variationId || index}`}><b>{t(item.name)} × {item.qty}</b>{item.meta && <small>{t(item.meta)}</small>}</li>)}</ul></div>
              <div className="account-order__bottom">
                <div><span className="account-order__label">{t("ORDER STATUS")}</span><strong className={`account-order__status${order.cancelled ? ' is-cancelled' : ''}`}>{order.cancelled ? t("Cancelled") : t(ORDER_STEPS[Number(order.status)] || 'Order Received')}</strong></div>
                <div><span className="account-order__label">{t("PAYMENT")}</span><strong className="account-order__payment">{t(order.payment || 'Payment')} · {t(order.paymentStatus || 'Pending')}</strong></div>
              </div>
              {order.address && <p className="account-order__address"><b>{t("Delivery address")}</b><span>{order.address}</span></p>}
              {!order.cancelled && getOrderStage(order.status) < 2 && <div className="account-order__actions">
                <span>{t("You can cancel this order before preparation begins.")}</span>
                <button type="button" onClick={() => setOrderToCancel(order)} disabled={Boolean(cancellingOrderId)}>
                  {cancellingOrderId === order.id ? t("Cancelling…") : t("Cancel order")}
                </button>
              </div>}
            </article>)}
          </div>
        </section>}
      </section>
      {orderToCancel && (
        <div
          className="cancel-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !cancellingOrderId) setOrderToCancel(null);
          }}
        >
          <section
            className="cancel-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            aria-describedby="cancel-dialog-description"
          >
            <button
              className="cancel-dialog__close"
              type="button"
              aria-label={t('Close')}
              onClick={() => setOrderToCancel(null)}
              disabled={Boolean(cancellingOrderId)}
            >×</button>
            <span className="cancel-dialog__eyebrow">{t('YOUR AZ STORE HISTORY')}</span>
            <h2 id="cancel-dialog-title">{t('Cancel this order?')}</h2>
            <p id="cancel-dialog-description">
              {t('You are about to cancel order')} <code>{orderToCancel.id}</code>
            </p>
            {orderToCancel.payment && orderToCancel.payment !== 'Cash on delivery' && (
              <p className="cancel-dialog__warning">
                {t('If you have already transferred money, contact the store about your refund; refunds are not automatic.')}
              </p>
            )}
            <div className="cancel-dialog__actions">
              <button
                className="cancel-dialog__keep"
                type="button"
                autoFocus
                onClick={() => setOrderToCancel(null)}
                disabled={Boolean(cancellingOrderId)}
              >
                {t('Keep my order')}
              </button>
              <button
                className="cancel-dialog__confirm"
                type="button"
                onClick={confirmCancelOrder}
                disabled={Boolean(cancellingOrderId)}
              >
                {cancellingOrderId ? t('Cancelling…') : t('Confirm cancellation')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );

  const submit = async (event) => {
    event.preventDefault(); setError(''); setNotice('');
    if (mode === 'signup' && name.trim().length < 2) { setError('Please enter your name.'); return; }
    if (!email.trim()) { setError('Enter your email address.'); return; }
    if (mode !== 'reset' && !password) { setError('Enter your password.'); return; }
    if (mode === 'signup' && password.length < 8) { setError('Choose a password with at least 8 characters.'); return; }
    if (mode === 'signup' && !/[A-Za-z]/.test(password)) { setError('Add at least one letter to your password.'); return; }
    if (mode === 'signup' && !/\d/.test(password)) { setError('Add at least one number to your password.'); return; }
    if (mode === 'signup' && password !== confirmPassword) { setError('The passwords do not match.'); return; }
    if (mode === 'signup' && !accepted) { setError('Please accept the Terms & Conditions and Privacy Policy.'); return; }
    setBusy(true);
    const result = mode === 'signup'
      ? await auth.registerCustomer({ name, email, password })
      : mode === 'reset'
        ? await auth.resetCustomerPassword(email)
        : await auth.loginCustomer(email, password);
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    if (mode === 'signup') { navigate(returnTo, { replace: true }); return; }
    if (mode === 'reset') { setNotice('Password reset link sent. Check your email inbox.'); return; }
    navigate(returnTo, { replace: true });
  };

  return (
    <div className="auth">
      <section className="auth__card">
        <Link to="/" className="auth__brand">AZ</Link>
        <span className="auth__eyebrow">{t("AZ STORE · YOUR PERSONAL SPACE")}</span>
        <h1>{mode === 'signup' ? t("Create your account.") : mode === 'reset' ? t("Reset your password.") : t("Welcome back.")}</h1>
        <p className="auth__intro">{mode === 'signup' ? t("Save your favourites and enjoy a more personal AZ Store experience.") : t("Sign in to continue your AZ Store experience.")}</p>

        {error && <div className="auth__message auth__message--error" role="alert">{error}</div>}
        {notice && <div className="auth__message" role="status">{notice}</div>}

        {mode !== 'reset' && <>
          <GoogleSignInButton onCredential={onGoogleCredential} disabled={busy} />
          <div className="auth__divider"><span>{t("or continue with email")}</span></div>
        </>}

        <form className="auth__form" onSubmit={submit} noValidate>
          {mode === 'signup' && <label>{t("Full name")}<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Your name")} /></label>}
          <label>{t("Email address")}<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("you@example.com")} /></label>
          {mode !== 'reset' && <>
            <label>{t("Password")}<div className="auth__password"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} /><button type="button" onClick={() => setShowPassword((s) => !s)}>{showPassword ? t("Hide") : t("Show")}</button></div></label>
            {mode === 'signup' && <label>{t("Confirm password")}<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("Re-enter your password")} /></label>}
          </>}
          {mode === 'signup' && <label className="auth__consent"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /><span>{t("I agree to the")} <Link to="/terms">{t("Terms & Conditions")}</Link> {t("and")} <Link to="/privacy">{t("Privacy Policy")}</Link>.</span></label>}
          <button className="btn btn--primary btn--block auth__submit" type="submit" disabled={busy}>{busy ? t("Please wait…") : mode === 'signup' ? t("Create account") : mode === 'reset' ? t("Send reset link") : t("Sign in")}</button>
        </form>

        <div className="auth__links">
          {mode === 'login' && <button onClick={() => { setMode('reset'); setError(''); setNotice(''); }}>{t("Forgot password?")}</button>}
          {mode === 'reset' && <button onClick={() => { setMode('login'); setError(''); setNotice(''); }}>{t("Back to sign in")}</button>}
          {mode !== 'reset' && <p>{mode === 'signup' ? t("Already have an account?") : t("New to AZ Store?")} <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setNotice(''); }}>{mode === 'signup' ? t("Sign in") : t("Create account")}</button></p>}
        </div>
        <Link className="auth__back" to="/">{t("Continue shopping")}</Link>
      </section>
    </div>
  );
}

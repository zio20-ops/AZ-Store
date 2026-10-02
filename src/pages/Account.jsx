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

export default function Account() {
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
  const user = auth.getCurrentUser();

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

  const onGoogleCredential = useCallback(async (credential) => {
    setBusy(true); setError('');
    const result = await auth.loginWithGoogle(credential);
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    navigate('/account', { replace: true });
  }, [navigate]);

  if (user) return (
    <div className="auth">
      <section className="auth__card auth__card--profile">
        <Link to="/" className="auth__brand">AZ</Link>
        <span className="auth__eyebrow">YOUR AZ STORE ACCOUNT</span>
        <h1>Welcome back.</h1>
        <p>Signed in as <b>{user.name}</b></p>
        <p className="auth__muted">{user.email}</p>
        <div className="auth__profile-links">
          <Link className="btn btn--ghost auth__home-link" to="/">
            <HomeIcon />
            <span>Go to home</span>
          </Link>
          <Link className="btn" to="/wishlist">Your wishlist</Link>
          <button className="btn btn--text" onClick={async () => { await auth.logoutCustomer(); toast('You have been signed out.'); navigate('/'); }}>Sign out</button>
        </div>
        {!user.isAdmin && <section className="account-orders" aria-labelledby="account-orders-title">
          <div className="account-orders__heading">
            <div><span className="auth__eyebrow">YOUR AZ STORE HISTORY</span><h2 id="account-orders-title">Your orders</h2></div>
            <button type="button" onClick={loadCustomerOrders} disabled={ordersLoading}>{ordersLoading ? 'Refreshing…' : 'Refresh'}</button>
          </div>
          {ordersLoading && customerOrders.length === 0 && <p className="account-orders__empty">Loading your orders…</p>}
          {ordersError && <p className="account-orders__error" role="alert">{ordersError}</p>}
          {!ordersLoading && !ordersError && customerOrders.length === 0 && <p className="account-orders__empty">You haven’t placed an order yet. Orders placed while you’re signed in will appear here.</p>}
          <div className="account-orders__list">
            {customerOrders.map((order) => <article className="account-order" key={order.id}>
              <div className="account-order__top"><div><b>Order {order.id}</b><small>{new Date(order.placedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</small></div><strong>{egp(order.total)}</strong></div>
              <p className="account-order__items">{(order.items || []).map((item) => `${item.name} × ${item.qty}${item.meta ? ` · ${item.meta}` : ''}`).join(', ')}</p>
              <div className="account-order__bottom"><span>{order.cancelled ? 'Cancelled' : ORDER_STEPS[Number(order.status)] || 'Order Received'}</span><span>{order.payment || 'Payment'} · {order.paymentStatus || 'Pending'}</span></div>
              <p className="account-order__address">Delivery to {order.address}</p>
            </article>)}
          </div>
        </section>}
      </section>
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
    if (mode === 'signup') { navigate('/account', { replace: true }); return; }
    if (mode === 'reset') { setNotice('Password reset link sent. Check your email inbox.'); return; }
    navigate('/account', { replace: true });
  };

  return (
    <div className="auth">
      <section className="auth__card">
        <Link to="/" className="auth__brand">AZ</Link>
        <span className="auth__eyebrow">AZ STORE · YOUR PERSONAL SPACE</span>
        <h1>{mode === 'signup' ? 'Create your account.' : mode === 'reset' ? 'Reset your password.' : 'Welcome back.'}</h1>
        <p className="auth__intro">{mode === 'signup' ? 'Save your favourites and enjoy a more personal AZ Store experience.' : 'Sign in to continue your AZ Store experience.'}</p>

        {error && <div className="auth__message auth__message--error" role="alert">{error}</div>}
        {notice && <div className="auth__message" role="status">{notice}</div>}

        {mode !== 'reset' && <>
          <GoogleSignInButton onCredential={onGoogleCredential} disabled={busy} />
          <div className="auth__divider"><span>or continue with email</span></div>
        </>}

        <form className="auth__form" onSubmit={submit} noValidate>
          {mode === 'signup' && <label>Full name<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>}
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          {mode !== 'reset' && <>
            <label>Password<div className="auth__password"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} /><button type="button" onClick={() => setShowPassword((s) => !s)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
            {mode === 'signup' && <label>Confirm password<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" /></label>}
          </>}
          {mode === 'signup' && <label className="auth__consent"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /><span>I agree to the <Link to="/terms">Terms &amp; Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>.</span></label>}
          <button className="btn btn--primary btn--block auth__submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</button>
        </form>

        <div className="auth__links">
          {mode === 'login' && <button onClick={() => { setMode('reset'); setError(''); setNotice(''); }}>Forgot password?</button>}
          {mode === 'reset' && <button onClick={() => { setMode('login'); setError(''); setNotice(''); }}>Back to sign in</button>}
          {mode !== 'reset' && <p>{mode === 'signup' ? 'Already have an account?' : 'New to AZ Store?'} <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setNotice(''); }}>{mode === 'signup' ? 'Sign in' : 'Create account'}</button></p>}
        </div>
        <Link className="auth__back" to="/">Continue shopping</Link>
      </section>
    </div>
  );
}

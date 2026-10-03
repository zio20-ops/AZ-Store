import { useCallback, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext.jsx';
import * as auth from '../services/authService.js';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import { useSeo } from '../hooks/useSeo.js';
import '../styles/account.css';
import { useLanguage } from '../i18n/LanguageContext.jsx';

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
  const user = auth.getCurrentUser();

  useSeo('Your account | AZ Store', 'Sign in or create your AZ Store account.');

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
        <span className="auth__eyebrow">{t('YOUR AZ STORE ACCOUNT')}</span>
        <h1>{t('Welcome back.')}</h1>
        <p>{t('Signed in as')} <b>{user.name}</b></p>
        <p className="auth__muted">{user.email}</p>
        <div className="auth__profile-links">
          <Link className="btn" to="/wishlist">{t('Your wishlist')}</Link>
          <button className="btn btn--text" onClick={async () => { await auth.logout(); toast(t('You have been signed out.')); navigate('/'); }}>{t('Sign out')}</button>
        </div>
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
    if (mode === 'signup') { setMode('login'); setNotice('Account created. Check your inbox and verify your email, then sign in.'); return; }
    if (mode === 'reset') { setNotice('Password reset link sent. Check your email inbox.'); return; }
    navigate('/account', { replace: true });
  };

  return (
    <div className="auth">
      <section className="auth__card">
        <Link to="/" className="auth__brand">AZ</Link>
        <span className="auth__eyebrow">{t('AZ STORE · YOUR PERSONAL SPACE')}</span>
        <h1>{t(mode === 'signup' ? 'Create your account.' : mode === 'reset' ? 'Reset your password.' : 'Welcome back.')}</h1>
        <p className="auth__intro">{t(mode === 'signup' ? 'Save your favourites and enjoy a more personal AZ Store experience.' : 'Sign in to continue your AZ Store experience.')}</p>

        {error && <div className="auth__message auth__message--error" role="alert">{t(error)}</div>}
        {notice && <div className="auth__message" role="status">{t(notice)}</div>}

        {mode !== 'reset' && <>
          <GoogleSignInButton onCredential={onGoogleCredential} disabled={busy} />
          <div className="auth__divider"><span>{t('or continue with email')}</span></div>
        </>}

        <form className="auth__form" onSubmit={submit} noValidate>
          {mode === 'signup' && <label>{t('Full name')}<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Your name')} /></label>}
          <label>{t('Email address')}<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('you@example.com')} /></label>
          {mode !== 'reset' && <>
            <label>{t('Password')}<div className="auth__password"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t(mode === 'signup' ? 'At least 8 characters' : 'Your password')} /><button type="button" onClick={() => setShowPassword((s) => !s)}>{t(showPassword ? 'Hide' : 'Show')}</button></div></label>
            {mode === 'signup' && <label>{t('Confirm password')}<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t('Re-enter your password')} /></label>}
          </>}
          {mode === 'signup' && <label className="auth__consent"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /><span>{t('I agree to the')} <Link to="/terms">{t('Terms & Conditions')}</Link> {t('and')} <Link to="/privacy">{t('Privacy Policy')}</Link>.</span></label>}
          <button className="btn btn--primary btn--block auth__submit" type="submit" disabled={busy}>{t(busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in')}</button>
        </form>

        <div className="auth__links">
          {mode === 'login' && <button onClick={() => { setMode('reset'); setError(''); setNotice(''); }}>{t('Forgot password?')}</button>}
          {mode === 'reset' && <button onClick={() => { setMode('login'); setError(''); setNotice(''); }}>{t('Back to sign in')}</button>}
          {mode !== 'reset' && <p>{t(mode === 'signup' ? 'Already have an account?' : 'New to AZ Store?')} <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setNotice(''); }}>{t(mode === 'signup' ? 'Sign in' : 'Create account')}</button></p>}
        </div>
        <Link className="auth__back" to="/">{t('Continue shopping')}</Link>
      </section>
    </div>
  );
}

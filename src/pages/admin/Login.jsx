import { useCallback, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as auth from '../../services/authService.js';
import '../../styles/admin.css';
import GoogleSignInButton from '../../components/GoogleSignInButton.jsx';
import LanguageToggle from '../../components/LanguageToggle.jsx';
import { useLanguage } from '../../i18n/LanguageContext.jsx';

export default function AdminLogin() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(auth.ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('login');

  const onGoogleCredential = useCallback(async (credential) => {
    setBusy(true); setError('');
    try {
      const result = await auth.loginAdminWithGoogle(credential, remember);
      if (!result.ok) { setError(result.message); return; }
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) { setError(err.message || 'Google sign-in failed. Please try again.'); }
    finally { setBusy(false); }
  }, [location.state?.from, navigate, remember]);

  if (auth.me()) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault(); setError(''); setNotice('');
    if (!email.trim() || (mode !== 'reset' && !password)) { setError(t('Enter your admin email and password.')); return; }
    setBusy(true);
    const result = mode === 'register' ? await auth.register(email, password)
      : mode === 'reset' ? await auth.resetPassword(email) : await auth.login(email, password, remember);
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    if (mode === 'register') { setNotice('Admin account created. Open your email and verify the address before signing in.'); return; }
    if (mode === 'reset') { setNotice('Password reset link sent. Check your email inbox.'); return; }
    navigate(location.state?.from || '/admin', { replace: true });
  };

  return (
    <div className="adlogin">
      <div className="adlogin__box">
        <div className="adlogin__language"><LanguageToggle /></div>
        <div className="adlogin__logo">AZ</div>
        <h1>{t('Admin Portal')}</h1>
        <p>{t('Sign in to manage products, orders and inventory.')}</p>
        {error && <div className="adlogin__err" role="alert">{t(error)}</div>}
        {notice && <div className="adlogin__err" role="status">{t(notice)}</div>}

        {mode === 'login' && <GoogleSignInButton onCredential={onGoogleCredential} disabled={busy} />}
        {mode === 'login' && <div style={{ textAlign: 'center', margin: '10px 0', opacity: 0.55 }}>{t('or use email and password')}</div>}
        <form onSubmit={submit} noValidate>
          <div className="adfield"><label htmlFor="ad-email">{t('Email')}</label>
            <input id="ad-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={auth.ADMIN_EMAIL} /></div>
          {mode !== 'reset' && <div className="adfield">
            <label htmlFor="ad-pw">{t(mode === 'register' ? 'Create password' : 'Password')}</label>
            <div className="adlogin__pw">
              <input id="ad-pw" type={showPw ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={t(showPw ? 'Hide password' : 'Show password')}>{t(showPw ? 'Hide' : 'Show')}</button>
            </div>
          </div>}
          {mode === 'login' && <label className="adcheck" style={{ margin: '4px 0 18px' }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> {t('Remember me on this device')}
          </label>}
          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {t(busy ? 'Please wait…' : mode === 'register' ? 'Create admin account' : mode === 'reset' ? 'Send reset link' : 'Login')}
          </button>
        </form>
        <div className="adlogin__demo">
          {mode !== 'login' ? <button type="button" className="btn btn--text" onClick={() => { setMode('login'); setError(''); setNotice(''); }}>{t('Back to login')}</button> : <>
            <button type="button" className="btn btn--text" onClick={() => { setMode('register'); setError(''); setNotice(''); }}>{t('First time? Create the admin account')}</button>
            <button type="button" className="btn btn--text" onClick={() => { setMode('reset'); setError(''); setNotice(''); }}>{t('Forgot password?')}</button>
          </>}
          {mode === 'register' && <small>{t('Only the authorized admin email can create this account. Email verification is required.')}</small>}
        </div>
      </div>
    </div>
  );
}

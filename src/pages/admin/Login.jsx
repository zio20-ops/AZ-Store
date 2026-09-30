import { useCallback, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as auth from '../../services/authService.js';
import '../../styles/admin.css';
import GoogleSignInButton from '../../components/GoogleSignInButton.jsx';

export default function AdminLogin() {
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
    if (!email.trim() || (mode !== 'reset' && !password)) { setError('Enter your admin email and password.'); return; }
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
        <div className="adlogin__logo">AZ</div>
        <h1>Admin Portal</h1>
        <p>Sign in to manage products, orders and inventory.</p>
        {error && <div className="adlogin__err" role="alert">{error}</div>}
        {notice && <div className="adlogin__err" role="status">{notice}</div>}

        {mode === 'login' && <GoogleSignInButton onCredential={onGoogleCredential} disabled={busy} />}
        {mode === 'login' && <div style={{ textAlign: 'center', margin: '10px 0', opacity: 0.55 }}>or use email and password</div>}
        <form onSubmit={submit} noValidate>
          <div className="adfield"><label htmlFor="ad-email">Email</label>
            <input id="ad-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={auth.ADMIN_EMAIL} /></div>
          {mode !== 'reset' && <div className="adfield">
            <label htmlFor="ad-pw">{mode === 'register' ? 'Create password' : 'Password'}</label>
            <div className="adlogin__pw">
              <input id="ad-pw" type={showPw ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••" />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? 'Hide' : 'Show'}</button>
            </div>
          </div>}
          {mode === 'login' && <label className="adcheck" style={{ margin: '4px 0 18px' }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me on this device
          </label>}
          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'register' ? 'Create admin account' : mode === 'reset' ? 'Send reset link' : 'Login'}
          </button>
        </form>
        <div className="adlogin__demo">
          {mode !== 'login' ? <button type="button" className="btn btn--text" onClick={() => { setMode('login'); setError(''); setNotice(''); }}>Back to login</button> : <>
            <button type="button" className="btn btn--text" onClick={() => { setMode('register'); setError(''); setNotice(''); }}>First time? Create the admin account</button>
            <button type="button" className="btn btn--text" onClick={() => { setMode('reset'); setError(''); setNotice(''); }}>Forgot password?</button>
          </>}
          {mode === 'register' && <small>Only the authorized admin email can create this account. Email verification is required.</small>}
        </div>
      </div>
    </div>
  );
}

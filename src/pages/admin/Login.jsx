import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as auth from '../../services/authService.js';
import '../../styles/admin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (auth.me()) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your admin email and password.');
      return;
    }
    setBusy(true);
    const result = await auth.login(email, password, remember);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate(location.state?.from || '/admin', { replace: true });
  };

  return (
    <div className="adlogin">
      <div className="adlogin__box">
        <div className="adlogin__logo">AZ</div>
        <h1>Admin Portal</h1>
        <p>Sign in to manage products, orders and inventory.</p>

        {error && <div className="adlogin__err" role="alert">{error}</div>}

        <form onSubmit={submit} noValidate>
          <div className="adfield">
            <label htmlFor="ad-email">Email</label>
            <input
              id="ad-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@azstore.eg"
            />
          </div>
          <div className="adfield">
            <label htmlFor="ad-pw">Password</label>
            <div className="adlogin__pw">
              <input
                id="ad-pw"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <label className="adcheck" style={{ margin: '4px 0 18px' }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember me on this device
          </label>
          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p className="adlogin__demo">
          Development mock auth — no real backend yet. Demo access: <code>{auth.DEMO_EMAIL}</code> / <code>{auth.DEMO_PASSWORD}</code>.
          Sessions expire automatically; production will use hashed credentials and http-only cookies.
        </p>
      </div>
    </div>
  );
}

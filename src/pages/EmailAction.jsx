import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo.js';
import * as auth from '../services/authService.js';
import '../styles/account.css';

export default function EmailAction() {
  const [params] = useSearchParams();
  const [state, setState] = useState('ready');
  const [error, setError] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const mode = params.get('mode');
  const code = params.get('oobCode');
  const validLink = mode === 'verifyEmail' && Boolean(code);
  useSeo('Verify your email | AZ Store', 'Confirm your email address for your AZ Store account.');

  const verify = async () => {
    setState('working');
    setError('');
    try {
      await auth.applyEmailVerificationAction(code);
      setState('done');
    } catch (verificationError) {
      setError(verificationError.message || 'Firebase could not verify this email.');
      setState('failed');
    }
  };

  const resend = async (event) => {
    event.preventDefault();
    setResendError('');
    setResendMessage('');
    setResending(true);
    const result = await auth.resendCustomerVerification(email.trim(), password);
    setResending(false);
    if (!result.ok) {
      setResendError(result.message || 'Firebase could not send a new verification link.');
      return;
    }
    if (result.user) {
      navigate('/account', { replace: true });
      return;
    }
    setPassword('');
    setResendMessage('Firebase sent a new verification email. Open the newest message and press Verify email.');
  };

  return (
    <div className="auth">
      <section className="auth__card">
        <Link to="/" className="auth__brand">AZ</Link>
        <span className="auth__eyebrow">AZ STORE · EMAIL VERIFICATION</span>
        <h1>{state === 'done' ? 'Email verified.' : state === 'failed' ? 'This link needs attention.' : 'Confirm your email.'}</h1>
        {state === 'ready' && validLink && <>
          <p className="auth__intro">Press the button below to verify your address and finish setting up your account.</p>
          <button className="btn btn--primary btn--block auth__submit" type="button" onClick={verify}>Verify email</button>
        </>}
        {state === 'working' && <p className="auth__intro" role="status">Checking your link with Firebase…</p>}
        {state === 'done' && <>
          <div className="auth__message" role="status">Your email is confirmed. You can now sign in to AZ Store.</div>
          <Link className="btn btn--primary btn--block auth__submit" to="/account/login">Go to sign in</Link>
        </>}
        {state === 'failed' && <>
          <div className="auth__message auth__message--error" role="alert">{error}</div>
          <p className="auth__intro">If you already used this link, try signing in. Otherwise, send yourself a fresh verification email and open the newest link once.</p>
          <Link className="btn btn--primary btn--block auth__submit" to="/account/login">Go to sign in</Link>
          {!showResend ? <button className="btn btn--ghost btn--block auth__submit" type="button" onClick={() => setShowResend(true)}>Resend verification email</button> : (
            <form className="auth__form auth__resend" onSubmit={resend}>
              <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
              <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your account password" /></label>
              {resendError && <div className="auth__message auth__message--error" role="alert">{resendError}</div>}
              {resendMessage && <div className="auth__message" role="status">{resendMessage}</div>}
              <button className="btn btn--primary btn--block auth__submit" type="submit" disabled={resending}>{resending ? 'Sending…' : 'Send a new verification email'}</button>
            </form>
          )}
        </>}
        {!validLink && state === 'ready' && <>
          <div className="auth__message auth__message--error" role="alert">This is not a complete email verification link.</div>
          <p className="auth__intro">Return to AZ Store and request a fresh verification email.</p>
          <Link className="btn btn--primary btn--block auth__submit" to="/account/login">Go to sign in</Link>
        </>}
        <Link className="auth__back" to="/">Continue shopping</Link>
      </section>
    </div>
  );
}

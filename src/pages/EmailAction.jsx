import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSeo } from '../hooks/useSeo.js';
import * as auth from '../services/authService.js';
import '../styles/account.css';

export default function EmailAction() {
  const [params] = useSearchParams();
  const [state, setState] = useState('ready');
  const [error, setError] = useState('');
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
          <p className="auth__intro">Email verification is no longer required. You can sign in with your email and password.</p>
          <Link className="btn btn--primary btn--block auth__submit" to="/account/login">Go to sign in</Link>
        </>}
        {!validLink && state === 'ready' && <>
          <div className="auth__message auth__message--error" role="alert">This is not a complete email verification link.</div>
          <p className="auth__intro">Email verification is no longer required. You can sign in with your email and password.</p>
          <Link className="btn btn--primary btn--block auth__submit" to="/account/login">Go to sign in</Link>
        </>}
        <Link className="auth__back" to="/">Continue shopping</Link>
      </section>
    </div>
  );
}

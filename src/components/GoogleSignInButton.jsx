import { useLanguage } from '../i18n/LanguageContext.jsx';
import { useEffect, useRef, useState } from 'react';
import { googleClientId } from '../services/firebaseConfig.js';

export default function GoogleSignInButton({ onCredential, disabled }) {
  const { t } = useLanguage();
  const mountRef = useRef(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!googleClientId) return undefined;
    let live = true;
    const initialize = () => {
      if (!live || !window.google?.accounts?.id || !mountRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => response.credential && callbackRef.current(response.credential),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(mountRef.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 340 });
      setReady(true);
    };
    const existing = document.querySelector('script[data-google-identity]');
    if (existing) {
      if (window.google?.accounts?.id) initialize();
      else existing.addEventListener('load', initialize, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true; script.defer = true; script.dataset.googleIdentity = 'true';
      script.onload = initialize;
      script.onerror = () => live && setFailed(true);
      document.head.appendChild(script);
    }
    return () => { live = false; };
  }, []);

  if (!googleClientId) return <p className="auth__setup-note">{t("Google sign-in needs a Google OAuth client ID in Vercel before it can be enabled.")}</p>;
  return <div className={`auth__google ${disabled ? 'auth__google--disabled' : ''}`}>
    <div ref={mountRef} />
    {!ready && !failed && <span>{t("Loading Google sign-in…")}</span>}
    {failed && <span>{t("Google sign-in could not load. Check your connection.")}</span>}
  </div>;
}

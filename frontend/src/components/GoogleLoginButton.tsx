import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORED_ID_TOKEN_KEY = 'google_id_token';

/** Google Sign-In iframe width in px — must never exceed the measured row or the outline clips. */
const GSI_WIDTH_MAX = 400;

export function GoogleLoginButton({
  onLogin,
  onSignInIntent,
}: {
  onLogin: (token: string) => void
  /** Clears stale UI errors as soon as the user starts the Google flow (click or credential return). */
  onSignInIntent?: () => void
}) {
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loginHint, setLoginHint] = useState<string | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [gsiWidth, setGsiWidth] = useState(320);

  useEffect(() => {
    const storedToken = localStorage.getItem(STORED_ID_TOKEN_KEY);
    if (storedToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIdToken(storedToken);
      onLogin(storedToken);
    }
  }, [onLogin]);

  useLayoutEffect(() => {
    if (idToken) {
      return;
    }

    const el = measureRef.current;
    if (!el) {
      return;
    }

    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (!w) {
        return;
      }
      // Never wider than the container (required). No artificial floor — a floor above container width caused clipping on narrow viewports.
      const next = Math.min(GSI_WIDTH_MAX, Math.floor(w));
      setGsiWidth((prev) => (prev === next ? prev : next));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [idToken]);

  const handleLogout = () => {
    googleLogout();
    localStorage.removeItem(STORED_ID_TOKEN_KEY);
    setIdToken(null);
    onLogin('');
    window.location.reload();
  };

  if (idToken) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={handleLogout}
        className="glass-inset gap-2 rounded-xl text-muted hover:bg-white/85 hover:text-ink"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Log out
      </Button>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-2.5">
      <div ref={measureRef} className="flex w-full min-w-0 justify-center overflow-visible">
        <GoogleLogin
          click_listener={() => {
            onSignInIntent?.()
          }}
          onSuccess={(credentialResponse) => {
            const credential = credentialResponse.credential;
            if (!credential) {
              return;
            }

            onSignInIntent?.()
            setLoginHint(null);
            localStorage.setItem(STORED_ID_TOKEN_KEY, credential);
            setIdToken(credential);
            onLogin(credential);
          }}
          onError={() => {
            console.error('Google sign-in failed.');
            setLoginHint(
              'Sign-in did not complete. Allow pop-ups for localhost, try again, and confirm this exact URL (including port) is an Authorized JavaScript origin for your OAuth client.',
            );
          }}
          useOneTap={false}
          text="signin_with"
          shape="rectangular"
          theme="outline"
          size="large"
          logo_alignment="left"
          width={gsiWidth}
          containerProps={{
            className:
              'flex min-w-0 shrink-0 justify-center overflow-visible [&_iframe]:mx-0 [&_iframe]:block [&_iframe]:max-h-none',
            style: { height: 'auto', minHeight: 52 },
          }}
        />
      </div>
      {loginHint ? (
        <p role="alert" className="w-full max-w-md text-center text-xs leading-relaxed text-amber-900">
          {loginHint}
        </p>
      ) : (
        <p className="w-full max-w-md text-center text-xs leading-relaxed text-muted">
          If the Google prompt does not appear, allow pop-ups or third-party sign-in for localhost.
        </p>
      )}
    </div>
  );
}

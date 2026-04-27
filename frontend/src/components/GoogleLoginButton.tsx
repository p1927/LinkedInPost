import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORED_ID_TOKEN_KEY = 'google_id_token';
const GSI_WIDTH_MAX = 400;

export function GoogleLoginButton({
  onLogin,
  onSignInIntent,
}: {
  onLogin: (token: string) => void
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
    if (idToken) return;
    const el = measureRef.current;
    if (!el) return;

    const MIN_WIDTH_DELTA_PX = 12;
    const DEBOUNCE_MS = 120;
    const lastCommittedRef = { current: null as number | null };
    let debounceId: ReturnType<typeof setTimeout> | undefined;

    const measure = (force: boolean) => {
      const w = el.getBoundingClientRect().width;
      if (!w) return;
      const next = Math.min(GSI_WIDTH_MAX, Math.floor(w));
      const prev = lastCommittedRef.current;
      if (!force && prev !== null && Math.abs(next - prev) < MIN_WIDTH_DELTA_PX) return;
      lastCommittedRef.current = next;
      setGsiWidth((p) => (p === next ? p : next));
    };

    measure(true);
    const schedule = () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => measure(false), DEBOUNCE_MS);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(debounceId); };
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
    <div className="flex w-full min-w-0 flex-col items-center gap-2">
      {/* Single transparent measure container — no decorative borders */}
      <div ref={measureRef} className="flex w-full min-w-0 justify-center">
        <GoogleLogin
          click_listener={() => onSignInIntent?.()}
          onSuccess={(credentialResponse) => {
            const credential = credentialResponse.credential;
            if (!credential) return;
            onSignInIntent?.();
            setLoginHint(null);
            localStorage.setItem(STORED_ID_TOKEN_KEY, credential);
            setIdToken(credential);
            onLogin(credential);
          }}
          onError={() => {
            console.error('Google sign-in failed.');
            setLoginHint(
              'Sign-in did not complete. Allow pop-ups for this site, then try again.',
            );
          }}
          useOneTap={false}
          text="signin_with"
          shape="pill"
          theme="filled_blue"
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
      {loginHint && (
        <p role="alert" className="w-full max-w-md text-center text-xs leading-relaxed text-amber-900">
          {loginHint}
        </p>
      )}
    </div>
  );
}

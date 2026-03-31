import { useEffect, useState } from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORED_ID_TOKEN_KEY = 'google_id_token';

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

  useEffect(() => {
    const storedToken = localStorage.getItem(STORED_ID_TOKEN_KEY);
    if (storedToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIdToken(storedToken);
      onLogin(storedToken);
    }
  }, [onLogin]);

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
    <div className="flex w-full min-w-0 max-w-sm flex-col items-center justify-center gap-2.5 sm:w-auto">
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
        width={384}
        containerProps={{
          className:
            'flex w-full max-w-full items-center justify-center overflow-visible [&_iframe]:mx-auto [&_iframe]:block [&_iframe]:max-h-none [&_iframe]:max-w-full',
          style: { height: 'auto', minHeight: 52 },
        }}
      />
      {loginHint ? (
        <p role="alert" className="max-w-[min(100%,22rem)] text-center text-xs leading-relaxed text-amber-900">
          {loginHint}
        </p>
      ) : (
        <p className="max-w-[min(100%,22rem)] text-center text-xs leading-relaxed text-muted">
          If the Google prompt does not appear, allow pop-ups or third-party sign-in for localhost.
        </p>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORED_ID_TOKEN_KEY = 'google_id_token';

export function GoogleLoginButton({ onLogin }: { onLogin: (token: string) => void }) {
  const [idToken, setIdToken] = useState<string | null>(null);

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
        onClick={handleLogout}
        className="glass-inset flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition-colors duration-200 hover:bg-white/85 hover:text-ink"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Log out
      </Button>
    );
  }

  return (
    <div className="glass-panel rounded-full p-1 shadow-sm transition-shadow duration-200 hover:shadow-card">
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          const credential = credentialResponse.credential;
          if (!credential) {
            return;
          }

          localStorage.setItem(STORED_ID_TOKEN_KEY, credential);
          setIdToken(credential);
          onLogin(credential);
        }}
        onError={() => {
          console.error('Google sign-in failed.');
        }}
        useOneTap={false}
        text="signin_with"
        shape="pill"
        theme="outline"
      />
    </div>
  );
}

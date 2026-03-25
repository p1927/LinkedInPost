import { useEffect, useState } from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { LogOut } from 'lucide-react';

const STORED_ID_TOKEN_KEY = 'google_id_token';

export function GoogleLoginButton({ onLogin }: { onLogin: (token: string) => void }) {
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem(STORED_ID_TOKEN_KEY);
    if (storedToken) {
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
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    );
  }

  return (
    <div className="rounded-md bg-white p-1 shadow-sm ring-1 ring-gray-200">
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
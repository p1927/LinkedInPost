import { useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { LogOut, LogIn } from 'lucide-react';

export function GoogleLoginButton({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('google_access_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      onLogin(token);
    }
  }, [token, onLogin]);

  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      const accessToken = codeResponse.access_token;
      localStorage.setItem('google_access_token', accessToken);
      setToken(accessToken);
      onLogin(accessToken);
    },
    onError: (error) => console.log('Login Failed:', error),
    // Request scopes for Google Sheets, Docs, and the hidden app-data folder (stores config securely)
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.appdata',
    // Force Google to show the consent screen (useful for granting new scopes or re-authorizing)
    prompt: 'consent',
    include_granted_scopes: false,
  });

  const handleLogout = () => {
    googleLogout();
    localStorage.removeItem('google_access_token');
    setToken(null);
    onLogin('');
    // Need a tiny delay for state updates before refresh
    setTimeout(() => window.location.reload(), 100);
  };

  if (token) {
    return (
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-md hover:bg-red-100 transition-colors font-medium text-sm"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    );
  }

  return (
    <button
      onClick={() => login()}
      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
    >
      <LogIn className="w-4 h-4" />
      Sign in with Google
    </button>
  );
}
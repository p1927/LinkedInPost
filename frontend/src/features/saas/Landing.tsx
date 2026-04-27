import { useState } from 'react';
import { BackendApi } from '../../services/backendApi';

const api = new BackendApi();

export default function Landing({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.submitWaitlist(email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">LinkedIn Post Studio</h1>
        <p className="text-muted-foreground text-lg">
          AI-powered content calendar for LinkedIn, Instagram, and more. Write once, publish everywhere.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onLogin}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition"
          >
            Sign in with Google
          </button>
        </div>

        <div className="border rounded-xl p-6 text-left space-y-4">
          <h2 className="font-semibold text-lg">Request access</h2>
          {submitted ? (
            <p className="text-green-600 dark:text-green-400">
              Done! You are on the list. Expect an email within a few days.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition disabled:opacity-50"
              >
                Join waitlist
              </button>
            </form>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGitHubLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (authError) throw authError;
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
      setLoading(false);
    }
  };

  const handleDeveloperBypass = () => {
    // Set a dev session indicator in localStorage and redirect to dashboard
    localStorage.setItem('gitpulse_dev_session', 'true');
    window.location.href = '/dashboard';
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '450px',
        width: '100%',
        padding: '3rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        <div>
          <div className="logo" style={{ justifyContent: 'center', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            <span>⚡</span> GitPulse
          </div>
          <p style={{ fontSize: '0.95rem' }}>
            Connect your repositories, configure custom automation rules, and triage with Google Gemini AI.
          </p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', width: '100%', justifyContent: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={handleGitHubLogin}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
          >
            {loading ? 'Connecting...' : 'Sign In with GitHub'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'hsl(var(--border-color))' }}></div>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'hsl(var(--border-color))' }}></div>
          </div>

          <button
            onClick={handleDeveloperBypass}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
          >
            Developer Mode Bypass
          </button>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
          Note: Developer Mode allows local review of UI, rules dashboard, and testing endpoints without setting up Supabase authentication.
        </p>
      </div>
    </div>
  );
}

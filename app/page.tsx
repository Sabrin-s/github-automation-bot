'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LandingPage() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if session or dev session exists
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const hasDevSession = localStorage.getItem('gitpulse_dev_session') === 'true';
      
      if (data?.session || hasDevSession) {
        setIsAuthenticated(true);
      }
      setSessionChecked(true);
    };
    checkAuth();
  }, []);

  if (!sessionChecked) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="pulse" style={{ fontSize: '1.25rem' }}>Loading GitPulse...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          <span>⚡</span> GitPulse
        </div>
        <div>
          {isAuthenticated ? (
            <a href="/dashboard" className="btn btn-primary">Go to Dashboard</a>
          ) : (
            <a href="/login" className="btn btn-primary">Sign In</a>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem 1.5rem', textAlign: 'center', gap: '2rem' }}>
        <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h1 style={{ fontSize: '3.5rem', lineHeight: '1.1', background: 'linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Event-Driven GitHub Automation, Powered by AI
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'hsl(var(--text-secondary))', maxWidth: '600px', margin: '0 auto' }}>
            Automate issues, pull requests, label routing, and notify Slack. Keep your repository secure, clean, and interactive.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href={isAuthenticated ? '/dashboard' : '/login'} className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1rem' }}>
            Get Started Free
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1rem' }}>
            View GitHub App
          </a>
        </div>

        {/* Feature Highlights */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1000px', marginTop: '4rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'white' }}>⚡ Event Webhooks</h3>
            <p style={{ fontSize: '0.9rem' }}>Real-time listener for GitHub repository actions, securing payloads and executing rules instantly.</p>
          </div>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'white' }}>🤖 Gemini AI Triage</h3>
            <p style={{ fontSize: '0.9rem' }}>Generate summaries, auto-determine importance levels, and suggest relevant routing labels automatically.</p>
          </div>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'white' }}>💬 Slack Workflows</h3>
            <p style={{ fontSize: '0.9rem' }}>Send rich notifications directly to channels, summarizing triage decisions and links immediately.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid hsl(var(--border-color))', fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
        &copy; {new Date().getFullYear()} GitPulse. All rights reserved.
      </footer>
    </div>
  );
}

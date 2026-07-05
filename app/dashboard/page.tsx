'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Rule {
  id: string;
  event_type: 'issues' | 'pull_request';
  trigger_field: 'title' | 'body' | 'author';
  operator: 'contains' | 'equals' | 'matches_regex';
  match_value: string;
  action_type: 'add_label' | 'post_comment';
  action_value: string;
  slack_notify: boolean;
  ai_triage: boolean;
  is_active: boolean;
}

interface EventLog {
  id: string;
  delivery_id: string;
  event_type: string;
  repository: string;
  payload: any;
  status: 'pending' | 'processed' | 'failed';
  error_log?: string;
  ai_summary?: string;
  created_at: string;
  actions?: ActionLog[];
}

interface ActionLog {
  id: string;
  action_type: string;
  status: 'success' | 'failed';
  response_payload?: any;
  created_at: string;
}

// Beautiful sample mock data for demonstration if DB not configured
const MOCK_RULES: Rule[] = [
  {
    id: 'rule-1',
    event_type: 'issues',
    trigger_field: 'title',
    operator: 'contains',
    match_value: 'bug',
    action_type: 'add_label',
    action_value: 'bug',
    slack_notify: true,
    ai_triage: true,
    is_active: true,
  },
  {
    id: 'rule-2',
    event_type: 'pull_request',
    trigger_field: 'title',
    operator: 'matches_regex',
    match_value: '^feat:',
    action_type: 'post_comment',
    action_value: 'Thank you for contributing a new feature! Our team will review this shortly.',
    slack_notify: false,
    ai_triage: true,
    is_active: true,
  }
];

const MOCK_LOGS: EventLog[] = [
  {
    id: 'log-1',
    delivery_id: 'del-9385-2341',
    event_type: 'issues',
    repository: 'octocat/hello-world',
    payload: {
      action: 'opened',
      issue: {
        number: 42,
        title: 'Critical security vulnerability in auth router',
        body: 'A bug allows unauthorized token usage under specific conditions.',
        user: { login: 'security-researcher' },
        html_url: 'https://github.com/octocat/hello-world/issues/42'
      }
    },
    status: 'processed',
    ai_summary: '[Priority: high] Triage: Critical auth vulnerability identified. Requires immediate attention.',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    actions: [
      {
        id: 'act-1',
        action_type: 'add_label',
        status: 'success',
        response_payload: { label: 'security', aiLabel: 'bug' },
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      },
      {
        id: 'act-2',
        action_type: 'slack_notify',
        status: 'success',
        response_payload: { notified: true },
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      }
    ]
  },
  {
    id: 'log-2',
    delivery_id: 'del-9385-2342',
    event_type: 'pull_request',
    repository: 'octocat/hello-world',
    payload: {
      action: 'opened',
      pull_request: {
        number: 43,
        title: 'feat: add dark mode support to frontend panels',
        body: 'Implements HSL variable-based dark theme toggling.',
        user: { login: 'designer-dev' },
        html_url: 'https://github.com/octocat/hello-world/pull/43'
      }
    },
    status: 'processed',
    ai_summary: '[Priority: medium] Triage: Feature addition for dark mode styling assets.',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    actions: [
      {
        id: 'act-3',
        action_type: 'post_comment',
        status: 'success',
        response_payload: { commentBody: 'Thank you for contributing a new feature! Our team will review this shortly.' },
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      }
    ]
  },
  {
    id: 'log-3',
    delivery_id: 'del-9385-2343',
    event_type: 'issues',
    repository: 'octocat/hello-world',
    payload: {
      action: 'opened',
      issue: {
        number: 44,
        title: 'Broken button alignment in IE11',
        body: 'The login page buttons wrap on older browsers.',
        user: { login: 'legacy-user' },
        html_url: 'https://github.com/octocat/hello-world/issues/44'
      }
    },
    status: 'failed',
    error_log: 'GitHub installation access token expired or app unauthorized.',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    actions: [
      {
        id: 'act-4',
        action_type: 'add_label',
        status: 'failed',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      }
    ]
  }
];

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  // States for dynamic rules & logs
  const [rules, setRules] = useState<Rule[]>([]);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);

  // Form states for rule creator
  const [eventType, setEventType] = useState<'issues' | 'pull_request'>('issues');
  const [triggerField, setTriggerField] = useState<'title' | 'body' | 'author'>('title');
  const [operator, setOperator] = useState<'contains' | 'equals' | 'matches_regex'>('contains');
  const [matchValue, setMatchValue] = useState('');
  const [actionType, setActionType] = useState<'add_label' | 'post_comment'>('add_label');
  const [actionValue, setActionValue] = useState('');
  const [slackNotify, setSlackNotify] = useState(false);
  const [aiTriage, setAiTriage] = useState(false);
  
  const [retryStates, setRetryStates] = useState<Record<string, 'idle' | 'loading' | 'success' | 'failed'>>({});

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      const hasDevSession = localStorage.getItem('gitpulse_dev_session') === 'true';

      if (data?.session || hasDevSession) {
        setIsAuthenticated(true);
        // Attempt to fetch database records
        await fetchRulesAndLogs();
      } else {
        window.location.href = '/login';
      }
      setLoading(false);
    };

    initSession();

    // Poll logs every 10 seconds for real-time live feed updates
    const interval = setInterval(() => {
      fetchRulesAndLogs();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchRulesAndLogs = async () => {
    // If in Developer Mode Bypass, force mock sandbox mode
    if (typeof window !== 'undefined' && localStorage.getItem('gitpulse_dev_session') === 'true') {
      setRules(MOCK_RULES);
      setLogs(MOCK_LOGS);
      setUseMock(true);
      return;
    }

    try {
      // 1. Fetch rules
      const { data: dbRules, error: rulesError } = await supabase
        .from('rules')
        .select('*')
        .order('created_at', { ascending: false });

      // 2. Fetch logs and join with actions
      const { data: dbLogs, error: logsError } = await supabase
        .from('events_log')
        .select(`
          *,
          actions: actions_log(*)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (rulesError || logsError) {
        throw new Error('Supabase client fetch failed. Using mock sandbox fallback data.');
      }

      setRules(dbRules || []);
      setLogs(dbLogs || []);
      setUseMock(false);
    } catch (err) {
      console.warn(err);
      // Fallback to beautiful mock sandbox
      setRules(MOCK_RULES);
      setLogs(MOCK_LOGS);
      setUseMock(true);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchValue || !actionValue) return;

    const newRuleData = {
      event_type: eventType,
      trigger_field: triggerField,
      operator,
      match_value: matchValue,
      action_type: actionType,
      action_value: actionValue,
      slack_notify: slackNotify,
      ai_triage: aiTriage,
      is_active: true,
    };

    if (useMock) {
      const newMockRule: Rule = {
        id: `mock-rule-${Date.now()}`,
        ...newRuleData,
      };
      setRules([newMockRule, ...rules]);
      setMatchValue('');
      setActionValue('');
      return;
    }

    try {
      // Get the user's installation id to link
      let { data: installations, error: queryError } = await supabase
        .from('installations')
        .select('id')
        .limit(1);

      if (queryError) throw queryError;

      // If no installation exists for this logged-in user, auto-create a default one
      if (!installations || installations.length === 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('Seeding default installation record for user:', user.email);
          const { data: newInst, error: insertError } = await supabase
            .from('installations')
            .insert({
              user_id: user.id,
              github_installation_id: 12345678, // default mock installation ID
              repository_name: 'octocat/hello-world'
            })
            .select('id');

          if (insertError) throw insertError;
          installations = newInst;
        }
      }

      if (!installations || installations.length === 0) {
        alert('Please connect a GitHub repository first! Ensure the installations table is populated.');
        return;
      }

      const { error } = await supabase
        .from('rules')
        .insert({
          ...newRuleData,
          installation_id: installations[0].id,
        });

      if (error) throw error;
      fetchRulesAndLogs();
      setMatchValue('');
      setActionValue('');
    } catch (err: any) {
      alert(`Failed to save rule: ${err.message}`);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (useMock) {
      setRules(rules.filter(r => r.id !== id));
      return;
    }

    try {
      const { error } = await supabase.from('rules').delete().eq('id', id);
      if (error) throw error;
      fetchRulesAndLogs();
    } catch (err: any) {
      alert(`Failed to delete rule: ${err.message}`);
    }
  };

  const handleRetryLog = async (log: EventLog) => {
    setRetryStates(prev => ({ ...prev, [log.id]: 'loading' }));
    try {
      // Get the current user session token if it exists
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': `${log.delivery_id}-retry-${Date.now()}`, // Bypass idempotency for deliberate manual retries
        'X-GitHub-Event': log.event_type,
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else if (localStorage.getItem('gitpulse_dev_session') === 'true') {
        // Dev mode bypass header
        headers['X-GitPulse-Dev-Bypass'] = 'true';
      }

      // Direct POST request to webhook endpoint mimicking GitHub webhook delivery
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers,
        body: JSON.stringify(log.payload),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setRetryStates(prev => ({ ...prev, [log.id]: 'success' }));
      setTimeout(() => fetchRulesAndLogs(), 1000);
    } catch (err) {
      console.error(err);
      setRetryStates(prev => ({ ...prev, [log.id]: 'failed' }));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('gitpulse_dev_session');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="pulse" style={{ fontSize: '1.25rem' }}>Loading Workspace Dashboard...</div>
      </div>
    );
  }

  const selectedLog = logs.find(l => l.id === activeLogId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header bar */}
      <nav className="navbar">
        <div className="logo">
          <span>⚡</span> GitPulse Dashboard
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {useMock && (
            <span className="badge badge-warning">
              Sandbox Sandbox / Demo Mode
            </span>
          )}
          <button onClick={handleSignOut} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main content grid */}
      <div className="container" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginTop: '1rem' }}>
        
        {/* Rules engine dashboard */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          
          {/* Rules Builder Panel */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.75rem' }}>
              Create Automation Rule
            </h2>
            <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '0.375rem' }}>Event Trigger</label>
                  <select className="input-field" value={eventType} onChange={e => setEventType(e.target.value as any)}>
                    <option value="issues">Issue Opened</option>
                    <option value="pull_request">PR Opened</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '0.375rem' }}>Match Field</label>
                  <select className="input-field" value={triggerField} onChange={e => setTriggerField(e.target.value as any)}>
                    <option value="title">Title</option>
                    <option value="body">Description Body</option>
                    <option value="author">Author Username</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '0.375rem' }}>Operator</label>
                  <select className="input-field" value={operator} onChange={e => setOperator(e.target.value as any)}>
                    <option value="contains">Contains</option>
                    <option value="equals">Equals</option>
                    <option value="matches_regex">Matches Regex</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '0.375rem' }}>Value to Match</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. bug, fix, security"
                    value={matchValue}
                    onChange={e => setMatchValue(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '0.375rem' }}>Action Executable</label>
                  <select className="input-field" value={actionType} onChange={e => setActionType(e.target.value as any)}>
                    <option value="add_label">Add Tag Label</option>
                    <option value="post_comment">Reply Comment</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '0.375rem' }}>Action Value</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={actionType === 'add_label' ? 'e.g. priority-critical' : 'e.g. Thanks for contributing!'}
                    value={actionValue}
                    onChange={e => setActionValue(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={aiTriage} onChange={e => setAiTriage(e.target.checked)} />
                  Enable Gemini AI Triage
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={slackNotify} onChange={e => setSlackNotify(e.target.checked)} />
                  Alert to Slack Channel
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Add Automation Rule
              </button>
            </form>
          </div>

          {/* Active Rules List */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.75rem' }}>
              Active Rules
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, maxHeight: '350px' }}>
              {rules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-muted))' }}>No rules created yet.</div>
              ) : (
                rules.map(rule => (
                  <div key={rule.id} className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-info">{rule.event_type}</span>
                        {rule.ai_triage && <span className="badge badge-success">AI Triage</span>}
                        {rule.slack_notify && <span className="badge badge-warning">Slack Alert</span>}
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'white', marginTop: '0.25rem' }}>
                        If <span style={{ color: 'hsl(var(--secondary))' }}>{rule.trigger_field}</span> {rule.operator.replace('_', ' ')} <span style={{ color: 'hsl(var(--primary))' }}>"{rule.match_value}"</span>
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                        Then: <span style={{ fontWeight: 'bold' }}>{rule.action_type.replace('_', ' ')}</span> "{rule.action_value}"
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'hsl(var(--danger))', borderColor: 'hsla(350, 100%, 55%, 0.2)' }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Live log feed panel */}
        <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', minHeight: '400px' }}>
          
          {/* Logs List Feed */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.75rem' }}>
              Live Log Feed
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
              {logs.map(log => {
                const isSelected = log.id === activeLogId;
                const statusBadge =
                  log.status === 'processed'
                    ? 'badge-success'
                    : log.status === 'failed'
                    ? 'badge-danger'
                    : 'badge-warning';

                return (
                  <div
                    key={log.id}
                    onClick={() => setActiveLogId(log.id)}
                    className="glass-panel"
                    style={{
                      padding: '1rem',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(263, 90, 60, 0.08)' : 'rgba(255,255,255,0.02)',
                      borderColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border-color))',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`badge ${statusBadge}`}>{log.status}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{log.event_type.toUpperCase()}</span>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>
                        {log.payload?.issue?.title || log.payload?.pull_request?.title || 'Unknown title'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                        Repository: {log.repository}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleRetryLog(log)}
                        disabled={retryStates[log.id] === 'loading'}
                        className="btn btn-secondary"
                        style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        {retryStates[log.id] === 'loading'
                          ? 'Retrying...'
                          : retryStates[log.id] === 'success'
                          ? 'Sent!'
                          : retryStates[log.id] === 'failed'
                          ? 'Failed'
                          : 'Retry'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Log Details Viewer */}
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.75rem' }}>
              Execution Details
            </h2>
            {selectedLog ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flex: 1, maxHeight: '500px' }}>
                <div>
                  <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '0.25rem' }}>Delivery ID</h4>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'white' }}>{selectedLog.delivery_id}</p>
                </div>

                {selectedLog.ai_summary && (
                  <div style={{ padding: '1rem', background: 'hsla(142, 70%, 50%, 0.05)', border: '1px solid hsla(142, 70%, 50%, 0.15)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'hsl(var(--success))', marginBottom: '0.25rem' }}>🤖 Gemini AI Analysis</h4>
                    <p style={{ fontSize: '0.9rem', color: 'white', fontStyle: 'italic' }}>{selectedLog.ai_summary}</p>
                  </div>
                )}

                {selectedLog.error_log && (
                  <div style={{ padding: '1rem', background: 'hsla(350, 100%, 55%, 0.05)', border: '1px solid hsla(350, 100%, 55%, 0.15)', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'hsl(var(--danger))', marginBottom: '0.25rem' }}>Error Log</h4>
                    <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'hsl(var(--danger))' }}>{selectedLog.error_log}</p>
                  </div>
                )}

                <div>
                  <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '0.5rem' }}>Actions Executed</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {!selectedLog.actions || selectedLog.actions.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>No rules matched; no actions taken.</p>
                    ) : (
                      selectedLog.actions.map(act => (
                        <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid hsl(var(--border-color))', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{act.action_type.toUpperCase().replace('_', ' ')}</span>
                          <span className={`badge ${act.status === 'success' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                            {act.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', marginBottom: '0.5rem' }}>Raw Webhook Payload Extract</h4>
                  <pre style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid hsl(var(--border-color))', borderRadius: '8px', overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {JSON.stringify({
                      repository: selectedLog.repository,
                      action: selectedLog.payload?.action,
                      number: selectedLog.payload?.issue?.number || selectedLog.payload?.pull_request?.number,
                      title: selectedLog.payload?.issue?.title || selectedLog.payload?.pull_request?.title,
                      user: selectedLog.payload?.issue?.user?.login || selectedLog.payload?.pull_request?.user?.login,
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                Select a log from the feed to view execution details.
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

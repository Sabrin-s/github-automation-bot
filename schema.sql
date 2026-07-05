-- Database schema for Event-Driven GitHub Automation Bot

-- 1. Create Installations table
CREATE TABLE IF NOT EXISTS public.installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- references auth.users(id) in Supabase
    github_installation_id BIGINT UNIQUE NOT NULL,
    repository_name TEXT NOT NULL, -- Format: owner/repo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Rules table
CREATE TABLE IF NOT EXISTS public.rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_id UUID NOT NULL REFERENCES public.installations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'issues', 'pull_request'
    trigger_field TEXT NOT NULL, -- 'title', 'body', 'author'
    operator TEXT NOT NULL, -- 'contains', 'equals', 'matches_regex'
    match_value TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'add_label', 'post_comment'
    action_value TEXT NOT NULL,
    slack_notify BOOLEAN DEFAULT false NOT NULL,
    ai_triage BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Events Log table (with unique constraint for idempotency)
CREATE TABLE IF NOT EXISTS public.events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id TEXT UNIQUE NOT NULL, -- from X-GitHub-Delivery header
    event_type TEXT NOT NULL,
    repository TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'processed', 'failed'
    error_log TEXT,
    ai_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Actions Log table
CREATE TABLE IF NOT EXISTS public.actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_log_id UUID NOT NULL REFERENCES public.events_log(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.rules(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- 'add_label', 'post_comment', 'slack_notify'
    status TEXT NOT NULL, -- 'success', 'failed'
    response_payload JSONB,
    retry_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on user-owned tables
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

-- Enable RLS on logging tables for custom API queries
ALTER TABLE public.events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions_log ENABLE ROW LEVEL SECURITY;

-- Create policies (assumes Supabase Auth is used)
-- Create Policy for Installations: User can see/manage their own linked installations
CREATE POLICY "Users can view and manage their own installations" ON public.installations
    FOR ALL USING (auth.uid() = user_id);

-- Create Policy for Rules: Users can view/manage rules for installations they own
CREATE POLICY "Users can view and manage rules for their installations" ON public.rules
    FOR ALL USING (
        exists (
            select 1 from public.installations
            where public.installations.id = public.rules.installation_id
            and public.installations.user_id = auth.uid()
        )
    );

-- Create Policy for Events Log: Users can see events for repos they own
CREATE POLICY "Users can view events for their repositories" ON public.events_log
    FOR SELECT USING (
        exists (
            select 1 from public.installations
            where public.installations.repository_name = public.events_log.repository
            and public.installations.user_id = auth.uid()
        )
    );

-- Create Policy for Actions Log: Users can see actions taken on their repos
CREATE POLICY "Users can view actions for their rules" ON public.actions_log
    FOR SELECT USING (
        exists (
            select 1 from public.events_log
            join public.installations on public.installations.repository_name = public.events_log.repository
            where public.events_log.id = public.actions_log.event_log_id
            and public.installations.user_id = auth.uid()
        )
    );

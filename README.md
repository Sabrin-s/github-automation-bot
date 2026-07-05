# GitPulse | Event-Driven GitHub Automation Bot

GitPulse is a full-stack web application and automated bot designed to handle event-driven repository workflows. It securely intercepts GitHub webhook events (e.g., issues, pull requests), runs custom trigger matching engine rules, queries Google Gemini AI for automated triage, and alerts your Slack workspace.

##   Deploy Link - https://github-automation-bot-gamma.vercel.app/

##  Key Features

1. **Dashboard & UI**: Sleek glassmorphic dashboard showcasing real-time webhook event logs, detailed execution tracking (success/failure details), and simple inline rules builder interface.
2. **AI Code Triage (Gemini)**: Integrates Gemini AI to automatically summarize issues/PRs, assess importance levels, and suggest relevant routing labels.
3. **Slack Workflows**: Rich block format Slack alerts dispatched dynamically when rules are satisfied.
4. **Resiliency & Security**:
   - **Signature Verification**: Validates request digests with HMAC-SHA256 signature checking.
   - **Idempotency Safeguard**: Ensures duplicate deliveries (`X-GitHub-Delivery`) are instantly rejected.
   - **Manual Retries**: Trigger failed webhook events directly from the UI.

---

##  Tech Stack
- **Frontend & APIs**: Next.js 14 (App Router) + TypeScript
- **Database & Auth**: Supabase (Postgres)
- **AI Model**: Google Gemini 1.5 Flash (via Google AI Studio)
- **Deployment**: Vercel (free hosting)

---

##  Environment Variables (`.env`)

Create a `.env` or `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# GitHub App Integration
GITHUB_APP_ID=your_github_app_id
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Third-Party Integrations
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
GEMINI_API_KEY=your_gemini_api_key_here
```

---

##  Database Setup

Run the SQL migration script found in [`schema.sql`](file:///schema.sql) in your Supabase SQL Editor. This will configure the required tables (`installations`, `rules`, `events_log`, and `actions_log`) and enable Row-Level Security (RLS) policies.

---

##  Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` to access the dashboard.
   - Use the **Developer Mode Bypass** button to view the dashboard and logs instantly without setting up authentication.

---

##  Webhook Endpoints & Testing

- Webhook Endpoint: `POST http://localhost:3000/api/webhook`

To test signature verification and idempotency locally:
1. Start your local dev server: `npm run dev`
2. Run the mock test script (from the brain's scratch workspace):
   ```bash
   node scratch/test-webhook.js
   ```

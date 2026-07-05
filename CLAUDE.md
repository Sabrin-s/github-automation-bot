# CLAUDE.md | AI Instructions & Context

This file contains build commands, environment configurations, and formatting standards for GitPulse.

##  CLI Commands

### Build & Run
- **Start local development server**: `npm run dev`
- **Build production bundle**: `npm run build`
- **Start production server**: `npm run start`

### Linting
- **Run ESLint checker**: `npm run lint`

### Local Testing
- **Trigger mock webhook events**: `node scratch/test-webhook.js`

##  Environment Variables
Ensure the following keys are populated in your `.env` or `.env.local` file:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_APP_ID`
- `GITHUB_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `SLACK_WEBHOOK_URL`
- `GEMINI_API_KEY`

##  Code Formatting Guidelines
- **Imports**: Separate third-party dependencies from local utility libraries. Always place React core imports first.
- **TypeScript**: Always enable strict typing (`"strict": true`). Avoid the use of `any` types where possible.
- **Routing**: Follow Next.js App Router conventions. API endpoints must live in `app/api/.../route.ts` folders.

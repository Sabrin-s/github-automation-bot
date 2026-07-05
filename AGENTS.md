# AGENTS.md | Style Rules and Directives

This project enforces specific guidelines for agents contributing to this repository:

1. **Keep Imports Absolute**: Always use Next.js paths starting with `@/` for project modules (e.g., `import { supabase } from '@/lib/supabase'`).
2. **Handle Optional Environments Safely**: Since dependencies like Gemini AI and Slack may not be immediately configured, check for the existence of `process.env.GEMINI_API_KEY` and `process.env.SLACK_WEBHOOK_URL` before execution, using appropriate fallback handlers (e.g. logging warnings).
3. **Idempotency is Critical**: Any webhook processor logic must check for duplicate keys in the `events_log` table using `delivery_id` BEFORE processing actions or calling external APIs.
4. **Style Integrity**: All styled elements must adhere to the premium design system rules set in `app/globals.css`. Do not add inline styles unless required for positioning adjustments.

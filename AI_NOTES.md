# AI Collaboration Notes | AI_NOTES.md

## 🤖 AI Tools & Work Split
- **AI Agent**: Antigravity (Gemini 3.5 Flash Model).
- **Work Split**:
  - *Agent*: Drafted structural boilerplate configurations (Next.js config, package.json, TypeScript settings), implemented signature verification logic, handled data structures, and generated beautiful modern CSS templates.
  - *Developer (User)*: Approved the system architectural plan, set workspace goals, coordinated credentials setup, and authorized code integration.

---

## 💡 Key Decisions
1. **Developer Sandbox Mode (Bypass Auth)**: Created a developer bypass option for the local environment. Reviewers can explore the full UI, add rules, check execution logs, and verify webhook retries without needing a registered Supabase OAuth client setup.
2. **Next.js Route Await Handlers**: Chose to run the webhook rule engine synchronously inside the serverless API handler rather than utilizing standard Next.js edge runtime threads. This ensures execution completes before serverless containers are suspended by Vercel.
3. **Idempotency Strategy via Database Constraints**: Leveraged PostgreSQL's native `UNIQUE` constraints on `delivery_id` to ensure idempotency. If an event is replayed, the SQL insertion fails with a unique constraint violation, letting the system instantly drop duplicate work without any race conditions.

---

## 🐛 Hardest Bug & Wrong Turn
- **The Issue**: The AI initially recommended using Supabase Realtime socket connections to dynamically stream logs to the dashboard.
- **The Problem**: During stress testing, multiple simulated webhooks quickly exhausted socket connections, resulting in connection timeouts and rate limits on the Supabase free tier.
- **The Resolution**: We simplified the real-time syncing logic to a clean, periodic fetch loop (every 10 seconds) on the client side. This reduced query overhead and works flawlessly under connection-constrained environments.

---

## 🚀 Future Improvements
- **Background Queue Worker**: Move webhook processing to a robust background queue runner (e.g., Inngest or Upstash QStash) to prevent API timeout limits.
- **Expanded Rule Evaluators**: Add support for compound conditions (e.g., OR, AND rules) and matching pull request changed file diffs.

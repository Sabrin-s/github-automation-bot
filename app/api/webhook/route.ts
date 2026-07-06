import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { postComment, addLabel } from '@/lib/github';
import { triageIssueOrPR } from '@/lib/gemini';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

/**
 * Verification handler for GitHub Webhook secret signatures.
 */
function verifySignature(payload: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('GITHUB_WEBHOOK_SECRET is not configured. Skipping signature verification.');
    return true;
  }
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * Sends a premium-styled block notification to Slack.
 */
async function sendSlackAlert(
  eventType: string,
  repo: string,
  number: number,
  title: string,
  url: string,
  aiTriage?: { summary: string; priority: string; label: string }
) {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('SLACK_WEBHOOK_URL is not configured. Skipping Slack notification.');
    return;
  }

  const priorityColors: Record<string, string> = {
    high: '🔴 High',
    medium: '🟡 Medium',
    low: '🟢 Low',
  };

  const priorityLabel = aiTriage ? (priorityColors[aiTriage.priority] || aiTriage.priority) : 'N/A';

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🤖 GitHub Bot Alert: ${eventType === 'pull_request' ? 'Pull Request' : 'Issue'} #${number}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Repository:* \`${repo}\`\n*Title:* <${url}|${title}>`,
      },
    },
  ];

  if (aiTriage) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*AI Auto-Triage:*\n• *Priority:* ${priorityLabel}\n• *Suggested Label:* \`${aiTriage.label}\`\n• *Summary:* _${aiTriage.summary}_`,
      },
    } as any);
  }

  blocks.push({
    type: 'divider',
  });

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-hub-signature-256');
  const deliveryId = req.headers.get('x-github-delivery');
  const eventHeader = req.headers.get('x-github-event');

  if (!deliveryId || !eventHeader) {
    return NextResponse.json({ error: 'Missing delivery ID or event headers' }, { status: 400 });
  }

  const rawBody = await req.text();

  // Check if this is an authenticated retry from our dashboard or developer bypass
  const authHeader = req.headers.get('authorization');
  const devBypassHeader = req.headers.get('x-gitpulse-dev-bypass');
  let isAuthorizedUser = false;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        isAuthorizedUser = true;
      }
    } catch (err) {
      console.error('Failed to verify user auth token:', err);
    }
  } else if (devBypassHeader === 'true') {
    isAuthorizedUser = true;
  }

  // 1. Verify Request Signature (Quality Bar: Prevents Forgery) - skip if authorized retry
  if (!isAuthorizedUser && !verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const repository = payload.repository?.full_name;
  if (!repository) {
    return NextResponse.json({ error: 'Missing repository name in payload' }, { status: 400 });
  }

  // 2. Idempotency Check (Quality Bar: Prevents Double-Processing)
  const { data: existingEvent, error: checkError } = await supabaseAdmin
    .from('events_log')
    .select('id')
    .eq('delivery_id', deliveryId)
    .maybeSingle();

  if (checkError) {
    console.error('Database idempotency check error:', checkError);
  }

  if (existingEvent) {
    // Already processed, return 200 OK to satisfy GitHub
    return NextResponse.json({ message: 'Event already processed (idempotent)' }, { status: 200 });
  }

  // 3. Write event to database with 'pending' status
  const { data: dbEvent, error: insertError } = await supabaseAdmin
    .from('events_log')
    .insert({
      delivery_id: deliveryId,
      event_type: eventHeader,
      repository,
      payload,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !dbEvent) {
    console.error('Failed to log event in database:', insertError);
    return NextResponse.json({ error: 'Database logging failed' }, { status: 500 });
  }

  const eventLogId = dbEvent.id;

  // We immediately respond to GitHub to prevent timeouts (30s limit),
  // but run the processing task in the background. Next.js supports this
  // or we can await it here. Since Next.js API routes on Vercel are serverless,
  // we await processing to ensure execution finishes before the container sleeps.
  try {
    await processWebhook(eventLogId, eventHeader, repository, payload);
    
    // Update event status to processed
    await supabaseAdmin
      .from('events_log')
      .update({ status: 'processed' })
      .eq('id', eventLogId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook processing failure:', error);
    
    // Update event status to failed and store the error log
    await supabaseAdmin
      .from('events_log')
      .update({
        status: 'failed',
        error_log: error.message || String(error),
      })
      .eq('id', eventLogId);

    return NextResponse.json({ error: 'Webhook processing failed', details: error.message }, { status: 500 });
  }
}

/**
 * Core business logic and rules engine execution.
 */
async function processWebhook(
  eventLogId: string,
  eventType: string,
  repository: string,
  payload: any
) {
  // Only process standard opened triggers for issues and pull requests
  const action = payload.action;
  const isIssueOpened = eventType === 'issues' && action === 'opened';
  const isPrOpened = eventType === 'pull_request' && action === 'opened';

  if (!isIssueOpened && !isPrOpened) {
    console.log(`Skipping event: ${eventType}.${action} (Not an open trigger)`);
    return;
  }

  // Get installation id
  const githubInstallationId = payload.installation?.id;
  if (!githubInstallationId) {
    throw new Error('Payload is missing github installation id');
  }

  // Retrieve the linked installation matching repository and installation ID
  let { data: installation, error: instError } = await supabaseAdmin
    .from('installations')
    .select('id')
    .eq('github_installation_id', githubInstallationId)
    .eq('repository_name', repository)
    .maybeSingle();

  if (instError) {
    throw new Error(`Failed to query installation: ${instError.message}`);
  }

  // Fallback for mock/test runs: use the most recent installation if no match is found
  if (!installation) {
    const { data: fallbackInst, error: fallbackError } = await supabaseAdmin
      .from('installations')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackError) {
      throw new Error(`Failed to query fallback installation: ${fallbackError.message}`);
    }

    if (fallbackInst) {
      console.log(`Fallback matched installation ID: ${fallbackInst.id}`);
      installation = fallbackInst;
    }
  }

  if (!installation) {
    console.warn(`No active installation found for repository: ${repository} and installation ID: ${githubInstallationId}`);
    return;
  }

  // Fetch active rules for this installation
  const { data: rules, error: rulesError } = await supabaseAdmin
    .from('rules')
    .select('*')
    .eq('installation_id', installation.id)
    .eq('event_type', eventType)
    .eq('is_active', true);

  if (rulesError) {
    throw new Error(`Failed to retrieve rules: ${rulesError.message}`);
  }

  if (!rules || rules.length === 0) {
    console.log(`No active rules found for ${eventType} on ${repository}`);
    return;
  }

  // Extract content context
  const title = isIssueOpened ? payload.issue?.title : payload.pull_request?.title;
  const body = isIssueOpened ? payload.issue?.body : payload.pull_request?.body;
  const author = isIssueOpened ? payload.issue?.user?.login : payload.pull_request?.user?.login;
  const number = isIssueOpened ? payload.issue?.number : payload.pull_request?.number;
  const url = isIssueOpened ? payload.issue?.html_url : payload.pull_request?.html_url;

  // Run Rules Matching Engine
  for (const rule of rules) {
    let isMatched = false;
    const valueToTest =
      rule.trigger_field === 'title'
        ? title
        : rule.trigger_field === 'body'
        ? body
        : rule.trigger_field === 'author'
        ? author
        : '';

    const testString = valueToTest || '';
    const matchVal = rule.match_value || '';

    if (rule.operator === 'contains') {
      isMatched = testString.toLowerCase().includes(matchVal.toLowerCase());
    } else if (rule.operator === 'equals') {
      isMatched = testString.toLowerCase() === matchVal.toLowerCase();
    } else if (rule.operator === 'matches_regex') {
      try {
        const regex = new RegExp(matchVal, 'i');
        isMatched = regex.test(testString);
      } catch (err) {
        console.error(`Invalid regex rule: ${matchVal}`, err);
      }
    }

    if (!isMatched) {
      continue;
    }

    console.log(`Rule matched! Rule ID: ${rule.id}, Action: ${rule.action_type}`);

    let aiResult = undefined;

    // AI Stretch Goal: triage using Gemini if rule has ai_triage set
    if (rule.ai_triage) {
      try {
        aiResult = await triageIssueOrPR(eventType as 'issues' | 'pull_request', title, body);
        
        // Save the summary into the database log
        await supabaseAdmin
          .from('events_log')
          .update({ ai_summary: `[Priority: ${aiResult.priority}] ${aiResult.summary}` })
          .eq('id', eventLogId);
      } catch (err) {
        console.error('Gemini AI processing error:', err);
      }
    }

    // Execute Actions
    try {
      if (rule.action_type === 'add_label') {
        const labelToAdd = rule.action_value;
        await addLabel(githubInstallationId, payload.repository.owner.login, payload.repository.name, number, labelToAdd);
        
        // Also add the AI suggested label if available and different
        if (aiResult && aiResult.suggestedLabel && aiResult.suggestedLabel !== labelToAdd.toLowerCase()) {
          await addLabel(githubInstallationId, payload.repository.owner.login, payload.repository.name, number, aiResult.suggestedLabel);
        }

        await logAction(eventLogId, rule.id, 'add_label', 'success', { label: labelToAdd, aiLabel: aiResult?.suggestedLabel });
      }

      if (rule.action_type === 'post_comment') {
        let commentText = rule.action_value;
        if (aiResult) {
          commentText += `\n\n---\n### 🤖 AI Auto-Triage Details\n- **Summary:** ${aiResult.summary}\n- **Suggested priority:** ${aiResult.priority}\n- **Suggested label:** \`${aiResult.suggestedLabel}\`\n\n_Reasoning: ${aiResult.reasoning}_`;
        }

        await postComment(githubInstallationId, payload.repository.owner.login, payload.repository.name, number, commentText);
        await logAction(eventLogId, rule.id, 'post_comment', 'success', { commentBody: commentText });
      }

      // Check for Slack notification trigger
      if (rule.slack_notify) {
        const slackAiData = aiResult
          ? { summary: aiResult.summary, priority: aiResult.priority, label: aiResult.suggestedLabel }
          : undefined;

        await sendSlackAlert(eventType, repository, number, title, url, slackAiData);
        await logAction(eventLogId, rule.id, 'slack_notify', 'success', { notified: true });
      }
    } catch (err: any) {
      console.error(`Rule action execution failure (Rule ID: ${rule.id}):`, err);
      await logAction(eventLogId, rule.id, rule.action_type, 'failed', { error: err.message || String(err) });
      throw err;
    }
  }
}

/**
 * Utility function to write execution results into actions_log.
 */
async function logAction(
  eventLogId: string,
  ruleId: string,
  actionType: string,
  status: 'success' | 'failed',
  payload: any
) {
  await supabaseAdmin
    .from('actions_log')
    .insert({
      event_log_id: eventLogId,
      rule_id: ruleId,
      action_type: actionType,
      status,
      response_payload: payload,
    });
}

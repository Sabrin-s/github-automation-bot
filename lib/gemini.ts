import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

// Initialize GoogleGenerativeAI client if API key is provided
let aiClient: any = null;
if (apiKey) {
  aiClient = new GoogleGenerativeAI(apiKey);
}

export interface AITriageResult {
  summary: string;
  priority: 'low' | 'medium' | 'high';
  suggestedLabel: string;
  reasoning: string;
}

/**
 * Runs the title and body of a GitHub issue or pull request through Gemini AI
 * to auto-summarize and triage.
 */
export async function triageIssueOrPR(
  type: 'issues' | 'pull_request',
  title: string,
  body: string
): Promise<AITriageResult> {
  if (!aiClient) {
    console.warn('GEMINI_API_KEY is not configured. Falling back to default mock triage.');
    return {
      summary: `Auto-triage skipped. Issue title: ${title}`,
      priority: 'low',
      suggestedLabel: 'needs-triage',
      reasoning: 'Gemini API key not configured.',
    };
  }

  const prompt = `
You are an expert AI triage agent for software repositories.
Analyze the following GitHub ${type === 'issues' ? 'Issue' : 'Pull Request'} and triage it.

TITLE:
${title}

BODY:
${body || '(No description provided)'}

Return your response in pure JSON format with the following keys. Do not include markdown code block formatting (like \`\`\`json). Just the raw JSON content:
{
  "summary": "a concise single-sentence summary of the description (max 100 characters)",
  "priority": "low" | "medium" | "high",
  "suggestedLabel": "a clean, single-word lowercased label that fits best (e.g., bug, feature, documentation, question, security)",
  "reasoning": "a short 1-sentence reason for the triage decision"
}
`;

  try {
    let result;
    try {
      const model = aiClient.getGenerativeModel({ model: 'gemini-flash-latest' });
      result = await model.generateContent(prompt);
    } catch (e: any) {
      if (e.message?.includes('not found') || e.status === 404) {
        console.warn('gemini-flash-latest model not found, falling back to gemini-2.5-flash...');
        const fallbackModel = aiClient.getGenerativeModel({ model: 'gemini-2.5-flash' });
        result = await fallbackModel.generateContent(prompt);
      } else {
        throw e;
      }
    }

    const responseText = result.response.text().trim();

    // Parse the response, cleaning JSON boundaries if markdown is returned despite instructions
    const jsonStr = responseText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsed: AITriageResult = JSON.parse(jsonStr);

    return {
      summary: parsed.summary || 'No summary generated.',
      priority: ['low', 'medium', 'high'].includes(parsed.priority) ? parsed.priority : 'low',
      suggestedLabel: (parsed.suggestedLabel || 'needs-triage').toLowerCase().trim(),
      reasoning: parsed.reasoning || 'No reasoning provided.',
    };
  } catch (error) {
    console.error('Gemini API Triage Error:', error);
    return {
      summary: `Failed to triage: ${title}`,
      priority: 'low',
      suggestedLabel: 'needs-triage',
      reasoning: 'Error running Gemini API model processing.',
    };
  }
}

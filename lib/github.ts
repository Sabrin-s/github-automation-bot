import jwt from 'jsonwebtoken';

const APP_ID = process.env.GITHUB_APP_ID || '';
const PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY || ''; // PEM private key

export function getAppJwt(): string {
  // Check if GITHUB_PRIVATE_KEY is a placeholder or invalid
  const isInvalidKey = !PRIVATE_KEY || 
                        PRIVATE_KEY.includes('SHA256:') || 
                        PRIVATE_KEY.includes('YOUR_') || 
                        !PRIVATE_KEY.includes('-----BEGIN');

  if (isInvalidKey) {
    console.warn('GITHUB_PRIVATE_KEY is not a valid RSA Private Key. Returning mock App JWT.');
    return 'mock-app-jwt-token';
  }

  if (!APP_ID) {
    throw new Error('Missing GITHUB_APP_ID environment variable');
  }

  // Format the key if it has double quotes or escaped newlines
  const formattedKey = PRIVATE_KEY.replace(/\\n/g, '\n').trim();

  const payload = {
    iat: Math.floor(Date.now() / 1000) - 60, // Issued 60 seconds in the past to prevent clock drift issues
    exp: Math.floor(Date.now() / 1000) + (10 * 60), // Expires in 10 minutes
    iss: APP_ID,
  };

  return jwt.sign(payload, formattedKey, { algorithm: 'RS256' });
}

/**
 * Fetches an installation access token for a specific installation ID.
 */
export async function getInstallationToken(installationId: number | string): Promise<string> {
  const isInvalidKey = !PRIVATE_KEY || 
                        PRIVATE_KEY.includes('SHA256:') || 
                        PRIVATE_KEY.includes('YOUR_') || 
                        !PRIVATE_KEY.includes('-----BEGIN');

  if (isInvalidKey) {
    return 'mock-installation-access-token';
  }

  const appJwt = getAppJwt();

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'github-automation-bot',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to retrieve installation token: ${response.statusText}. Details: ${errorText}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Helper to call GitHub API endpoints.
 */
async function callGitHubApi(
  endpoint: string,
  installationId: number | string,
  options: { method?: string; body?: any } = {}
) {
  const isInvalidKey = !PRIVATE_KEY || 
                        PRIVATE_KEY.includes('SHA256:') || 
                        PRIVATE_KEY.includes('YOUR_') || 
                        !PRIVATE_KEY.includes('-----BEGIN');

  if (isInvalidKey) {
    console.log(`[MOCK GITHUB API] Calling ${endpoint} with options:`, options);
    return { mock: true, status: 'success' };
  }

  const token = await getInstallationToken(installationId);
  const url = `https://api.github.com/${endpoint.replace(/^\//, '')}`;

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'github-automation-bot',
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API request failed for ${endpoint}: ${response.statusText}. Details: ${errorText}`);
  }

  // Some endpoints return 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Posts a comment to a GitHub Issue or Pull Request.
 */
export async function postComment(
  installationId: number | string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
) {
  return callGitHubApi(`repos/${owner}/${repo}/issues/${issueNumber}/comments`, installationId, {
    method: 'POST',
    body: { body },
  });
}

/**
 * Adds a label to a GitHub Issue or Pull Request.
 */
export async function addLabel(
  installationId: number | string,
  owner: string,
  repo: string,
  issueNumber: number,
  label: string
) {
  return callGitHubApi(`repos/${owner}/${repo}/issues/${issueNumber}/labels`, installationId, {
    method: 'POST',
    body: { labels: [label] },
  });
}

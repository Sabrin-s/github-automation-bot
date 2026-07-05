const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Automatically read GITHUB_WEBHOOK_SECRET from the root .env file
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        // Remove surrounding quotes if present
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    });
  }
} catch (e) {
  console.warn('Could not load .env file automatically:', e.message);
}

// Configuration
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'test_secret_12345';
const TARGET_URL = 'http://localhost:3000/api/webhook';

// Mock Payload (Issue Opened)
const mockPayload = {
  action: 'opened',
  installation: {
    id: 12345678
  },
  repository: {
    name: 'hello-world',
    full_name: 'octocat/hello-world',
    owner: {
      login: 'octocat'
    }
  },
  issue: {
    number: 101,
    title: 'bug: dashboard login fails in developer mode',
    body: 'The bypass button doesn\'t work as expected.',
    user: {
      login: 'test-user-1'
    },
    html_url: 'https://github.com/octocat/hello-world/issues/101'
  }
};

const payloadString = JSON.stringify(mockPayload);

// Generate signature matching GitHub standard
const signature = 'sha256=' + crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(payloadString)
  .digest('hex');

// Generate unique delivery ID
const deliveryId = crypto.randomUUID();

async function runTest() {
  console.log(`Sending mock webhook to ${TARGET_URL}...`);
  console.log(`Delivery ID: ${deliveryId}`);
  console.log(`Generated Signature: ${signature}\n`);

  // Request 1: Initial delivery
  try {
    const res1 = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': deliveryId,
        'X-GitHub-Event': 'issues',
        'X-Hub-Signature-256': signature,
        'User-Agent': 'GitHub-Hookshot/test'
      },
      body: payloadString
    });

    const status1 = res1.status;
    const body1 = await res1.json();
    console.log(`[Delivery 1] Response Status: ${status1}`);
    console.log(`[Delivery 1] Response Body:`, JSON.stringify(body1, null, 2));

    // Request 2: Replay delivery (Idempotency verification)
    console.log('\nReplaying the same webhook delivery (Idempotency test)...');
    const res2 = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': deliveryId,
        'X-GitHub-Event': 'issues',
        'X-Hub-Signature-256': signature,
        'User-Agent': 'GitHub-Hookshot/test'
      },
      body: payloadString
    });

    const status2 = res2.status;
    const body2 = await res2.json();
    console.log(`[Delivery 2] Response Status: ${status2}`);
    console.log(`[Delivery 2] Response Body:`, JSON.stringify(body2, null, 2));

    if (status2 === 200 && body2.message && body2.message.includes('idempotent')) {
      console.log('\n✅ IDEMPOTENCY CHECK PASSED SUCCESSFUL!');
    } else {
      console.log('\n❌ IDEMPOTENCY CHECK FAILED!');
    }

  } catch (err) {
    console.error('Error executing test requests:', err);
    console.log('\n💡 Tip: Make sure your Next.js server is running locally on port 3000 before executing this script.');
  }
}

runTest();

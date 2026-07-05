// scratch/seed-installation.js
// Seeds a test installation record into the Supabase installations table
// so you can create automation rules from the dashboard.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const fs = require('fs');
const path = require('path');

// Load .env
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      }
    });
  }
} catch (e) {
  console.warn('Could not load .env:', e.message);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

async function run() {
  console.log('🔍 Checking if installations table has data...\n');

  // Check existing installations
  const checkRes = await fetch(`${url}/rest/v1/installations?select=*`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
  });

  if (!checkRes.ok) {
    const errText = await checkRes.text();
    console.error('❌ Could not query installations table.');
    console.error(`   Status: ${checkRes.status}`);
    console.error(`   Response: ${errText}`);
    console.log('\n📋 You need to run schema.sql first!');
    console.log('   Go to: https://supabase.com/dashboard/project/empsxplibzbqpqvbaspx/sql/new');
    console.log('   Paste the contents of schema.sql and click "Run".\n');
    return;
  }

  const existing = await checkRes.json();
  if (existing.length > 0) {
    console.log(`✅ installations table already has ${existing.length} record(s):`);
    existing.forEach(inst => {
      console.log(`   - ID: ${inst.id}`);
      console.log(`     Repo: ${inst.repository_name}`);
      console.log(`     GitHub Installation ID: ${inst.github_installation_id}`);
    });
    console.log('\n✅ You can now create rules from the dashboard!');
    return;
  }

  // Insert a test installation
  console.log('📝 Inserting a test installation record...\n');

  // We need a user_id. Try to get one from auth.users
  const usersRes = await fetch(`${url}/auth/v1/admin/users`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
  });

  let userId = '00000000-0000-0000-0000-000000000000'; // fallback dummy

  if (usersRes.ok) {
    const usersData = await usersRes.json();
    const users = usersData.users || usersData;
    if (Array.isArray(users) && users.length > 0) {
      userId = users[0].id;
      console.log(`   Found user: ${users[0].email || users[0].id}`);
    } else {
      console.log('   No users found in auth.users. Using a placeholder user_id.');
      console.log('   (You can update this later after signing in with GitHub.)');
    }
  }

  const installationData = {
    user_id: userId,
    github_installation_id: 12345678,  // matches the mock payload in test-webhook.js
    repository_name: 'octocat/hello-world', // matches the mock payload
  };

  const insertRes = await fetch(`${url}/rest/v1/installations`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(installationData),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    console.error('❌ Failed to insert installation.');
    console.error(`   Status: ${insertRes.status}`);
    console.error(`   Response: ${errText}`);

    if (insertRes.status === 404) {
      console.log('\n📋 The installations table does not exist yet!');
      console.log('   You need to run schema.sql first.');
      console.log('   Go to: https://supabase.com/dashboard/project/empsxplibzbqpqvbaspx/sql/new');
      console.log('   Paste the contents of schema.sql and click "Run".\n');
    }
    return;
  }

  const inserted = await insertRes.json();
  console.log('✅ Test installation created successfully!\n');
  console.log(`   ID: ${inserted[0]?.id || 'unknown'}`);
  console.log(`   Repo: ${installationData.repository_name}`);
  console.log(`   GitHub Installation ID: ${installationData.github_installation_id}`);
  console.log('\n🎉 Now go to the dashboard and create your first automation rule!');
  console.log('   http://localhost:3000/dashboard\n');
}

run().catch(err => {
  console.error('Unexpected error:', err);
});

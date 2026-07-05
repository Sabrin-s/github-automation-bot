// scratch/set-private-key.js
// Reads a .pem file and updates the .env with the correct GITHUB_PRIVATE_KEY
//
// Usage: node scratch/set-private-key.js path/to/your-key.pem

const fs = require('fs');
const path = require('path');

const pemPath = process.argv[2];

if (!pemPath) {
  // Try to find a .pem file in the project root
  const rootFiles = fs.readdirSync(path.join(__dirname, '..'));
  const pemFile = rootFiles.find(f => f.endsWith('.pem'));

  if (pemFile) {
    console.log(`Found PEM file: ${pemFile}`);
    processPem(path.join(__dirname, '..', pemFile));
  } else {
    console.log('Usage: node scratch/set-private-key.js <path-to-your-private-key.pem>');
    console.log('');
    console.log('Or just drop the .pem file into D:\\github-automation-bot\\ and run:');
    console.log('  node scratch/set-private-key.js');
    console.log('');
    console.log('How to get the .pem file:');
    console.log('  1. Go to https://github.com/settings/apps');
    console.log('  2. Click your app → Edit');
    console.log('  3. Scroll to "Private keys" → Click "Generate a private key"');
    console.log('  4. A .pem file will be downloaded');
    process.exit(1);
  }
} else {
  processPem(pemPath);
}

function processPem(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const pemContent = fs.readFileSync(filePath, 'utf8').trim();

  if (!pemContent.includes('-----BEGIN') || !pemContent.includes('PRIVATE KEY-----')) {
    console.error('❌ This does not look like a valid PEM private key file.');
    process.exit(1);
  }

  // Convert to single-line format for .env
  const singleLine = pemContent.replace(/\r?\n/g, '\\n');

  // Update .env file
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    process.exit(1);
  }

  let envContent = fs.readFileSync(envPath, 'utf8');

  // Replace existing GITHUB_PRIVATE_KEY line
  if (envContent.includes('GITHUB_PRIVATE_KEY=')) {
    envContent = envContent.replace(
      /GITHUB_PRIVATE_KEY=.*/,
      `GITHUB_PRIVATE_KEY="${singleLine}"`
    );
  } else {
    envContent += `\nGITHUB_PRIVATE_KEY="${singleLine}"\n`;
  }

  fs.writeFileSync(envPath, envContent, 'utf8');

  console.log('✅ GITHUB_PRIVATE_KEY updated in .env!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Restart the dev server (Ctrl+C then: npm run dev)');
  console.log('  2. Test the webhook: node scratch/test-webhook.js');
}

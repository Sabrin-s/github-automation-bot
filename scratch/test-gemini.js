// scratch/test-gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
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
        process.env[key] = val;
      }
    });
  }
} catch (e) {}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Missing GEMINI_API_KEY in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  console.log('Testing gemini-1.5-flash...');
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say hello');
    console.log('Success (gemini-1.5-flash):', result.response.text());
  } catch (err) {
    console.error('Error with gemini-1.5-flash:', err.message);
    console.log(JSON.stringify(err, null, 2));

    console.log('\nTesting fallback to gemini-pro...');
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const result = await model.generateContent('Say hello');
      console.log('Success (gemini-pro):', result.response.text());
    } catch (err2) {
      console.error('Error with gemini-pro:', err2.message);
    }
  }
}

run();

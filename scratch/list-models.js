// scratch/list-models.js
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyBR6eFOo03_Gn1iCNm7gpW59JEi2fl7TJQ';

async function run() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  console.log(`Fetching from ${url}...`);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Response status:', res.status);
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching models:', err);
  }
}

run();

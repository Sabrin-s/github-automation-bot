// scratch/list-flash-models.js
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyBR6eFOo03_Gn1iCNm7gpW59JEi2fl7TJQ';

async function run() {
  let url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  console.log(`Fetching models...`);
  try {
    while (url) {
      const res = await fetch(url);
      const data = await res.json();
      if (data.models) {
        const flashModels = data.models
          .filter(m => m.name.toLowerCase().includes('flash') || m.name.toLowerCase().includes('pro'))
          .map(m => ({ name: m.name, methods: m.supportedGenerationMethods }));
        console.log('Flash/Pro models in this batch:', flashModels);
      }
      url = data.nextPageToken 
        ? `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageToken=${data.nextPageToken}`
        : null;
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();

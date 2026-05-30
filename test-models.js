const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test(key) {
  try {
    const genAI = new GoogleGenerativeAI(key);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    console.log(data.models.map(m => m.name).join('\n'));
  } catch (err) {
    console.error(err);
  }
}

test('AIzaSyB91mb5AWjZClqTkLUmOhIuZP7CAaPTr0o');

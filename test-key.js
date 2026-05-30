const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test(key, label) {
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('hello');
    console.log(`Key ${label} WORKS!`);
  } catch (err) {
    console.error(`Key ${label} ERROR:`, err.message);
  }
}

test('AIzaSyB91mb5AWjZClqTkLUmOhIuZP7CAaPTr0o', 'with uppercase I');
test('AIzaSyB91mb5AWjZClqTkLUmOhluZP7CAaPTr0o', 'with lowercase l');

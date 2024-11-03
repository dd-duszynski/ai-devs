import 'dotenv/config';

const TASK_NAME = 'POLIGON';
const DATA_URL = 'https://poligon.aidevs.pl/dane.txt';
const VERIFY_URL = 'https://poligon.aidevs.pl/verify';

async function solvePoligonAPITask() {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY is not defined in environment variables');
  }
  try {
    const response = await fetch(DATA_URL);
    const text = await response.text();
    const data = text.trim().split('\n');
    const payload = {
      task: TASK_NAME,
      apikey: process.env.API_KEY,
      answer: data,
    };
    const result = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const resultJson = await result.json();
    console.log(resultJson);
  } catch (error) {
    throw new Error(error);
  }
}

solvePoligonAPITask();

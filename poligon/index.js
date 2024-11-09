import 'dotenv/config';

async function solvePoligonAPITask() {
  if (!process.env.AI_DEVS_API_KEY) {
    throw new Error('AI_DEVS_API_KEY is not defined in environment variables');
  }
  try {
    const response = await fetch(process.env.POLIGON_DANE_URL);
    const text = await response.text();
    const data = text.trim().split('\n');
    const payload = {
      task: process.env.POLIGON_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer: data,
    };
    const result = await fetch(process.env.POLIGON_VERIFY_URL, {
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

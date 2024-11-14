import 'dotenv/config';
import OpenAI from 'openai';

async function askGPT4(question) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'Ocenzuruj imię i nazwisko, wiek, miasto i ulicę z numerem domu tak, aby zastąpić je słowem CENZURA. Zamień wszelkie wrażliwe dane (imię + nazwisko, nazwę ulicy + numer, miasto, wiek osoby na słowo CENZURA. Zadbaj o każdą kropkę, przecinek, spację itp. Nie wolno Ci przeredagowywać tekstu.',
      },
      {
        role: 'user',
        content: question,
      },
    ],
  });
  return completion.choices[0].message.content;
}

async function solveTask() {
  try {
    const file = await fetch(process.env.S01E05_FILE_URL);
    const fileJSON = await file.text();
    console.log('fileJSON:', fileJSON);
    const gptAnswer = await askGPT4(fileJSON);
    console.log('gptAnswer:', gptAnswer);
    const payload = {
      task: process.env.S01E05_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer: gptAnswer,
    };
    const result = await fetch(process.env.CENTRALA_REPORT_URL, {
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

solveTask();

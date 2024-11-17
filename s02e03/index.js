import 'dotenv/config';
import OpenAI from 'openai';

async function getImagePrompt() {
  const response = await fetch(process.env.S02E03_TASK_DESCRIPTION_URL);
  const text = await response.json();
  return text.description;
}

async function getImageFromDescription(imagePrompt) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: imagePrompt,
    n: 1,
    size: '1024x1024',
  });

  return response.data[0].url;
}

async function sendAnswer(answer) {
  const response = await fetch(process.env.CENTRALA_REPORT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task: process.env.S02E03_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer: answer,
    }),
  });
  return response.json();
}

async function solve() {
  try {
    const imagePrompt = await getImagePrompt();
    console.log('imagePrompt:', imagePrompt);
    const imgUrl = await getImageFromDescription(imagePrompt);
    console.log('imgUrl:', imgUrl);
    const result = await sendAnswer(imgUrl);
    console.log('result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

solve();

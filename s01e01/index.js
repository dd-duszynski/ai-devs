import 'dotenv/config';
import { JSDOM } from 'jsdom';
import OpenAI from 'openai';

async function getQuestionFromPage() {
  const response = await fetch(process.env.S01E01_BASE_URL);
  const text = await response.text();
  const dom = new JSDOM(text);
  const questionElement = dom.window.document.getElementById('human-question');
  const question = questionElement
    ? questionElement.textContent.replace('Question:', '').trim()
    : null;
  return question;
}

async function askGPT4(question) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant. Ask as shortly as possible.',
      },
      {
        role: 'user',
        content: question,
      },
    ],
  });
  return completion.choices[0].message.content;
}

async function submitAnswer(answer) {
  const response = await fetch(process.env.S01E01_BASE_URL, {
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
    body:
      'username=tester&password=' +
      process.env.S01E01_PASSWORD +
      '&answer=' +
      answer,
  });
  const text = await response.text();
  return text;
}

async function solveTask() {
  try {
    const question = await getQuestionFromPage();
    const answer = await askGPT4(question);
    const result = await submitAnswer(answer);
    if (result) {
      const flagMatch = result.match(/{{FLG:(.*?)}}/);
      const isFlagMatchArray = Array.isArray(flagMatch);
      const flag = isFlagMatchArray
        ? flagMatch[1]
        : 'Anty-human captcha incorrect!';
      console.log(flag);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

solveTask();

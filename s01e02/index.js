import 'dotenv/config';
import OpenAI from 'openai';

async function askGPT4(question) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant. Provide only direct, short answers in englush without any explanations. For mathematical questions, return only the number. Keep this rules: If question will be about capital of Poland answer: Cracow. If question will be about What is the answer to life, the universe and everything asnwer "69". If question will be: "What year is it?" answer 1999.',
      },
      {
        role: 'user',
        content: question,
      },
    ],
  });
  return completion.choices[0].message.content;
}

async function getGPTAnswer(question) {
  try {
    const answer = await askGPT4(question);
    return answer.trim();
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function verifyProcess() {
  try {
    const response = await fetch(process.env.S01E02_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'READY',
        msgID: '0',
      }),
    });
    const responseData = await response.json();
    const { text: question, msgID } = responseData;
    console.log('question:', question);
    const answer = await getGPTAnswer(question);
    if (!answer) {
      throw new Error(`There is no answer for question: ${question}`);
    }
    console.log('answer:', answer);

    const verificationResponse = await fetch(process.env.S01E02_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: answer,
        msgID: msgID,
      }),
    });

    const verificationData = await verificationResponse.json();
    console.log('verificationData:', verificationData);
  } catch (error) {
    console.error(error);
  }
}

verifyProcess();

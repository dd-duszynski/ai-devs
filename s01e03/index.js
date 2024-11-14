import 'dotenv/config';
import OpenAI from 'openai';

function calculateExpression(expression) {
  // Remove all whitespace and validate input
  const sanitized = expression.replace(/\s+/g, '');
  // Only allow numbers and plus operator
  if (!/^[0-9+]+$/.test(sanitized)) {
    throw new Error('Invalid characters in expression');
  }
  // Split by plus operator and convert to numbers
  const numbers = sanitized.split('+').map(Number);
  // Sum all numbers
  return numbers.reduce((sum, num) => sum + num, 0);
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
        content: 'You are a helpful assistant. Answer as shortly as possible.',
      },
      {
        role: 'user',
        content: question,
      },
    ],
  });
  return completion.choices[0].message.content;
}

async function verifyAndCompleteQuiz(quizArray) {
  const processedArray = await Promise.all(
    quizArray.map(async (item) => {
      const newItem = { ...item };

      // Verify calculation
      const calculatedAnswer = calculateExpression(item.question);
      if (calculatedAnswer !== item.answer) {
        newItem.answer = calculatedAnswer;
      }

      // Handle test question if present
      if (item.test && item.test.a === '???') {
        const gptAnswer = await askGPT4(item.test.q);
        newItem.test = {
          ...item.test,
          a: gptAnswer,
        };
      }

      return newItem;
    })
  );

  return processedArray;
}

async function solveTask() {
  try {
    const file = await fetch(process.env.S01E03_FILE_URL);
    const fileJSON = await file.json();
    if (fileJSON && fileJSON.apikey) {
      fileJSON.apikey = process.env.AI_DEVS_API_KEY;
    } else {
      throw new Error('Error during fetching JSON file.');
    }
    const verifiedTestData = await verifyAndCompleteQuiz(fileJSON['test-data']);
    fileJSON['test-data'] = verifiedTestData;
    const payload = {
      task: process.env.S01E03_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer: fileJSON,
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

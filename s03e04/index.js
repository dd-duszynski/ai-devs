import 'dotenv/config';
import OpenAI from 'openai';

async function askGPT(question) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: question,
      },
    ],
  });
  return completion.choices[0].message.content;
}

async function fetchNote() {
  const response = await fetch(process.env.S03E04_BARBARA_URL);
  return response.text();
}

async function queryAPI(endpoint, query) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: process.env.AI_DEVS_API_KEY,
      query,
    }),
  });
  return response.json();
}

async function sendAnswer(answer) {
  const response = await fetch(process.env.CENTRALA_REPORT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task: process.env.S03E04_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer: answer,
    }),
  });
  return response.json();
}

async function solve() {
  try {
    // const note = await fetchNote()
    const visited = new Set();
    const toCheck = new Set();

    const { names, cities } = {
      names: ['ALEKSANDER', 'ANDRZEJ', 'RAFAL', 'ADAM', 'AZAZEL', 'GABRIEL'],
      cities: ['KRAKOW', 'WARSZAWA', 'LUBLIN', 'GRUDZIADZ', 'CIECHOCINEK'],
    };

    // Add initial items to check - store as strings to enable proper comparison
    cities.forEach((city) =>
      toCheck.add(
        JSON.stringify([process.env.S03E04_PLACES_URL, city.toUpperCase()])
      )
    );
    names.forEach((name) =>
      toCheck.add(
        JSON.stringify([process.env.S03E04_PEOPLE_URL, name.toUpperCase()])
      )
    );

    while (toCheck.size > 0) {
      const currentItem = toCheck.values().next().value;
      const [endpoint, query] = JSON.parse(currentItem);
      toCheck.delete(currentItem);

      if (visited.has(`${endpoint}-${query}`)) continue;
      visited.add(`${endpoint}-${query}`);

      const result = await queryAPI(endpoint, query);
      console.log(`Checking ${endpoint} - ${query}:`, result);

      if (result) {
        const names = result.message.split(' ');
        if (Array.isArray(names)) {
          names.forEach(async (n) => {
            const answer = await sendAnswer(n);
            console.log('answer:', answer);
          });
        }
        const answer = await sendAnswer(query);
        console.log('answer:', answer);
        if (answer.code !== -1000) {
          return;
        }
      }

      // Add new items to check
      if (Array.isArray(result)) {
        result.forEach((item) => {
          const newEndpoint =
            endpoint === process.env.S03E04_PEOPLE_URL
              ? process.env.S03E04_PLACES_URL
              : process.env.S03E04_PEOPLE_URL;
          toCheck.add(JSON.stringify([newEndpoint, item]));
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

solve();

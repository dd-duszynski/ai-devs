import 'dotenv/config';

async function apiDB(query) {
  const response = await fetch(process.env.S03E03_API_DB, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      task: process.env.S03E03_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      query: query,
    }),
  });
  return response.json();
}

async function sendAnswer(answer) {
  const response = await fetch(process.env.CENTRALA_REPORT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      task: process.env.S03E03_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer: answer,
    }),
  });

  return response.json();
}

async function solve() {
  try {
    const usersStructure = await apiDB('show create table users');
    const datacentersStructure = await apiDB('show create table datacenters');
    console.log('Tables structure:', usersStructure, datacentersStructure);
    const query = `
      SELECT DISTINCT d.dc_id 
      FROM datacenters d 
      JOIN users u ON d.manager = u.id 
      WHERE d.is_active = 1 
      AND u.is_active = 0
    `;
    const result = await apiDB(query);
    const dcIds = result.reply.map((row) => row.dc_id);
    const answer = await sendAnswer(dcIds);
    console.log('Answer:', answer);
  } catch (error) {
    console.error('error: ', error);
  }
}

solve();

import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import OpenAI from 'openai';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function filterFilesByExtension(fileExtension, folderPath) {
  const taskDir = join(__dirname, folderPath);
  const taskReaddir = await readdir(taskDir);
  const filteredFiles = taskReaddir.filter((file) =>
    file.endsWith(fileExtension)
  );
  return { filteredFiles, taskDir };
}

async function prepareReports() {
  const { filteredFiles, taskDir } = await filterFilesByExtension(
    '.txt',
    '../task_files/s03e01/weapons_tests/do-not-share'
  );
  let reports = '';
  for (const fileName of filteredFiles) {
    const filePath = join(taskDir, fileName);
    const fileContent = await readFile(filePath, 'utf-8');
    reports = `${reports} 
${fileName}: ${fileContent}`;
  }
  return reports;
}

async function askGPT(reports) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni? Udziel odpowiedzi w formacie 'YYYY-MM-DD'.`,
      },
      {
        role: 'user',
        content: `Tu znajdują się dane z raportów: ${reports}.`,
      },
    ],
  });
  return completion.choices[0].message.content;
}

async function sendAnswer(answer) {
  const response = await fetch(process.env.CENTRALA_REPORT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      task: process.env.S03E02_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer: answer,
    }),
  });

  return response.json();
}

async function solve() {
  try {
    const reports = await prepareReports();
    console.log('reports:', reports);
    const gptAnswers = await askGPT(reports);
    console.log('gptAnswers:', gptAnswers);
    const result = await sendAnswer(gptAnswers);
    console.log('result:', result);
  } catch (error) {
    console.error('error: ', error);
  }
}

solve();

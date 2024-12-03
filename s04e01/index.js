import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import OpenAI from 'openai';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const REPAIR = 'REPAIR';
const DARKEN = 'DARKEN';
const BRIGHTEN = 'BRIGHTEN';
const img559 = 'IMG_559.PNG';
const img1234 = 'IMG_1234.PNG';
const img1410 = 'IMG_1410.PNG';
const img1443 = 'IMG_1443.PNG';
const img1444 = 'IMG_1444.PNG';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function centrala(answer) {
  const response = await fetch(process.env.CENTRALA_REPORT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      task: process.env.S04E01_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer: answer,
    }),
  });
  return response.json();
}

async function filterFiles() {
  const taskDir = join(__dirname, '../task_files/s04e01');
  const taskReaddir = await readdir(taskDir);
  const properFiles = ['IMG_559_NRR7.webp', 'IMG_1443_FT12.webp'];
  const filteredFiles = taskReaddir.filter((file) => {
    return properFiles.includes(file);
  });
  return { filteredFiles, taskDir };
}

async function analyzePNGFiles() {
  const { filteredFiles, taskDir } = await filterFiles();
  const data = [];
  for (const file of filteredFiles) {
    const filePath = join(taskDir, file);
    const fileData = await readFile(filePath);
    const base64Image = fileData.toString('base64');
    const fileContent = await analyzePNGImage(base64Image);
    data.push(fileContent);
  }
  return data.join('\n');
}

async function analyzePNGImage(base64Image) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'Przygotuj rysopis osoby widocznej na tym zdjęciu. Opisz dokładnie i ze szczegółami. Nie interesuje mnie kim jest ta osoba, jedynie jej cechy szczególne. Użyj języka polskiego.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    temperature: 0,
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
      task: process.env.S04E01_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer,
    }),
  });

  return response.json();
}

async function solve() {
  try {
    // const centralaResponse = await centrala('START');
    // const centralaResponse = await centrala(`${DARKEN} IMG_559_FGR4.PNG`);
    // const centralaResponse2 = await centrala(`${BRIGHTEN} IMG_1410.PNG`);
    const analyzedPNGFiles = await analyzePNGFiles();
    console.log('analyzedPNGFiles:', analyzedPNGFiles);
    const sendAnswerResponse = await sendAnswer(analyzedPNGFiles);
    console.log('sendAnswerResponse:', sendAnswerResponse);
  } catch (error) {
    console.error('error: ', error);
  }
}

solve();

import 'dotenv/config';
import { createReadStream } from 'fs';
import { readdir, readFile } from 'fs/promises';
import OpenAI from 'openai';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function filterFilesByExtension(fileExtension) {
  const taskDir = join(__dirname, '../task_files/s02e04');
  const taskReaddir = await readdir(taskDir);
  const filteredFiles = taskReaddir.filter((file) =>
    file.endsWith(fileExtension)
  );
  return { filteredFiles, taskDir };
}

async function analyzePNGImage(base64Image) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'Załączone obrazki zawierają raporty dzienne kilku oddziałów. Wydobądź tekst jaki w nich się znajduje i go zwróć.',
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

async function analyzeFileContent(description) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Załączony opis zawiera raport dzienny. Jeśli opis zawiera informacje o schwytanych ludziach i śladach ich obecności (wtedy zwróć 'PEOPLE!'), jeśli opis zawieta informacje o naprawionych usterkach hardwarowych (wtedy zwróć 'HARDWARE!'). Istnieje szansa, że znaleziona informacja nie dotyczy ani ludzi, ani hardware (wtedy zwróć 'POMINIĘTE!').`,
      },
      {
        role: 'user',
        content: description,
      },
    ],
  });
  return completion.choices[0].message.content;
}

async function transcribeAudio(audioPath) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const audioFile = createReadStream(audioPath);
  const transcript = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
  });
  return transcript.text;
}

async function sendAnswer(answer) {
  const response = await fetch(process.env.CENTRALA_REPORT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task: process.env.S02E04_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer: answer,
    }),
  });
  return response.json();
}

async function analyzePNGFiles() {
  const { filteredFiles, taskDir } = await filterFilesByExtension('.png');
  const data = [];
  for (const file of filteredFiles) {
    const filePath = join(taskDir, file);
    const fileData = await readFile(filePath);
    const base64Image = fileData.toString('base64');
    const fileContent = await analyzePNGImage(base64Image);
    const analyzedFileContent = await analyzeFileContent(fileContent);
    data.push({ [file]: `${analyzedFileContent}` });
  }
  return data;
}

async function analyzeTXTFiles() {
  const { filteredFiles, taskDir } = await filterFilesByExtension('.txt');
  const data = [];
  for (const file of filteredFiles) {
    const filePath = join(taskDir, file);
    const fileContent = await readFile(filePath, 'utf-8');
    const analyzedFileContent = await analyzeFileContent(fileContent);
    data.push({ [file]: `${analyzedFileContent}` });
  }
  return data;
}

async function analyzeMP3Files() {
  const { filteredFiles, taskDir } = await filterFilesByExtension('.mp3');
  const data = [];
  for (const file of filteredFiles) {
    const filePath = join(taskDir, file);
    const fileContent = await transcribeAudio(filePath);
    const analyzedFileContent = await analyzeFileContent(fileContent);
    data.push({ [file]: `${analyzedFileContent}` });
  }
  return data;
}

function transformArray(inputArray) {
  return inputArray.reduce((acc, curr) => {
    const [[filename, value]] = Object.entries(curr);
    if (value === 'POMINIĘTE!') return acc;
    const category = value.replace('!', '').toLowerCase();
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(filename);
    return acc;
  }, {});
}

async function solve() {
  try {
    const png = await analyzePNGFiles();
    const txt = await analyzeTXTFiles();
    const mp3 = await analyzeMP3Files();
    const answer = transformArray([...png, ...txt, ...mp3]);
    const result = await sendAnswer(answer);
    console.log('result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

solve();

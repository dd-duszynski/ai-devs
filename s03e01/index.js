import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import OpenAI from 'openai';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
// import { factsKeywords } from './factsKeywords.js';
// import { reportsKeywords } from './reportsKeywords.js';

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

async function prepareFacts() {
  const { filteredFiles, taskDir } = await filterFilesByExtension(
    '.txt',
    '../task_files/s03e01/facts'
  );
  let facts = '';
  for (const fileName of filteredFiles) {
    const filePath = join(taskDir, fileName);
    const fileContent = await readFile(filePath, 'utf-8');
    facts = `${facts} 
${fileName}: ${fileContent}`;
  }
  return facts;
}

async function prepareReports() {
  const { filteredFiles, taskDir } = await filterFilesByExtension(
    '.txt',
    '../task_files/s03e01'
  );
  let content = '';
  for (const fileName of filteredFiles) {
    const filePath = join(taskDir, fileName);
    const fileContent = await readFile(filePath, 'utf-8');
    content = `${content} 
    ${fileName}: ${fileContent}`;
  }
  return content;
}

async function prepareKeywords(content) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Twoim zadaniem jest stworzenie listy słów kluczowych (w formie mianownika) na podstawie podanego przez użytkownika tekstu. W tekście jest podział na pliki. Do każdego pliku przyporządkuj słowa kluczowe, które  muszą być w formie mianownika (czyli np. “sportowiec”, a nie “sportowcem”, “sportowców” itp).
        Oczekiwany format odpowiedzi:
        {
        "f01.txt":"lista, słów, kluczowych 1",
        "f02.txt":"lista, słów, kluczowych 2",
        }
        `,
      },
      {
        role: 'user',
        content: content,
      },
    ],
  });
  return completion.choices[0].message.content;
}

async function askGPT(factsKeywords, reportsKeywords) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Twoim zadaniem jest stworzenie listy słów kluczowych (w formie mianownika) dla podanych raportów (przykład nazwy: 2024-11-12_report-00-sektor_C4.txt). 
        Wywnioskuj, który fakt dotyczy osoby z raportu (możesz np. wydobyć z faktów imię i nazwisko). Połącz słowa kluczowe z faktów ze słowami kluczowymi z odpowiednich raportów. Oczekiwany format odpowiedzi:
        {
          "2024-11-12_report-00-sektor_C4.txt":"lista, słów, kluczowych",
          "2024-11-12_report-01-sektor_A1.txt":"lista, słów, kluczowych",
        }
        `,
      },
      {
        role: 'user',
        content: `
        Tu znajdują się dane z raportów: ${reportsKeywords}.
        Tu znajdują się dane z faktów: ${factsKeywords}.
        `,
      },
    ],
  });
  return completion.choices[0].message.content;
}

async function sendAnswer(answer) {
  const cleanJson = answer
    .replace(/```json\n/g, '')
    .replace(/```/g, '')
    .trim();
  const parsedAnswer = JSON.parse(cleanJson);
  const response = await fetch(process.env.CENTRALA_REPORT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      task: process.env.S03E01_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer: parsedAnswer,
    }),
  });

  return response.json();
}

async function solve() {
  try {
    const facts = await prepareFacts();
    const factsKeywords = await prepareKeywords(facts);
    const content = await prepareReports();
    const reportsKeywords = await prepareKeywords(content);
    const gptAnswers = await askGPT(factsKeywords, reportsKeywords);
    console.log('gptAnswers:', gptAnswers);
    const result = await sendAnswer(gptAnswers);
    console.log('result:', result);
  } catch (error) {
    console.error('error: ', error);
  }
}

solve();

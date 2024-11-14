import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import 'dotenv/config';
// import { transcriptions } from './transcriptions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function transcribeAudio(audioPath) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const audioFile = fs.createReadStream(audioPath);
  const transcript = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
  });
  return transcript.text;
}

async function processFiles() {
  const taskDir = path.join(__dirname, '../task_files/s02e01');
  const files = fs.readdirSync(taskDir).filter((file) => file.endsWith('.m4a'));
  const transcriptions = [];
  for (const file of files) {
    const filePath = path.join(taskDir, file);
    const transcription = await transcribeAudio(filePath);
    transcriptions.push(`${file}: ${transcription}\n`);
  }
  return transcriptions.join('\n');
}

async function analyzeTranscriptions(transcriptions) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Jesteś analitykiem badającym zeznania świadków. 
        Przeanalizuj transkrypcje i znajdź nazwę ulicy, na jakiej znajduje się instytut, w którym wykłada profesor Maj.
        
        Wykonaj następujące kroki:
        1. Przeanalizuj każdą transkrypcję. Zeznania mogą się wzajemnie wykluczać lub uzupełniać.
        2. Znajdź odpowiedź na pytanie, na jakiej ulicy znajduje się uczelnia, na której wykłada Andrzej Maj.
        3. Nie zwracaj ulicy z główną siedzibą uczelni, tutaj chodzi o konkretny wydział. Jeśli będziesz posiadał odpowiedź co do miejsca, to upewnij się w internecie czy taka uczelnia znajduje się na takiej ulicy.

        Podaj adres uczelni.
        `,
      },
      {
        role: 'user',
        content: transcriptions,
      },
    ],
    temperature: 0.5,
  });
  return completion.choices[0].message.content;
}

async function sendAnswer(answer) {
  const response = await fetch(process.env.CENTRALA_REPORT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      task: process.env.S02E01_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer: answer,
    }),
  });

  return response.json();
}

async function solve() {
  try {
    const transcriptions = await processFiles();
    const streetName = await analyzeTranscriptions(transcriptions);
    console.log('streetName:', streetName);
    const result = await sendAnswer(streetName);
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

solve();

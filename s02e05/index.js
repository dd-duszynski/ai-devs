import 'dotenv/config';
import { createReadStream } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import OpenAI from 'openai';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
// import { mp3transcription } from './mp3transcription.js';
// import { textFromAttachments } from './textFromAttachments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function analyzePNGImage(base64Image) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'Opisz dokładnie co widzisz na obrazku. Użyj języka polskiego.',
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

async function transcribeAudio(audioPath) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const audioFile = createReadStream(audioPath);
  const transcript = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
  });
  return transcript.text;
}

async function getQuestions(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const text = await response.text();
  return text;
}

async function analyzePNGFromUrl(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString('base64');
  return analyzePNGImage(base64Image);
}

async function analyzeMP3FromUrl(url) {
  const tempPath = join(__dirname, `temp_${Date.now()}.mp3`);
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    await writeFile(tempPath, Buffer.from(arrayBuffer));
    const result = await transcribeAudio(tempPath);
    await unlink(tempPath);
    return result;
  } catch (error) {
    await unlink(tempPath).catch(() => {});
    throw error;
  }
}

async function prepareTextFromURLattachments(attachments) {
  const data = [];
  for (const attachment of attachments) {
    if (attachment.url.endsWith('.png')) {
      const pngResult = await analyzePNGFromUrl(attachment.url);
      data.push({ markdownURL: attachment.markdownURL, text: pngResult });
    } else if (attachment.url.endsWith('.mp3')) {
      const mp3Result = await analyzeMP3FromUrl(attachment.url);
      // const mp3Result = mp3transcription;
      data.push({ markdownURL: attachment.markdownURL, text: mp3Result });
    }
  }
  return data;
}

function prepareFinalMarkdown(initialMarkdown, arrayFromAttachments) {
  let finalMarkdown = `${initialMarkdown}`;
  arrayFromAttachments.forEach((element) => {
    finalMarkdown = finalMarkdown.replace(element.markdownURL, element.text);
  });
  return finalMarkdown;
}

function extractAttachments(markdown) {
  const attachments = [];
  const imageRegex = /!\[.*?\]\((.*?)\)/g;
  const imageMatches = [...markdown.matchAll(imageRegex)];
  imageMatches.forEach((match) => attachments.push(match[1]));
  const linkRegex = /\[.*?\]\((.*?)\)/g;
  const linkMatches = [...markdown.matchAll(linkRegex)];
  linkMatches.forEach((match) => attachments.push(match[1]));
  return [...new Set(attachments)]
    .filter((path) => path.startsWith('i/'))
    .map((i) => {
      return {
        markdownURL: `(${i})`,
        url: `${process.env.S02E05_BASE_URL}/${i}`,
      };
    });
}

async function initialHTMLToMarkdown(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const nhm = new NodeHtmlMarkdown({
      useInlineLinks: true,
      bulletMarker: '-',
      codeBlockStyle: 'fenced',
    });
    const markdown = nhm.translate(html);
    return markdown;
  } catch (error) {
    console.error('Error converting HTML to Markdown:', error);
    throw error;
  }
}

async function getAnswers(markdown, questions) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `W oparciu o podany tekst udziel odpowiedni na podane przez usera pytania. Odpowiedź musi zostać udzielona w formacie podanym poniżej.
        Oczekiwany format odpowiedzi to:
        {
          "01": "krótka odpowiedź w 1 zdaniu",
          "02": "krótka odpowiedź w 1 zdaniu",
          "03": "krótka odpowiedź w 1 zdaniu",
        }

        Tekst: ${markdown}
        `,
      },
      {
        role: 'user',
        content: questions,
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
      task: process.env.S02E05_TASK_NAME,
      apikey: process.env.AI_DEVS_API_KEY,
      answer: JSON.parse(answer),
    }),
  });
  return response.json();
}

async function solve() {
  try {
    const questions = await getQuestions(process.env.S02E05_QUESTIONS_URL);
    console.log('questions:', questions);
    const initialMarkdown = await initialHTMLToMarkdown(
      process.env.S02E05_ARTICLE_URL
    );
    const attachments = extractAttachments(initialMarkdown);
    const textFromAttachments = await prepareTextFromURLattachments(
      attachments
    );
    const finalMarkdown = prepareFinalMarkdown(
      initialMarkdown,
      textFromAttachments
    );
    const gptAnswers = await getAnswers(finalMarkdown, questions);
    console.log('gptAnswers:', gptAnswers);
    // IMPORTANT: Finally I send answer in Postman
    const result = await sendAnswer(gptAnswers);
    console.log('result:', result);
  } catch (error) {
    console.error('error: ', error);
  }
}

solve();

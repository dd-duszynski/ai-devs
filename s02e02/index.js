import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function analyzeMaps() {
  const taskDir = join(__dirname, '../task_files/s02e02');
  const files = await readdir(taskDir);
  const pngFiles = files.filter((file) => file.endsWith('.png'));
  const cities = [];
  for (const file of pngFiles) {
    const filePath = join(taskDir, file);
    const fileData = await readFile(filePath);
    const base64Image = fileData.toString('base64');
    const mapDescription = await analyzeCityMapImage(base64Image);
    const city = await getCityFromDescription(mapDescription);
    cities.push({ [file]: `${city} - ${mapDescription}` });
  }
  return cities;
}

async function analyzeCityMapImage(base64Image) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Załączone obrazki zawierają mape miasta w Polsce. Na podstawie obrazka opisz mi, co widzisz. Przedstaw informacje jakie ulice krzyżują się ze sobą oraz jakie budynki lub obiekty są widoczne na obrazku.`,
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

async function getCityFromDescription(description) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Załączone opisy zawierają informacje o mieście w Polsce. Spróbuj zgadnąć jakie to miasto. Przeanalizuj to, jeśli nie masz pewności wyszukaj w internecie podpowiedzi i podaj mi jedynie nazwę miasta.
        Przykładowa odpowiedz:
        Grudziądz
        Kraków
        Łódź
        `,
      },
      {
        role: 'user',
        content: description,
      },
    ],
  });
  return completion.choices[0].message.content;
}

async function solve() {
  try {
    const result = await analyzeMaps();
    console.log('result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

solve();

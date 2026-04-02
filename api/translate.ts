import type { VercelRequest, VercelResponse } from '@vercel/node';

const AZURE_KEY = process.env.AZURE_TRANSLATOR_KEY ?? '';
const AZURE_REGION = process.env.AZURE_TRANSLATOR_REGION ?? 'westeurope';
const AZURE_ENDPOINT = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=en';

function toAzureCode(language: string): string | null {
  if (language === 'en') return null;

  const map: Record<string, string> = {
    // South Asian
    'hi': 'hi', 'hi-latn': 'hi',
    'ur': 'ur', 'ur-latn': 'ur',
    'ta': 'ta', 'ta-latn': 'ta',
    'te': 'te', 'te-latn': 'te',
    'kn': 'kn', 'kn-latn': 'kn',
    'ml': 'ml', 'ml-latn': 'ml',
    'bn': 'bn', 'bn-latn': 'bn',
    'pa': 'pa', 'pa-latn': 'pa',
    // East Asian
    'ko': 'ko', 'ko-latn': 'ko',
    'ja': 'ja', 'ja-latn': 'ja',
    'zh': 'zh-Hans', 'zh-latn': 'zh-Hans',
    // Southeast Asian
    'vi': 'vi', 'vi-latn': 'vi',
    'th': 'th', 'th-latn': 'th',
    'id': 'id', 'id-latn': 'id',
    'ms': 'ms', 'ms-latn': 'ms',
    // Middle Eastern
    'ar': 'ar', 'ar-latn': 'ar',
    'fa': 'fa', 'fa-latn': 'fa',
    'he': 'he', 'he-latn': 'he',
    // European
    'ru': 'ru', 'ru-latn': 'ru',
    'el': 'el', 'el-latn': 'el',
    'fr': 'fr', 'fr-latn': 'fr',
    'es': 'es', 'es-latn': 'es',
    'pt': 'pt', 'pt-latn': 'pt',
    'it': 'it', 'it-latn': 'it',
    'de': 'de', 'de-latn': 'de',
    'nl': 'nl', 'nl-latn': 'nl',
    'sv': 'sv', 'sv-latn': 'sv',
    'pl': 'pl', 'pl-latn': 'pl',
    'tr': 'tr', 'tr-latn': 'tr',
    // African
    'sw': 'sw', 'sw-latn': 'sw',
    'am': 'am', 'am-latn': 'am',
    // Central Asian
    'uz': 'uz', 'uz-latn': 'uz',
    'az': 'az', 'az-latn': 'az',
  };

  return map[language] ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!AZURE_KEY) {
    return res.status(500).json({ error: 'AZURE_TRANSLATOR_KEY is not configured' });
  }

  const { lines, language } = req.body as { lines?: string[]; language?: string };

  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'lines array is required' });
  }
  if (!language) {
    return res.status(400).json({ error: 'language is required' });
  }

  const sourceLang = toAzureCode(language);

  // Already English or unsupported — return as-is
  if (!sourceLang) {
    return res.status(200).json({ translations: lines });
  }

  try {
    const body = lines.map((text) => ({ text }));

    // For romanized variants, omit from= and let Azure auto-detect
    const isRomanized = language.endsWith('-latn');
    const url = isRomanized ? AZURE_ENDPOINT : `${AZURE_ENDPOINT}&from=${sourceLang}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Ocp-Apim-Subscription-Region': AZURE_REGION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Azure Translator error:', err);
      return res.status(500).json({ error: 'Translation failed', detail: err });
    }

    const data = (await response.json()) as Array<{
      translations: Array<{ text: string; to: string }>;
    }>;

    const translated = data.map((item) => item.translations[0]?.text ?? '');
    return res.status(200).json({ translations: translated });
  } catch (err) {
    console.error('Translate handler error:', err);
    return res.status(500).json({ error: 'Translation request failed' });
  }
}
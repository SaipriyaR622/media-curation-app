// api/lyrics.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN ?? '';
const LEWD_BASE = 'https://lyrics.lewdhutao.my.eu.org';

// ── helpers (keep your originals) ──────────────────────────────────────────

function isLatinScript(text: string): boolean {
  const nonLatin = text.match(/[^\u0000-\u024F\u1E00-\u1EFF\s\p{P}\p{N}]/gu);
  const total = text.replace(/\s/g, '').length;
  if (total === 0) return true;
  return (nonLatin?.length ?? 0) / total < 0.1;
}

function detectLanguage(text: string): string {
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) return 'ja';
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  if (/[\u0370-\u03FF]/.test(text)) return 'el';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  return 'en';
}

function cleanLyrics(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.replace(/^\d+\s*Contributor.*?Lyrics/i, '').trim())
    .filter((line) => {
      if (!line) return false;
      if (/^\[.*\]$/.test(line)) return false;
      if (/Contributors|Translations|Lyrics/i.test(line)) return false;
      return true;
    });
}

// ── source 1: Musixmatch via LewdHuTao ─────────────────────────────────────

async function fetchFromMusixmatch(title: string, artist: string): Promise<string[] | null> {
  try {
    const params = new URLSearchParams({ title, artist });
    const res = await fetch(`${LEWD_BASE}/v2/musixmatch/lyrics?${params}`);
    if (!res.ok) return null;

    const json = (await res.json()) as { data?: { lyrics?: string } };
    const raw = json?.data?.lyrics;
    if (!raw?.trim()) return null;

    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('***')); // strip Musixmatch footer
  } catch {
    return null;
  }
}

// ── source 2: YouTube Music via LewdHuTao ──────────────────────────────────

async function fetchFromYouTube(title: string, artist: string): Promise<string[] | null> {
  try {
    const params = new URLSearchParams({ title, artist });
    const res = await fetch(`${LEWD_BASE}/v2/youtube/lyrics?${params}`);
    if (!res.ok) return null;

    const json = (await res.json()) as { data?: { lyrics?: string } };
    const raw = json?.data?.lyrics;
    if (!raw?.trim()) return null;

    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

// ── source 3: Genius (your original, untouched) ────────────────────────────

async function fetchFromGenius(title: string, artist: string): Promise<string[] | null> {
  if (!GENIUS_TOKEN) return null;

  const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(`${title} ${artist}`)}`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${GENIUS_TOKEN}` },
  });
  if (!searchRes.ok) return null;

  const searchData = (await searchRes.json()) as {
    response?: { hits?: Array<{ result?: { url?: string; primary_artist?: { name?: string } } }> };
  };

  const hits = searchData.response?.hits ?? [];
  if (hits.length === 0) return null;

  const normalizedArtist = artist.toLowerCase();
  const normalizedTitle = title.toLowerCase();

  const hit =
    hits.find((h) => h.result?.url?.toLowerCase().includes('romanized')) ??
    hits.find((h) => h.result?.url?.toLowerCase().includes(normalizedTitle)) ??
    hits.find((h) => h.result?.primary_artist?.name?.toLowerCase().includes(normalizedArtist)) ??
    hits[0];

  const songUrl = hit.result?.url;
  if (!songUrl) return null;

  const pageRes = await fetch(songUrl);
  if (!pageRes.ok) return null;

  const html = await pageRes.text();
  const lyricsBlocks = [...html.matchAll(/data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g)];
  if (lyricsBlocks.length === 0) return null;

  const rawText = lyricsBlocks
    .map(([, content]) =>
      content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p><p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
    )
    .join('\n');

  const lines = cleanLyrics(rawText);
  return lines.length > 0 ? lines : null;
}

// ── handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
  const artist = typeof req.query.artist === 'string' ? req.query.artist.trim() : '';

  if (!title || !artist) {
    return res.status(400).json({ error: 'title and artist query params are required' });
  }
  try {
    // 1️⃣ YouTube Music
    let lines = await fetchFromYouTube(title, artist);
    let source: 'musixmatch' | 'youtube' | 'genius' = 'youtube';

    // 2️⃣ Genius fallback
    if (!lines) {
      lines = await fetchFromGenius(title, artist);
      source = 'genius';
    }

    if (!lines || lines.length === 0) {
      return res.status(404).json({ error: 'Lyrics not found' });
    }
    const sampleText = lines.slice(0, 10).join(' ');

    return res.status(200).json({
      lines,
      language: detectLanguage(sampleText),
      isLatinScript: isLatinScript(sampleText),
      source,
    });
  } catch (err) {
    console.error('Lyrics fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch lyrics' });
  }
}
const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const TOKEN_STORAGE_KEY = 'fragments-spotify-token';
const VERIFIER_STORAGE_KEY = 'fragments-spotify-code-verifier';

const SCOPES = ['user-read-currently-playing', 'user-read-playback-state'];
const SYNC_SCOPES = ['user-library-read', 'user-read-recently-played'];
const ALL_SCOPES = [...new Set([...SCOPES, ...SYNC_SCOPES])];

interface SpotifyTokenPayload {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface SpotifyTrackResult {
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  spotifyUrl: string;
  previewUrl: string;
  durationMs: number;
}

export interface SpotifySavedTrackResult extends SpotifyTrackResult {
  addedAt: string;
}

export interface SpotifyRecentTrackResult extends SpotifyTrackResult {
  playedAt: string;
}

interface SpotifyTrackApiResponse {
  id: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  external_urls?: { spotify?: string };
  artists?: Array<{ name?: string }>;
  album?: { name?: string; images?: Array<{ url?: string }> };
}

interface SpotifySavedTrackResponse {
  added_at?: string;
  track?: SpotifyTrackApiResponse;
}

interface SpotifyRecentTrackResponse {
  played_at?: string;
  track?: SpotifyTrackApiResponse;
}

function getClientId() {
  const value = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  return typeof value === 'string' ? value.trim() : '';
}

function isLoopbackHost(hostname: string) {
  return hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function normalizeRedirectUri(value: string) {
  const url = new URL(value);

  if (url.hostname === 'localhost') {
    url.hostname = '127.0.0.1';
  }

  if (url.protocol !== 'https:' && !isLoopbackHost(url.hostname)) {
    throw new Error('Spotify redirect URI must use HTTPS or loopback IP literal (127.0.0.1 / [::1]).');
  }

  return url.toString();
}

function getRedirectUri() {
  const configured = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  if (typeof configured === 'string' && configured.trim()) {
    return normalizeRedirectUri(configured.trim());
  }
  return normalizeRedirectUri(`${window.location.origin}/library/songs`);
}

function generateRandomString(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const random = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(random)
    .map((x) => chars[x % chars.length])
    .join('');
}

async function sha256(plain: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const subtle = globalThis.crypto?.subtle;

  if (subtle) {
    return subtle.digest('SHA-256', data);
  }

  return sha256Fallback(data).buffer;
}

function rightRotate(value: number, amount: number) {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256Fallback(input: Uint8Array) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const bitLength = input.length * 8;
  const withOneBit = input.length + 1;
  const padLength = (64 - ((withOneBit + 8) % 64)) % 64;
  const totalLength = withOneBit + padLength + 8;
  const data = new Uint8Array(totalLength);
  data.set(input);
  data[input.length] = 0x80;

  const dataView = new DataView(data.buffer);
  const highLength = Math.floor(bitLength / 2 ** 32);
  const lowLength = bitLength >>> 0;
  dataView.setUint32(totalLength - 8, highLength);
  dataView.setUint32(totalLength - 4, lowLength);

  const W = new Uint32Array(64);

  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let t = 0; t < 16; t += 1) {
      W[t] = dataView.getUint32(offset + t * 4);
    }

    for (let t = 16; t < 64; t += 1) {
      const s0 = rightRotate(W[t - 15], 7) ^ rightRotate(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rightRotate(W[t - 2], 17) ^ rightRotate(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (((W[t - 16] + s0) >>> 0) + ((W[t - 7] + s1) >>> 0)) >>> 0;
    }

    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    let f = H[5];
    let g = H[6];
    let h = H[7];

    for (let t = 0; t < 64; t += 1) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = ((((h + S1) >>> 0) + ((ch + K[t]) >>> 0)) >>> 0) + W[t];
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const output = new Uint8Array(32);
  const outputView = new DataView(output.buffer);
  for (let i = 0; i < 8; i += 1) {
    outputView.setUint32(i * 4, H[i]);
  }
  return output;
}

function base64UrlEncode(input: ArrayBuffer) {
  const bytes = new Uint8Array(input);
  let str = '';
  bytes.forEach((byte) => {
    str += String.fromCharCode(byte);
  });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function loadTokenPayload(): SpotifyTokenPayload | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<SpotifyTokenPayload>;
    if (!parsed.accessToken || !parsed.expiresAt) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function saveTokenPayload(payload: SpotifyTokenPayload | null) {
  if (!payload) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(payload));
}

export function isSpotifyConfigured() {
  return Boolean(getClientId());
}

export async function beginSpotifyLogin() {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('Missing VITE_SPOTIFY_CLIENT_ID');
  }

  const verifier = generateRandomString(96);
  const challenge = base64UrlEncode(await sha256(verifier));
  const state = generateRandomString(24);

  localStorage.setItem(VERIFIER_STORAGE_KEY, verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: ALL_SCOPES.join(' '),
    state,
    show_dialog: 'true',
  });

  window.location.href = `${SPOTIFY_AUTH_BASE}/authorize?${params.toString()}`;
}

export async function completeSpotifyLogin(code: string) {
  const verifier = localStorage.getItem(VERIFIER_STORAGE_KEY);
  if (!verifier) {
    throw new Error('Missing PKCE code verifier');
  }

  const response = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      client_id: getClientId(),
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    throw new Error('Spotify authorization failed');
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!data.access_token || !data.expires_in) {
    throw new Error('Spotify token response is incomplete');
  }

  saveTokenPayload({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  localStorage.removeItem(VERIFIER_STORAGE_KEY);
}

async function refreshSpotifyToken(refreshToken: string) {
  const response = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: getClientId(),
    }),
  });

  if (!response.ok) {
    throw new Error('Could not refresh Spotify token');
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };

  if (!data.access_token || !data.expires_in) {
    throw new Error('Refresh token response is incomplete');
  }

  const existing = loadTokenPayload();
  const payload: SpotifyTokenPayload = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || existing?.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  saveTokenPayload(payload);
  return payload.accessToken;
}

export async function getSpotifyAccessToken() {
  const payload = loadTokenPayload();
  if (!payload) {
    return null;
  }

  const hasTimeLeft = payload.expiresAt - Date.now() > 60_000;
  if (hasTimeLeft) {
    return payload.accessToken;
  }

  if (!payload.refreshToken) {
    saveTokenPayload(null);
    return null;
  }

  return refreshSpotifyToken(payload.refreshToken);
}

async function spotifyFetch<T>(path: string, allowNoContent = false): Promise<T | null> {
  const accessToken = await getSpotifyAccessToken();
  if (!accessToken) {
    throw new Error('Spotify account is not connected');
  }

  const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (allowNoContent && response.status === 204) {
    return null;
  }

  if (!response.ok) {
    let details = '';
    try {
      const payload = (await response.json()) as { error?: { message?: string } | string };
      if (typeof payload.error === 'string') {
        details = payload.error;
      } else if (payload.error?.message) {
        details = payload.error.message;
      }
    } catch {
      // ignore JSON parse errors for non-JSON payloads
    }

    const baseMessage = `Spotify API request failed (${response.status})`;
    throw new Error(details ? `${baseMessage}: ${details}` : baseMessage);
  }

  return (await response.json()) as T;
}

function mapTrack(track: SpotifyTrackApiResponse): SpotifyTrackResult {
  return {
    spotifyId: track.id,
    title: track.name,
    artist: (track.artists || []).map((artist) => artist.name).filter(Boolean).join(', '),
    album: track.album?.name || '',
    coverUrl: track.album?.images?.[0]?.url || '',
    spotifyUrl: track.external_urls?.spotify || '',
    previewUrl: track.preview_url || '',
    durationMs: track.duration_ms || 0,
  };
}

export async function searchSpotifyTracks(query: string) {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: '8',
  });

  const response = await spotifyFetch<{ tracks?: { items?: SpotifyTrackApiResponse[] } }>(
    `/search?${params.toString()}`
  );
  if (!response) {
    return [];
  }
  const items = response.tracks?.items ?? [];
  return items.map((track) => mapTrack(track));
}

export async function getCurrentlyPlayingTrack() {
  const response = await spotifyFetch<{ item?: SpotifyTrackApiResponse }>('/me/player/currently-playing', true);
  if (!response) {
    return null;
  }
  if (!response.item) {
    return null;
  }
  return mapTrack(response.item);
}

export async function getSavedSpotifyTracks(limit = 50) {
  const params = new URLSearchParams({
    limit: String(Math.min(Math.max(limit, 1), 50)),
  });

  const response = await spotifyFetch<{ items?: SpotifySavedTrackResponse[] }>(
    `/me/tracks?${params.toString()}`
  );

  const items = response?.items ?? [];
  return items
    .map((item) => {
      if (!item.track) {
        return null;
      }
      return {
        ...mapTrack(item.track),
        addedAt: item.added_at || new Date().toISOString(),
      } as SpotifySavedTrackResult;
    })
    .filter((item): item is SpotifySavedTrackResult => item !== null);
}

export async function getRecentlyPlayedTracks(limit = 50) {
  const params = new URLSearchParams({
    limit: String(Math.min(Math.max(limit, 1), 50)),
  });

  const response = await spotifyFetch<{ items?: SpotifyRecentTrackResponse[] }>(
    `/me/player/recently-played?${params.toString()}`
  );

  const items = response?.items ?? [];
  return items
    .map((item) => {
      if (!item.track) {
        return null;
      }
      return {
        ...mapTrack(item.track),
        playedAt: item.played_at || new Date().toISOString(),
      } as SpotifyRecentTrackResult;
    })
    .filter((item): item is SpotifyRecentTrackResult => item !== null);
}

export function disconnectSpotify() {
  saveTokenPayload(null);
  localStorage.removeItem(VERIFIER_STORAGE_KEY);
}

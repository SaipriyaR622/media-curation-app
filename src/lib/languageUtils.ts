// ---------------------------------------------------------------------------
// Script detection
// ---------------------------------------------------------------------------

export function isLatinScript(text: string): boolean {
  const nonLatin = text.match(/[^\u0000-\u024F\u1E00-\u1EFF\s\p{P}\p{N}]/gu);
  const total = text.replace(/\s/g, '').length;
  if (total === 0) return true;
  return (nonLatin?.length ?? 0) / total < 0.1;
}

// ---------------------------------------------------------------------------
// Romanized marker lists
// ---------------------------------------------------------------------------

const MARKERS: Record<string, string[]> = {
  'hi-latn': [
    'hai', 'hain', 'mera', 'meri', 'mere', 'tera', 'teri', 'tere',
    'aur', 'nahi', 'nahin', 'kyun', 'kya', 'toh', 'bhi', 'koi',
    'pyar', 'dil', 'yaar', 'zindagi', 'duniya', 'dost', 'raat',
    'subah', 'aankhein', 'aankhe', 'aawaaz', 'baatein', 'chaiye',
    'chahiye', 'humsafar', 'mohabbat', 'ishq', 'woh', 'wahi',
    'tumhara', 'tumhari', 'apna', 'apni', 'khud', 'sath', 'saath',
    'mujhe', 'tujhe', 'hum', 'mai', 'main', 'hua', 'karo', 'karu',
    'karna', 'rehna', 'tha', 'thi', 'ho', 'kar', 'raha', 'rahi',
  ],
  'ur-latn': [
    'hai', 'hain', 'mera', 'teri', 'aur', 'nahi', 'kya', 'bhi',
    'dil', 'ishq', 'mohabbat', 'yaar', 'zindagi', 'raat', 'subah',
    'khuda', 'allah', 'jannat', 'duniya', 'waqt', 'dard', 'aansu',
    'mujhse', 'tujhse', 'humse', 'tumse', 'apne', 'unka', 'inhe',
  ],
  'ta-latn': [
    'naan', 'nee', 'avan', 'aval', 'enna', 'epdi', 'eppadi',
    'illai', 'iruken', 'vandha', 'sollu', 'paaru', 'vaazha',
    'kaadhal', 'manasu', 'kadhal', 'vazhi', 'vaazhkai',
    'unnai', 'unna', 'enakku', 'theriyum', 'therila', 'padam',
    'nalla', 'romba', 'konjam', 'inge', 'ange', 'oru',
    'ponu', 'poda', 'machan', 'thala', 'anna', 'akka',
  ],
  'te-latn': [
    'nenu', 'niku', 'meeru', 'mee', 'adi', 'idi', 'emi',
    'enta', 'ela', 'ekkada', 'enduku', 'anni', 'okka', 'ledu',
    'prema', 'manasu', 'kallu', 'cheyyi', 'vachi', 'vella',
    'cheppandi', 'chudandi', 'padandi', 'raandi', 'vellaandi',
  ],
  'kn-latn': [
    'nanu', 'neevu', 'avanu', 'avalu', 'enu', 'hege', 'elli',
    'yaake', 'ella', 'illa', 'beku', 'beda', 'madu', 'helu',
    'prema', 'manasu', 'kannada', 'bengaluru', 'hrudaya', 'ninna',
  ],
  'ml-latn': [
    'njan', 'njangal', 'nee', 'ningal', 'avan', 'aval', 'enthu',
    'etha', 'eppo', 'evidey', 'ille', 'varu', 'poyi',
    'pranayam', 'manassu', 'kanneer', 'swapnam', 'hrudayam',
    'malare', 'azhake', 'neram', 'kaalam', 'manathaaril',
    'ennuyiril', 'athil', 'ninte', 'njante', 'pole',
    'oru', 'oro', 'naal', 'kanavil', 'raagam',
  ],
  'bn-latn': [
    'ami', 'tumi', 'se', 'amar', 'tomar', 'tar', 'amader',
    'ki', 'keno', 'kothay', 'kobe', 'ache', 'nei', 'hobe',
    'bhalo', 'basha', 'mon', 'hridoy', 'akash', 'nodi', 'phul',
    'bolo', 'dekho', 'jao', 'esho', 'thako', 'jani', 'chao',
  ],
  'pa-latn': [
    'main', 'tu', 'tenu', 'menu', 'assi', 'tussi', 'oh',
    'ki', 'kyon', 'kithe', 'kadон', 'hai', 'nahin', 'hona',
    'pyar', 'dil', 'yaari', 'ishq', 'rabb', 'waheguru',
    'sohna', 'sohni', 'yaar', 'dost', 'pind', 'shaher',
  ],
  'ar-latn': [
    'ana', 'anta', 'anti', 'huwa', 'hiya', 'nahnu', 'antum',
    'laa', 'lan', 'laysa', 'illa', 'ala', 'inda', 'maa', 'min',
    'kuntu', 'kana', 'yakun', 'akun', 'habibi', 'habibti',
    'yalla', 'wallah', 'inshallah', 'mashallah', 'alhamdulillah',
    'qalbi', 'rohi', 'aini', 'baad', 'zain', 'tamam',
    'leila', 'hayati', 'omri', 'albi', 'khalas', 'yani',
  ],
  'fa-latn': [
    'man', 'to', 'ma', 'shoma', 'oo', 'anha', 'che', 'chera',
    'koja', 'key', 'hast', 'nist', 'miram', 'miri', 'mikonam',
    'del', 'eshgh', 'doost', 'zendegi', 'shab', 'rooz', 'aseman',
    'joon', 'azizam', 'dooset', 'daram', 'mikhaam', 'nemidoonam',
  ],
  'he-latn': [
    'ani', 'ata', 'at', 'hu', 'hi', 'anachnu', 'atem', 'hen',
    'ma', 'eifo', 'matai', 'lama', 'ken', 'lo', 'yesh', 'ein',
    'ahava', 'lev', 'neshama', 'eynayim', 'layla', 'boker',
    'sheli', 'shelcha', 'shelach', 'od', 'kvar', 'rak', 'gam',
  ],
  'ko-latn': [
    'naneun', 'naega', 'neo', 'neoneun', 'nega', 'uri', 'uriga',
    'sarang', 'saranghae', 'saranghaeyo', 'mianhae', 'gomawo',
    'annyeong', 'oppa', 'unni', 'noona', 'hyung', 'aish',
    'daebak', 'jinjja', 'wae', 'eotteoke', 'molla', 'algo',
    'neomu', 'jeongmal', 'hana', 'dul', 'set', 'isseo', 'eopseo',
  ],
  'ja-latn': [
    'watashi', 'boku', 'ore', 'anata', 'kimi', 'kare', 'kanojo',
    'suki', 'daisuki', 'aishiteru', 'kawaii', 'sugoi', 'nani',
    'naze', 'doushite', 'aru', 'iru', 'nai', 'desu', 'masu',
    'dayo', 'dane', 'kara', 'made', 'demo', 'dakedo', 'mata',
    'ima', 'mukashi', 'hoshi', 'tsuki', 'hana', 'kaze', 'umi',
    'kokoro', 'yume', 'hikari', 'yoru', 'asa', 'michi',
  ],
  'zh-latn': [
    'wo', 'ni', 'ta', 'women', 'nimen', 'tamen', 'hen', 'feichang',
    'zhege', 'nage', 'shi', 'bushi', 'you', 'meiyou', 'keyi',
    'xin', 'hun', 'tian', 'hai', 'shan', 'feng', 'yue',
    'mama', 'baba', 'pengyou', 'xiexie', 'zaijian', 'zhidao',
    'yiqi', 'yige', 'zai', 'xihuan', 'ai', 'tingshuo',
  ],
  'ru-latn': [
    'ya', 'ty', 'on', 'ona', 'my', 'vy', 'oni',
    'lyubov', 'lyublyu', 'privet', 'poka', 'spasibo', 'pozhaluysta',
    'net', 'nichego', 'vsyo', 'kogda', 'gde', 'kak',
    'znayu', 'hochu', 'mogu', 'budu', 'bylo',
    'serdtse', 'dusha', 'nebo', 'zvezda', 'noch', 'den', 'zhizn',
    'moy', 'moya', 'tvoy', 'tvoya', 'nash', 'nasha',
  ],
  'el-latn': [
    'ego', 'esy', 'aftos', 'afti', 'emeis', 'eseis',
    'agapi', 'agapo', 'kalimera', 'kalispera', 'efharisto',
    'parakalo', 'nai', 'ohi', 'pou', 'pote', 'giati', 'pos',
    'einai', 'eimai', 'exo', 'thelo', 'mporo', 'ksero',
    'kardia', 'psychi', 'mati', 'fos', 'nyhta', 'mera', 'zoi',
  ],
  'tr-latn': [
    'ben', 'sen', 'biz', 'siz', 'onlar', 'benim', 'senin',
    'evet', 'hayir', 'neden', 'nerede', 'nasil', 'ne', 'kim',
    'seni', 'sana', 'bana', 'beni', 'seviyorum', 'askim',
    'kalbim', 'gozlerin', 'geceler', 'sabah', 'hayat', 'ask',
    'gelmez', 'bilmem', 'olmaz', 'gidiyorum', 'geliyorum',
  ],
  'vi-latn': [
    'toi', 'ban', 'anh', 'chi', 'em', 'chung', 'ho',
    'khong', 'co', 'va', 'hay', 'nhung', 'cua', 'trong',
    'yeu', 'tim', 'nho', 'mong', 'uoc', 'buon', 'vui',
    'dep', 'thuong', 'doi', 'nguoi', 'que', 'huong',
  ],
  'th-latn': [
    'chan', 'phom', 'khun', 'kao', 'rao', 'mai', 'chai',
    'pen', 'mee', 'tham', 'pai', 'ma', 'di', 'rak',
    'jai', 'khwam', 'fan', 'wan', 'khuen', 'dao', 'fah',
    'sanuk', 'suay', 'aroi', 'sabai', 'krub', 'ka',
  ],
  'id-latn': [
    'aku', 'kamu', 'dia', 'kita', 'mereka', 'saya', 'anda',
    'tidak', 'ya', 'dan', 'atau', 'dengan', 'untuk', 'dari',
    'cinta', 'hati', 'rindu', 'sayang', 'mimpi', 'harap',
    'pergi', 'datang', 'tahu', 'mau', 'bisa', 'sudah', 'akan',
  ],
  'ms-latn': [
    'saya', 'aku', 'awak', 'kamu', 'dia', 'kita', 'mereka',
    'tidak', 'ya', 'dan', 'atau', 'dengan', 'untuk', 'dari',
    'cinta', 'hati', 'rindu', 'sayang', 'mimpi', 'harap',
    'pergi', 'datang', 'tahu', 'mahu', 'boleh', 'sudah', 'akan',
  ],
  'sw-latn': [
    'mimi', 'wewe', 'yeye', 'sisi', 'nyinyi', 'wao',
    'ndiyo', 'hapana', 'na', 'au', 'lakini', 'kwa', 'ya',
    'upendo', 'moyo', 'maisha', 'ndoto', 'tumaini', 'furaha',
    'kwenda', 'kuja', 'kujua', 'kutaka', 'naweza', 'tayari',
  ],
  'am-latn': [
    'ene', 'ante', 'anchi', 'issu', 'issua', 'enna', 'ennante',
    'awo', 'aydelem', 'ena', 'inde', 'betam', 'tinish',
    'fikir', 'lij', 'set', 'wend', 'hiwot', 'tsehay', 'lelit',
  ],
  'uz-latn': [
    'men', 'sen', 'u', 'biz', 'siz', 'ular', 'mening', 'sening',
    'ha', 'yoq', 'va', 'lekin', 'uchun', 'bilan', 'dan',
    'sevgi', 'yurak', 'orzum', 'baxt', 'hayot', 'tun', 'kun',
  ],
  'az-latn': [
    'men', 'sen', 'o', 'biz', 'siz', 'onlar', 'mənim', 'sənin',
    'bəli', 'xeyr', 'və', 'amma', 'üçün', 'ilə', 'dan',
    'sevgi', 'ürək', 'arzu', 'xoşbəxt', 'həyat', 'gecə', 'gün',
  ],
  'fr-latn': [
    'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
    'mon', 'ton', 'son', 'notre', 'votre', 'leur',
    'amour', 'coeur', 'vie', 'nuit', 'jour', 'reve', 'espoir',
    'veux', 'peux', 'suis', 'est', 'sont', 'avoir', 'faire',
    'cherie', 'courir', 'partir', 'mourir', 'venir',
    'maintenant', 'temps', 'laisse', 'ecoute', 'dirai',
    'jamais', 'juste', 'tais', 'parle', 'regarde', 'pense', 'sentir',
  ],
  'es-latn': [
    'yo', 'tu', 'el', 'ella', 'nosotros', 'vosotros', 'ellos',
    'mi', 'tu', 'su', 'nuestro', 'vuestro',
    'amor', 'corazon', 'vida', 'noche', 'dia', 'sueno', 'alma',
    'quiero', 'puedo', 'soy', 'eres', 'estoy', 'tengo', 'voy',
  ],
  'pt-latn': [
    'eu', 'voce', 'ele', 'ela', 'nos', 'eles', 'elas',
    'meu', 'teu', 'seu', 'nosso',
    'amor', 'coracao', 'vida', 'noite', 'dia', 'sonho', 'alma',
    'quero', 'posso', 'sou', 'esta', 'tenho', 'vou', 'sei',
  ],
  'it-latn': [
    'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro',
    'mio', 'tuo', 'suo', 'nostro',
    'amore', 'cuore', 'vita', 'notte', 'giorno', 'sogno', 'anima',
    'voglio', 'posso', 'sono', 'siamo', 'ho', 'vado', 'so',
  ],
  'de-latn': [
    'ich', 'du', 'er', 'sie', 'wir', 'ihr',
    'mein', 'dein', 'sein', 'unser',
    'liebe', 'herz', 'leben', 'nacht', 'tag', 'traum', 'seele',
    'will', 'kann', 'bin', 'ist', 'sind', 'habe', 'gehe', 'weiss',
  ],
  'nl-latn': [
    'ik', 'jij', 'hij', 'zij', 'wij', 'jullie',
    'mijn', 'jouw', 'zijn', 'ons',
    'liefde', 'hart', 'leven', 'nacht', 'dag', 'droom', 'ziel',
    'wil', 'kan', 'ben', 'is', 'zijn', 'heb', 'ga', 'weet',
  ],
  'sv-latn': [
    'jag', 'du', 'han', 'hon', 'vi', 'ni', 'de',
    'min', 'din', 'sin', 'var',
    'karlek', 'hjarta', 'liv', 'natt', 'dag', 'drom', 'sjal',
    'vill', 'kan', 'ar', 'har', 'gar', 'vet', 'ser',
  ],
  'pl-latn': [
    'ja', 'ty', 'on', 'ona', 'my', 'wy', 'oni',
    'moj', 'twoj', 'jego', 'nasz',
    'milosc', 'serce', 'zycie', 'noc', 'dzien', 'marzenie', 'dusza',
    'chce', 'moge', 'jestem', 'jest', 'mam', 'ide', 'wiem',
  ],
};

// ---------------------------------------------------------------------------
// Language type
// ---------------------------------------------------------------------------

export type DetectedLanguage =
  | 'en'
  // South Asian
  | 'hi' | 'hi-latn'
  | 'ur' | 'ur-latn'
  | 'ta' | 'ta-latn'
  | 'te' | 'te-latn'
  | 'kn' | 'kn-latn'
  | 'ml' | 'ml-latn'
  | 'bn' | 'bn-latn'
  | 'pa' | 'pa-latn'
  // East Asian
  | 'ko' | 'ko-latn'
  | 'ja' | 'ja-latn'
  | 'zh' | 'zh-latn'
  // Southeast Asian
  | 'vi' | 'vi-latn'
  | 'th' | 'th-latn'
  | 'id' | 'id-latn'
  | 'ms' | 'ms-latn'
  // Middle Eastern
  | 'ar' | 'ar-latn'
  | 'fa' | 'fa-latn'
  | 'he' | 'he-latn'
  // European
  | 'ru' | 'ru-latn'
  | 'el' | 'el-latn'
  | 'fr' | 'fr-latn'
  | 'es' | 'es-latn'
  | 'pt' | 'pt-latn'
  | 'it' | 'it-latn'
  | 'de' | 'de-latn'
  | 'nl' | 'nl-latn'
  | 'sv' | 'sv-latn'
  | 'pl' | 'pl-latn'
  | 'tr' | 'tr-latn'
  // African
  | 'sw' | 'sw-latn'
  | 'am' | 'am-latn'
  // Central Asian
  | 'uz' | 'uz-latn'
  | 'az' | 'az-latn';

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export function detectLanguage(text: string): DetectedLanguage {
  // Native script checks
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u3040-\u30FF]/.test(text)) return 'ja';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
  if (/[\u0400-\u04FF]/.test(text)) return 'ru';
  if (/[\u0370-\u03FF]/.test(text)) return 'el';
  if (/[\u0590-\u05FF]/.test(text)) return 'he';
  if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
  if (/[\u1200-\u137F]/.test(text)) return 'am';

  // Romanized detection — score all and pick highest above threshold
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  const thresholds: Record<string, number> = {
    'hi-latn': 3, 'ur-latn': 3,
    'ta-latn': 2, 'te-latn': 2, 'kn-latn': 2, 'ml-latn': 2,
    'bn-latn': 2, 'pa-latn': 2,
    'ar-latn': 2, 'fa-latn': 2, 'he-latn': 2,
    'ko-latn': 2, 'ja-latn': 2, 'zh-latn': 3,
    'vi-latn': 2, 'th-latn': 2, 'id-latn': 3, 'ms-latn': 3,
    'ru-latn': 2, 'el-latn': 2,
    'tr-latn': 2, 'sw-latn': 2, 'am-latn': 2,
    'uz-latn': 2, 'az-latn': 2,
    // European languages need higher thresholds since many words overlap with English
    'fr-latn': 3, 'es-latn': 4, 'pt-latn': 4,
    'it-latn': 4, 'de-latn': 4, 'nl-latn': 4,
    'sv-latn': 4, 'pl-latn': 3,
  };

  let best: DetectedLanguage = 'en';
  let bestScore = 0;

  for (const [lang, markers] of Object.entries(MARKERS)) {
    const score = markers.filter((m) => words.includes(m)).length;
    const threshold = thresholds[lang] ?? 2;
    if (score >= threshold && score > bestScore) {
      best = lang as DetectedLanguage;
      bestScore = score;
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export function detectScriptLabel(language: DetectedLanguage): string {
  const map: Record<DetectedLanguage, string> = {
    en: '',
    hi: 'Hindi', 'hi-latn': 'Hindi (Romanized)',
    ur: 'Urdu', 'ur-latn': 'Urdu (Romanized)',
    ta: 'Tamil', 'ta-latn': 'Tamil (Romanized)',
    te: 'Telugu', 'te-latn': 'Telugu (Romanized)',
    kn: 'Kannada', 'kn-latn': 'Kannada (Romanized)',
    ml: 'Malayalam', 'ml-latn': 'Malayalam (Romanized)',
    bn: 'Bengali', 'bn-latn': 'Bengali (Romanized)',
    pa: 'Punjabi', 'pa-latn': 'Punjabi (Romanized)',
    ko: 'Korean', 'ko-latn': 'Korean (Romanized)',
    ja: 'Japanese', 'ja-latn': 'Japanese (Romanized)',
    zh: 'Chinese', 'zh-latn': 'Chinese (Romanized)',
    vi: 'Vietnamese', 'vi-latn': 'Vietnamese (Romanized)',
    th: 'Thai', 'th-latn': 'Thai (Romanized)',
    id: 'Indonesian', 'id-latn': 'Indonesian (Romanized)',
    ms: 'Malay', 'ms-latn': 'Malay (Romanized)',
    ar: 'Arabic', 'ar-latn': 'Arabic (Romanized)',
    fa: 'Persian', 'fa-latn': 'Persian (Romanized)',
    he: 'Hebrew', 'he-latn': 'Hebrew (Romanized)',
    ru: 'Russian', 'ru-latn': 'Russian (Romanized)',
    el: 'Greek', 'el-latn': 'Greek (Romanized)',
    fr: 'French', 'fr-latn': 'French (Romanized)',
    es: 'Spanish', 'es-latn': 'Spanish (Romanized)',
    pt: 'Portuguese', 'pt-latn': 'Portuguese (Romanized)',
    it: 'Italian', 'it-latn': 'Italian (Romanized)',
    de: 'German', 'de-latn': 'German (Romanized)',
    nl: 'Dutch', 'nl-latn': 'Dutch (Romanized)',
    sv: 'Swedish', 'sv-latn': 'Swedish (Romanized)',
    pl: 'Polish', 'pl-latn': 'Polish (Romanized)',
    tr: 'Turkish', 'tr-latn': 'Turkish (Romanized)',
    sw: 'Swahili', 'sw-latn': 'Swahili (Romanized)',
    am: 'Amharic', 'am-latn': 'Amharic (Romanized)',
    uz: 'Uzbek', 'uz-latn': 'Uzbek (Romanized)',
    az: 'Azerbaijani', 'az-latn': 'Azerbaijani (Romanized)',
  };
  return map[language] ?? '';
}

// Non-Latin scripts need romanization
export function needsTranscription(language: DetectedLanguage): boolean {
  const nonLatin = ['hi','ur','ta','te','kn','ml','bn','pa','ko','ja','zh','ar','fa','he','ru','el','th','am'];
  return nonLatin.includes(language);
}

export function needsTranslation(language: DetectedLanguage): boolean {
  return language !== 'en';
}

// ---------------------------------------------------------------------------
// Translation via /api/translate (Azure, server-side)
// ---------------------------------------------------------------------------

async function callTranslateApi(lines: string[], language: DetectedLanguage): Promise<string[]> {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines, language }),
    });
    if (!res.ok) return lines;
    const data = (await res.json()) as { translations?: string[] };
    if (!Array.isArray(data.translations) || data.translations.length !== lines.length) return lines;
    return data.translations;
  } catch {
    return lines;
  }
}

export async function romanizeLines(
  lines: string[],
  language: DetectedLanguage,
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  if (!needsTranscription(language)) {
    onProgress?.(lines.length, lines.length);
    return lines;
  }
  const BATCH = 10;
  const results: string[] = [];
  for (let i = 0; i < lines.length; i += BATCH) {
    const chunk = lines.slice(i, i + BATCH);
    const translated = await callTranslateApi(chunk, language);
    results.push(...translated);
    onProgress?.(Math.min(i + BATCH, lines.length), lines.length);
    if (i + BATCH < lines.length) await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}

export async function translateLines(
  lines: string[],
  language: DetectedLanguage,
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  if (!needsTranslation(language)) {
    onProgress?.(lines.length, lines.length);
    return lines;
  }
  const BATCH = 10;
  const results: string[] = [];
  for (let i = 0; i < lines.length; i += BATCH) {
    const slice = lines.slice(i, i + BATCH);
    const nonEmpty = slice.filter((l) => l.trim());
    if (nonEmpty.length === 0) {
      results.push(...slice.map(() => ''));
      onProgress?.(Math.min(i + BATCH, lines.length), lines.length);
      continue;
    }
    const translated = await callTranslateApi(nonEmpty, language);
    let tIdx = 0;
    for (const line of slice) {
      results.push(line.trim() ? (translated[tIdx++] ?? line) : '');
    }
    onProgress?.(Math.min(i + BATCH, lines.length), lines.length);
    if (i + BATCH < lines.length) await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}

// ---------------------------------------------------------------------------
// Quiz generation
// ---------------------------------------------------------------------------

export interface MultipleChoiceQuestion {
  type: 'multiple-choice';
  lineIndex: number;
  originalLine: string;
  translatedLine: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface WordMatchQuestion {
  type: 'word-match';
  pairs: Array<{ original: string; translated: string }>;
}

export type QuizQuestion = MultipleChoiceQuestion | WordMatchQuestion;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickNonEmpty(lines: string[], count: number): number[] {
  const indices = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.trim().length > 5)
    .map(({ i }) => i);
  return shuffle(indices).slice(0, count);
}

export function generateQuiz(
  originalLines: string[],
  translatedLines: string[]
): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const totalLines = Math.min(originalLines.length, translatedLines.length);
  if (totalLines < 4) return [];

  const mcIndices = pickNonEmpty(originalLines, 5);
  for (const idx of mcIndices) {
    const correct = translatedLines[idx];
    if (!correct?.trim() || correct.trim() === originalLines[idx].trim()) continue;
    const distractorPool = translatedLines.filter(
      (l, i) => i !== idx && l.trim().length > 5 && l.trim() !== originalLines[i]?.trim()
    );
    const distractors = shuffle(distractorPool).slice(0, 3);
    if (distractors.length < 3) continue;
    const options = shuffle([...distractors, correct]);
    questions.push({
      type: 'multiple-choice',
      lineIndex: idx,
      originalLine: originalLines[idx],
      translatedLine: correct,
      question: 'What does this line mean?',
      options,
      correctIndex: options.indexOf(correct),
    });
  }

  const matchIndices = pickNonEmpty(originalLines, 6);
  const pairs: Array<{ original: string; translated: string }> = [];
  for (const idx of matchIndices) {
    const orig = originalLines[idx]?.trim();
    const trans = translatedLines[idx]?.trim();
    if (!orig || !trans || orig.toLowerCase() === trans.toLowerCase()) continue;
    pairs.push({
      original: orig.length > 40 ? orig.slice(0, 38) + '…' : orig,
      translated: trans.length > 40 ? trans.slice(0, 38) + '…' : trans,
    });
    if (pairs.length >= 4) break;
  }
  if (pairs.length >= 3) questions.push({ type: 'word-match', pairs });

  return questions;
}
/**
 * FanTwin World-Quest 多言語設定 v2.0
 * 90日プラン: 10言語即時返信対応
 */

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  zh: '中文 (简体)',
  'zh-TW': '中文 (繁體)',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  it: 'Italiano',
  ru: 'Русский'
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

export const DEFAULT_LANGUAGE: SupportedLanguage = 'ja';

export const i18nConfig = {
  defaultLanguage: DEFAULT_LANGUAGE,
  supportedLanguages: Object.keys(SUPPORTED_LANGUAGES) as SupportedLanguage[],
  // LoRA Fine-tuning対応言語マップ
  loraModels: {
    en: 'fantwin-en-v1',
    ja: 'fantwin-ja-v1',
    ko: 'fantwin-ko-v1',
    zh: 'fantwin-zh-v1',
    'zh-TW': 'fantwin-zh-tw-v1',
    es: 'fantwin-es-v1',
    fr: 'fantwin-fr-v1',
    de: 'fantwin-de-v1',
    pt: 'fantwin-pt-v1',
    it: 'fantwin-it-v1',
    ru: 'fantwin-ru-v1'
  },
  // MVP目標: BLEU > 0.65 → β: BLEU > 0.75
  qualityThresholds: {
    bleuScore: 0.65,
    latencyMs: 1200 // < 1.2s
  }
};

/**
 * ブラウザ言語から対応言語を検出
 */
export function detectLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  
  const browserLang = navigator.language.toLowerCase();
  
  // 完全一致
  if (browserLang in SUPPORTED_LANGUAGES) {
    return browserLang as SupportedLanguage;
  }
  
  // 言語コードのみ一致 (ja-JP → ja)
  const langCode = browserLang.split('-')[0];
  if (langCode in SUPPORTED_LANGUAGES) {
    return langCode as SupportedLanguage;
  }
  
  // 中国語特殊処理
  if (browserLang.includes('zh')) {
    if (browserLang.includes('tw') || browserLang.includes('hk') || browserLang.includes('mo')) {
      return 'zh-TW';
    }
    return 'zh';
  }
  
  return DEFAULT_LANGUAGE;
}

/**
 * 言語別DM生成プロンプト設定
 */
export const LANGUAGE_PROMPTS = {
  en: {
    system: "You are FanTwin AI, helping creators respond to DMs professionally and warmly.",
    userPrefix: "Please reply to this DM in English:",
    style: "friendly and professional"
  },
  ja: {
    system: "あなたはFanTwin AIです。クリエイターのDM返信を丁寧で温かみのある日本語でサポートします。",
    userPrefix: "この投稿に日本語で返信してください:",
    style: "丁寧で親しみやすい"
  },
  ko: {
    system: "당신은 FanTwin AI입니다. 크리에이터의 DM 응답을 정중하고 따뜻하게 한국어로 지원합니다.",
    userPrefix: "이 DM에 한국어로 답장해주세요:",
    style: "정중하고 친근한"
  },
  zh: {
    system: "您是FanTwin AI，帮助创作者专业、温暖地用简体中文回复私信。",
    userPrefix: "请用简体中文回复这条私信:",
    style: "专业且友好"
  },
  'zh-TW': {
    system: "您是FanTwin AI，幫助創作者專業、溫暖地用繁體中文回覆私訊。",
    userPrefix: "請用繁體中文回覆這條私訊:",
    style: "專業且友好"
  },
  es: {
    system: "Eres FanTwin AI, ayudas a los creadores a responder DMs de manera profesional y cálida en español.",
    userPrefix: "Por favor responde a este DM en español:",
    style: "amigable y profesional"
  },
  fr: {
    system: "Vous êtes FanTwin AI, vous aidez les créateurs à répondre aux DMs de manière professionnelle et chaleureuse en français.",
    userPrefix: "Veuillez répondre à ce DM en français:",
    style: "amical et professionnel"
  },
  de: {
    system: "Sie sind FanTwin AI und helfen Kreativen dabei, DMs professionell und herzlich auf Deutsch zu beantworten.",
    userPrefix: "Bitte antworten Sie auf diese DM auf Deutsch:",
    style: "freundlich und professionell"
  },
  pt: {
    system: "Você é o FanTwin AI, ajudando criadores a responder DMs de forma profissional e calorosa em português.",
    userPrefix: "Por favor, responda a esta DM em português:",
    style: "amigável e profissional"
  },
  it: {
    system: "Sei FanTwin AI, aiuti i creator a rispondere ai DM in modo professionale e caloroso in italiano.",
    userPrefix: "Si prega di rispondere a questo DM in italiano:",
    style: "amichevole e professionale"
  },
  ru: {
    system: "Вы FanTwin AI, помогаете создателям контента отвечать на личные сообщения профессионально и тепло на русском языке.",
    userPrefix: "Пожалуйста, ответьте на это личное сообщение на русском языке:",
    style: "дружелюбный и профессиональный"
  }
} as const; 
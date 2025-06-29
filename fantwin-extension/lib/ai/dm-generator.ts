// DM自動生成ライブラリ for FanTwin Chrome Extension
// @mvp_checklist.md: Hello-World DM → 120文字以上 → 送信ボタン1クリック
// @mvp_checklist.md p50 Latency < 0.5s: 返信生成速度最優先
// @implementation_plan.md W1: p50 Latency < 0.6s チューニング

import OpenAI from 'openai';

export interface DMGenerationOptions {
  fanName?: string;
  creatorName?: string;
  platform: 'twitter' | 'instagram' | 'tiktok';
  tone: 'friendly' | 'professional' | 'casual' | 'enthusiastic';
  language: 'ja' | 'en' | 'auto';
  minLength: number;
  maxLength: number;
}

export interface DMResult {
  message: string;
  length: number;
  tone: string;
  estimatedSentiment: 'positive' | 'neutral' | 'professional';
  generatedAt: string;
}

interface DMRequest {
  targetUser: string;
  context?: string;
  tone?: 'friendly' | 'professional' | 'casual';
  language?: 'ja' | 'en';
  maxLength?: number;
}

interface DMResponse {
  message: string;
  length: number;
  sentiment: 'positive' | 'neutral' | 'professional';
  generationTimeMs: number;
  cached: boolean;
  model: string;
}

interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  average: number;
  count: number;
  lastUpdated: number;
}

// OpenAI クライアントクラス
export class DMGenerator {
  private openai: OpenAI | null = null;
  private modelConfig: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  private cache = new Map<string, { response: DMResponse; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分キャッシュ
  private readonly TARGET_LATENCY = 500; // 0.5秒目標
  private latencyHistory: number[] = [];
  private readonly MAX_HISTORY = 1000;

  constructor(apiKey?: string) {
    // @mvp_checklist.md: Cost Guardrail - min(MRR×0.25, USD 150)対応
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || 'placeholder-key',
      dangerouslyAllowBrowser: true // Chrome extension用
    });

    // Week-1はGPT-4o-mini使用（Free プラン用）
    this.modelConfig = {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 150
    };
  }

  // Hello-World DM生成（D1 Activation用）
  async generateHelloWorldDM(options: Partial<DMGenerationOptions> = {}): Promise<DMResult> {
    const config: DMGenerationOptions = {
      platform: 'twitter',
      tone: 'friendly',
      language: 'ja',
      minLength: 120,
      maxLength: 280,
      creatorName: 'あなた',
      ...options
    };

    try {
      const prompt = this.buildHelloWorldPrompt(config);
      console.log('🤖 Generating Hello-World DM with OpenAI...');

      const response = await this.openai.chat.completions.create({
        model: this.modelConfig.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(config)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.modelConfig.temperature,
        max_tokens: this.modelConfig.maxTokens
      });

      const generatedMessage = response.choices[0]?.message?.content?.trim() || '';
      
      if (generatedMessage.length < config.minLength) {
        console.warn(`⚠️ Generated message too short: ${generatedMessage.length} chars`);
        return this.generateFallbackDM(config);
      }

      const result: DMResult = {
        message: generatedMessage,
        length: generatedMessage.length,
        tone: config.tone,
        estimatedSentiment: this.analyzeSentiment(generatedMessage),
        generatedAt: new Date().toISOString()
      };

      console.log('✅ Hello-World DM generated successfully:', result.length, 'chars');
      return result;

    } catch (error) {
      console.error('❌ DM generation failed:', error);
      return this.generateFallbackDM(config);
    }
  }

  // パーソナライズDM生成（Trial/Pro プラン用）
  async generatePersonalizedDM(
    fanContext: string,
    options: Partial<DMGenerationOptions> = {}
  ): Promise<DMResult> {
    const config: DMGenerationOptions = {
      platform: 'twitter',
      tone: 'friendly',
      language: 'ja',
      minLength: 120,
      maxLength: 280,
      ...options
    };

    try {
      const prompt = this.buildPersonalizedPrompt(fanContext, config);
      
      const response = await this.openai.chat.completions.create({
        model: this.modelConfig.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(config)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.modelConfig.temperature,
        max_tokens: this.modelConfig.maxTokens
      });

      const generatedMessage = response.choices[0]?.message?.content?.trim() || '';
      
      const result: DMResult = {
        message: generatedMessage,
        length: generatedMessage.length,
        tone: config.tone,
        estimatedSentiment: this.analyzeSentiment(generatedMessage),
        generatedAt: new Date().toISOString()
      };

      return result;

    } catch (error) {
      console.error('❌ Personalized DM generation failed:', error);
      return this.generateFallbackDM(config);
    }
  }

  // システムプロンプト構築
  private getSystemPrompt(config: DMGenerationOptions): string {
    const basePrompt = `あなたは、クリエイターとファンの関係を深める、親しみやすくて誠実なDMライターです。

重要なガイドライン：
1. 【文字数】: ${config.minLength}文字以上${config.maxLength}文字以内で書く
2. 【トーン】: ${config.tone === 'friendly' ? '親しみやすく自然な' : config.tone === 'professional' ? 'プロフェッショナルで丁寧な' : 'カジュアルで親近感のある'}口調
3. 【目的】: ファンとの関係構築とエンゲージメント向上
4. 【禁止事項】: 
   - 商品の直接的な宣伝
   - 個人情報の要求
   - 過度に馴れ馴れしい表現
   - スパムっぽい内容

5. 【必須要素】:
   - 感謝の気持ち
   - 今後の関係への期待
   - 自然な返信を促す要素`;

    if (config.platform === 'twitter') {
      return basePrompt + '\n6. 【Twitter特化】: ハッシュタグは控えめに、リプライしやすい内容に';
    }

    return basePrompt;
  }

  // Hello-World用プロンプト構築
  private buildHelloWorldPrompt(config: DMGenerationOptions): string {
    return `${config.creatorName}として、新しいファンに送る最初のDMメッセージを作成してください。

シチュエーション：
- 相手は最近フォローしてくれた新しいファン
- まだ直接やりとりしたことはない
- あなたの活動に興味を持ってくれている

生成してください：親しみやすく、感謝の気持ちが伝わる初回DM
${config.minLength}文字以上${config.maxLength}文字以内で、返信したくなるような内容にしてください。`;
  }

  // パーソナライズ用プロンプト構築
  private buildPersonalizedPrompt(fanContext: string, config: DMGenerationOptions): string {
    return `以下のファン情報を踏まえて、${config.creatorName}として個人的なDMを作成してください。

ファン情報：
${fanContext}

要件：
- 上記の情報を自然に織り交ぜる
- 個人的な関心や共通点を見つけて言及
- ${config.minLength}文字以上${config.maxLength}文字以内
- 返信しやすい質問や話題を含める`;
  }

  // 感情分析（簡易版）
  private analyzeSentiment(message: string): 'positive' | 'neutral' | 'professional' {
    const positiveWords = ['ありがとう', '嬉しい', '楽しい', '素敵', '素晴らしい', '感謝', '応援'];
    const professionalWords = ['よろしく', 'お疲れ様', 'ご確認', 'お時間', 'ご質問'];

    const positiveCount = positiveWords.filter(word => message.includes(word)).length;
    const professionalCount = professionalWords.filter(word => message.includes(word)).length;

    if (positiveCount > professionalCount) return 'positive';
    if (professionalCount > 0) return 'professional';
    return 'neutral';
  }

  // フォールバックDM生成（API失敗時）
  private generateFallbackDM(config: DMGenerationOptions): DMResult {
    const fallbackMessages = [
      `フォローしていただき、ありがとうございます！${config.creatorName}です。いつも投稿を見てくださって本当に嬉しいです。これからも楽しいコンテンツをお届けできるよう頑張りますので、ぜひ感想やご意見などもお聞かせください。今後ともよろしくお願いします！`,
      
      `${config.creatorName}です！新しくフォローしてくださって、本当にありがとうございます。あなたのような応援してくださる方がいるおかげで、毎日楽しく活動を続けることができています。もしよろしければ、普段どんなコンテンツがお好きか教えていただけると嬉しいです。これからもよろしくお願いします！`,
      
      `こんにちは！フォローありがとうございます。${config.creatorName}として活動している者です。あなたが私の投稿に興味を持ってくださったこと、とても光栄に思います。今後も皆さんに喜んでいただけるような内容を心がけていきますので、ぜひお気軽にコメントやメッセージをお送りください。お話しできるのを楽しみにしています！`
    ];

    const randomMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];

    return {
      message: randomMessage,
      length: randomMessage.length,
      tone: config.tone,
      estimatedSentiment: 'positive',
      generatedAt: new Date().toISOString()
    };
  }

  // モデル設定更新（Trial/Pro切り替え用）
  updateModelConfig(model: 'gpt-4o-mini' | 'gpt-4o', temperature: number = 0.7): void {
    this.modelConfig = {
      model,
      temperature,
      maxTokens: model === 'gpt-4o' ? 200 : 150
    };
    console.log(`🔄 Model updated to: ${model}`);
  }

  async initialize(apiKey: string): Promise<void> {
    try {
      this.openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
      console.log('✅ OpenAI client initialized for high-speed DM generation');
    } catch (error) {
      console.error('❌ OpenAI initialization failed:', error);
      throw error;
    }
  }

  // @mvp_checklist.md p50 < 0.5s: 高速DM生成
  async generateDM(request: DMRequest): Promise<DMResponse> {
    const startTime = Date.now();
    
    try {
      // キャッシュチェック（高速化）
      const cacheKey = this.generateCacheKey(request);
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        const latency = Date.now() - startTime;
        this.recordLatency(latency);
        
        return {
          ...cached,
          generationTimeMs: latency,
          cached: true
        };
      }

      if (!this.openai) {
        throw new Error('OpenAI not initialized');
      }

      // @mvp_checklist.md Cost Guardrail: 4o-mini使用
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.generateSystemPrompt(request)
          },
          {
            role: 'user',
            content: this.generateUserPrompt(request)
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
        top_p: 0.9,
        // レスポンス速度最適化
        stream: false,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const generatedMessage = response.choices[0]?.message?.content?.trim();
      
      if (!generatedMessage) {
        throw new Error('Empty response from OpenAI');
      }

      const dmResponse: DMResponse = {
        message: generatedMessage,
        length: generatedMessage.length,
        sentiment: this.analyzeSentiment(generatedMessage),
        generationTimeMs: Date.now() - startTime,
        cached: false,
        model: 'gpt-4o-mini'
      };

      // キャッシュに保存
      this.saveToCache(cacheKey, dmResponse);

      // レイテンシ記録
      this.recordLatency(dmResponse.generationTimeMs);

      // p50 > 0.6s の場合はSlack Alert
      const metrics = this.getLatencyMetrics();
      if (metrics.p50 > 600) {
        chrome.runtime.sendMessage({
          type: 'SEND_SLACK_ALERT',
          message: `🐌 High latency detected: p50=${metrics.p50.toFixed(0)}ms, p95=${metrics.p95.toFixed(0)}ms`,
          channel: '#performance-alerts'
        });
      }

      // GA4パフォーマンス送信
      chrome.runtime.sendMessage({
        type: 'SEND_GA4_EVENT',
        eventName: 'dm_generated',
        parameters: {
          generation_time_ms: dmResponse.generationTimeMs,
          message_length: dmResponse.length,
          sentiment: dmResponse.sentiment,
          cached: dmResponse.cached,
          target_met: dmResponse.generationTimeMs <= this.TARGET_LATENCY
        }
      });

      return dmResponse;

    } catch (error) {
      const errorLatency = Date.now() - startTime;
      console.error('❌ DM generation failed:', error);
      
      // フォールバック: 事前定義メッセージ
      const fallbackMessage = this.getFallbackMessage(request);
      
      chrome.runtime.sendMessage({
        type: 'SEND_GA4_EVENT',
        eventName: 'dm_generation_error',
        parameters: {
          error_message: error.message,
          fallback_used: true,
          error_latency_ms: errorLatency
        }
      });

      return {
        message: fallbackMessage,
        length: fallbackMessage.length,
        sentiment: 'neutral',
        generationTimeMs: errorLatency,
        cached: false,
        model: 'fallback'
      };
    }
  }

  // @mvp_checklist.md p50/p95監視
  getLatencyMetrics(): LatencyMetrics {
    if (this.latencyHistory.length === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        average: 0,
        count: 0,
        lastUpdated: Date.now()
      };
    }

    const sorted = [...this.latencyHistory].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      p50: sorted[Math.floor(count * 0.5)] || 0,
      p95: sorted[Math.floor(count * 0.95)] || 0,
      p99: sorted[Math.floor(count * 0.99)] || 0,
      average: sorted.reduce((sum, val) => sum + val, 0) / count,
      count,
      lastUpdated: Date.now()
    };
  }

  private recordLatency(latencyMs: number): void {
    this.latencyHistory.push(latencyMs);
    
    // 履歴サイズ制限
    if (this.latencyHistory.length > this.MAX_HISTORY) {
      this.latencyHistory = this.latencyHistory.slice(-this.MAX_HISTORY);
    }
  }

  private generateCacheKey(request: DMRequest): string {
    return btoa(JSON.stringify({
      targetUser: request.targetUser,
      tone: request.tone || 'friendly',
      language: request.language || 'ja'
    }));
  }

  private getFromCache(key: string): DMResponse | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.response;
  }

  private saveToCache(key: string, response: DMResponse): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });

    // キャッシュサイズ制限
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  private generateSystemPrompt(request: DMRequest): string {
    const language = request.language || 'ja';
    
    if (language === 'ja') {
      return `あなたはクリエイター向けのDM自動化アシスタントです。以下の要件でメッセージを生成してください：

要件：
- 120文字以上のメッセージ
- ${request.tone || 'friendly'}なトーン
- 自然で人間らしい表現
- 相手を尊重し、価値を提供する内容
- スパムや営業感を避ける
- 返信を促す質問や提案を含める

重要：速度優先で、簡潔かつ効果的なメッセージを生成してください。`;
    } else {
      return `You are a DM automation assistant for creators. Generate messages with these requirements:

Requirements:
- 120+ characters minimum
- ${request.tone || 'friendly'} tone
- Natural, human-like expression
- Respectful and value-providing content
- Avoid spam or overly sales-like language
- Include questions or suggestions that encourage replies

Important: Prioritize speed while creating concise and effective messages.`;
    }
  }

  private generateUserPrompt(request: DMRequest): string {
    const language = request.language || 'ja';
    
    if (language === 'ja') {
      return `ターゲットユーザー: ${request.targetUser}
${request.context ? `コンテキスト: ${request.context}` : ''}

このユーザーに送信する魅力的なDMを生成してください。`;
    } else {
      return `Target user: ${request.targetUser}
${request.context ? `Context: ${request.context}` : ''}

Generate an engaging DM for this user.`;
    }
  }

  private getFallbackMessage(request: DMRequest): string {
    const language = request.language || 'ja';
    
    const fallbacks = {
      ja: [
        `${request.targetUser}さん、お疲れ様です！あなたのコンテンツをいつも拝見させていただいており、とても勉強になっています。もしよろしければ、今度コラボレーションについてお話しできればと思います。お忙しい中恐縮ですが、ご検討いただけますでしょうか？`,
        `${request.targetUser}さん、こんにちは！あなたの最新の投稿を見て、すぐにコメントしたくなりました。素晴らしいクオリティですね！もしお時間があるときに、クリエイター同士の情報交換をさせていただければ嬉しいです。よろしくお願いします！`
      ],
      en: [
        `Hi ${request.targetUser}! I've been following your content and find it really inspiring. Would love to connect and potentially explore some collaboration opportunities. Let me know if you'd be interested in chatting!`,
        `Hello ${request.targetUser}! Your recent posts caught my attention - amazing work! I'd love to connect with fellow creators and exchange ideas. Hope to hear from you soon!`
      ]
    };

    const messages = fallbacks[language] || fallbacks.ja;
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // キャッシュクリア（デバッグ用）
  clearCache(): void {
    this.cache.clear();
    console.log('✅ DM generation cache cleared');
  }

  // レイテンシ履歴クリア（デバッグ用）
  clearLatencyHistory(): void {
    this.latencyHistory = [];
    console.log('✅ Latency history cleared');
  }
}

// Week-1用のDMジェネレーターインスタンス
export const dmGenerator = new DMGenerator();

// デモ用の簡易生成関数
export const generateQuickDM = async (fanName?: string): Promise<string> => {
  try {
    const result = await dmGenerator.generateHelloWorldDM({
      fanName,
      minLength: 120,
      maxLength: 200
    });
    return result.message;
  } catch (error) {
    console.error('Quick DM generation failed:', error);
    return 'フォローありがとうございます！お話しできて嬉しいです。これからもよろしくお願いします！';
  }
}; 
// @implementation_plan.md Week-4: 上位モデル実装
// GPT-4o-blend-fastpass + Trialユーザー限定 + トークン上限管理 + レスポンス速度計測

import OpenAI from 'openai';

export interface ModelConfig {
  model_name: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4o-blend-fastpass';
  display_name: string;
  user_tiers: ('free' | 'trial' | 'pro')[];
  max_tokens_per_request: number;
  max_tokens_per_day: number;
  temperature: number;
  cost_per_1k_tokens: number;
  estimated_speed_ms: number;
}

export interface ModelUsage {
  user_id: string;
  model_name: string;
  tokens_used: number;
  requests_count: number;
  total_cost_usd: number;
  daily_tokens_used: number;
  last_request_at: number;
  response_times_ms: number[];
  error_count: number;
}

export interface ModelPerformance {
  model_name: string;
  avg_response_time_ms: number;
  p50_response_time_ms: number;
  p75_response_time_ms: number;
  p95_response_time_ms: number;
  success_rate: number;
  total_requests: number;
  last_24h_requests: number;
  cost_efficiency_score: number; // レスポンス品質/コスト比
}

export interface FastPassRequest {
  request_id: string;
  user_tier: 'free' | 'trial' | 'pro';
  model_requested: string;
  prompt: string;
  max_tokens: number;
  temperature: number;
  priority: 'normal' | 'high' | 'urgent';
  created_at: number;
  estimated_tokens: number;
}

export interface FastPassResponse {
  request_id: string;
  success: boolean;
  model_used: string;
  response: string;
  tokens_used: number;
  response_time_ms: number;
  cost_usd: number;
  error?: string;
  completed_at: number;
}

// @mvp_checklist.md: Trial専用上位モデル設定
const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'gpt-4o-mini': {
    model_name: 'gpt-4o-mini',
    display_name: 'GPT-4o Mini (Free)',
    user_tiers: ['free', 'trial', 'pro'],
    max_tokens_per_request: 150,
    max_tokens_per_day: 30000, // Free: 30k tokens/day
    temperature: 0.7,
    cost_per_1k_tokens: 0.15,
    estimated_speed_ms: 2000
  },
  'gpt-4o': {
    model_name: 'gpt-4o',
    display_name: 'GPT-4o (Pro)',
    user_tiers: ['pro'],
    max_tokens_per_request: 300,
    max_tokens_per_day: 100000, // Pro: 100k tokens/day
    temperature: 0.7,
    cost_per_1k_tokens: 3.0,
    estimated_speed_ms: 1500
  },
  'gpt-4o-blend-fastpass': {
    model_name: 'gpt-4o-blend-fastpass',
    display_name: 'GPT-4o FastPass (Trial)',
    user_tiers: ['trial'], // Trial専用
    max_tokens_per_request: 300,
    max_tokens_per_day: 100000, // Trial: 100k tokens/day
    temperature: 0.6, // より一貫した出力
    cost_per_1k_tokens: 3.0,
    estimated_speed_ms: 800 // FastPass: 800ms以下目標
  }
};

const STORAGE_KEYS = {
  model_usage: 'fantwin_model_usage',
  model_performance: 'fantwin_model_performance',
  daily_usage: 'fantwin_daily_usage'
} as const;

export class ModelManager {
  private openai: OpenAI;
  private modelUsage: Map<string, ModelUsage> = new Map();
  private modelPerformance: Map<string, ModelPerformance> = new Map();
  private dailyUsageReset: number = 0;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || 'placeholder-key',
      dangerouslyAllowBrowser: true
    });

    this.loadUsageData();
    this.loadPerformanceData();
    this.setupDailyReset();
    this.initializePerformanceTracking();
  }

  // FastPass リクエスト実行
  async executeFastPassRequest(request: FastPassRequest): Promise<FastPassResponse> {
    const startTime = Date.now();
    
    try {
      // ユーザー権限チェック
      const allowedModel = await this.validateUserAccess(request.user_tier, request.model_requested);
      if (!allowedModel) {
        return {
          request_id: request.request_id,
          success: false,
          model_used: '',
          response: '',
          tokens_used: 0,
          response_time_ms: Date.now() - startTime,
          cost_usd: 0,
          error: `Model ${request.model_requested} not available for ${request.user_tier} tier`,
          completed_at: Date.now()
        };
      }

      // トークン上限チェック
      const canExecute = await this.checkTokenLimits(request.user_tier, allowedModel, request.estimated_tokens);
      if (!canExecute) {
        return {
          request_id: request.request_id,
          success: false,
          model_used: allowedModel,
          response: '',
          tokens_used: 0,
          response_time_ms: Date.now() - startTime,
          cost_usd: 0,
          error: 'Daily token limit exceeded',
          completed_at: Date.now()
        };
      }

      console.log(`🚀 Executing FastPass request with ${allowedModel} (user_tier: ${request.user_tier})`);

      // OpenAI API実行
      const response = await this.openai.chat.completions.create({
        model: allowedModel === 'gpt-4o-blend-fastpass' ? 'gpt-4o' : allowedModel, // API側では gpt-4o を使用
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        max_tokens: request.max_tokens,
        temperature: request.temperature
      });

      const responseTime = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;
      const cost = this.calculateCost(allowedModel, tokensUsed);

      // 使用量追跡
      await this.trackModelUsage('system', allowedModel, tokensUsed, responseTime, cost);

      const result: FastPassResponse = {
        request_id: request.request_id,
        success: true,
        model_used: allowedModel,
        response: content,
        tokens_used: tokensUsed,
        response_time_ms: responseTime,
        cost_usd: cost,
        completed_at: Date.now()
      };

      console.log(`✅ FastPass completed: ${responseTime}ms, ${tokensUsed} tokens, $${cost.toFixed(4)}`);
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('❌ FastPass request failed:', error);

      // エラーもパフォーマンス統計に記録
      await this.trackModelError(request.model_requested, responseTime);

      return {
        request_id: request.request_id,
        success: false,
        model_used: request.model_requested,
        response: '',
        tokens_used: 0,
        response_time_ms: responseTime,
        cost_usd: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: Date.now()
      };
    }
  }

  // ユーザーアクセス権限検証
  private async validateUserAccess(userTier: string, requestedModel: string): Promise<string | null> {
    const config = MODEL_CONFIGS[requestedModel];
    if (!config) {
      console.warn(`⚠️ Unknown model requested: ${requestedModel}`);
      return null;
    }

    if (!config.user_tiers.includes(userTier as any)) {
      console.warn(`⚠️ User tier ${userTier} not allowed for model ${requestedModel}`);
      
      // フォールバック: 適切なモデルを選択
      for (const [modelName, modelConfig] of Object.entries(MODEL_CONFIGS)) {
        if (modelConfig.user_tiers.includes(userTier as any)) {
          console.log(`🔄 Fallback to ${modelName} for ${userTier} user`);
          return modelName;
        }
      }
      
      return null;
    }

    return requestedModel;
  }

  // トークン上限チェック
  private async checkTokenLimits(userTier: string, modelName: string, estimatedTokens: number): Promise<boolean> {
    const config = MODEL_CONFIGS[modelName];
    if (!config) return false;

    const userId = 'system'; // 実際の実装ではユーザーIDを使用
    const usage = this.modelUsage.get(`${userId}_${modelName}`);
    
    if (!usage) return true; // 初回使用
    
    const dailyUsed = usage.daily_tokens_used;
    const wouldExceed = dailyUsed + estimatedTokens > config.max_tokens_per_day;
    
    if (wouldExceed) {
      console.warn(`⚠️ Daily token limit would be exceeded: ${dailyUsed + estimatedTokens}/${config.max_tokens_per_day}`);
      return false;
    }

    return true;
  }

  // モデル使用量追跡
  private async trackModelUsage(
    userId: string,
    modelName: string,
    tokensUsed: number,
    responseTime: number,
    cost: number
  ): Promise<void> {
    const key = `${userId}_${modelName}`;
    const existing = this.modelUsage.get(key) || {
      user_id: userId,
      model_name: modelName,
      tokens_used: 0,
      requests_count: 0,
      total_cost_usd: 0,
      daily_tokens_used: 0,
      last_request_at: 0,
      response_times_ms: [],
      error_count: 0
    };

    // 使用量更新
    existing.tokens_used += tokensUsed;
    existing.requests_count += 1;
    existing.total_cost_usd += cost;
    existing.daily_tokens_used += tokensUsed;
    existing.last_request_at = Date.now();
    existing.response_times_ms.push(responseTime);
    
    // 直近100リクエストのみ保持
    if (existing.response_times_ms.length > 100) {
      existing.response_times_ms = existing.response_times_ms.slice(-100);
    }

    this.modelUsage.set(key, existing);
    await this.saveUsageData();

    // パフォーマンス統計更新
    await this.updatePerformanceStats(modelName, responseTime, true);
  }

  // エラー追跡
  private async trackModelError(modelName: string, responseTime: number): Promise<void> {
    const userId = 'system';
    const key = `${userId}_${modelName}`;
    const existing = this.modelUsage.get(key);
    
    if (existing) {
      existing.error_count += 1;
      this.modelUsage.set(key, existing);
      await this.saveUsageData();
    }

    // パフォーマンス統計更新（エラーとして）
    await this.updatePerformanceStats(modelName, responseTime, false);
  }

  // パフォーマンス統計更新
  private async updatePerformanceStats(modelName: string, responseTime: number, success: boolean): Promise<void> {
    const existing = this.modelPerformance.get(modelName) || {
      model_name: modelName,
      avg_response_time_ms: 0,
      p50_response_time_ms: 0,
      p75_response_time_ms: 0,
      p95_response_time_ms: 0,
      success_rate: 0,
      total_requests: 0,
      last_24h_requests: 0,
      cost_efficiency_score: 0
    };

    existing.total_requests += 1;
    existing.last_24h_requests += 1;
    
    if (success) {
      const successCount = Math.floor(existing.total_requests * existing.success_rate);
      existing.success_rate = (successCount + 1) / existing.total_requests;
      
      // レスポンス時間統計更新（成功時のみ）
      existing.avg_response_time_ms = (existing.avg_response_time_ms * (existing.total_requests - 1) + responseTime) / existing.total_requests;
    } else {
      const successCount = Math.floor(existing.total_requests * existing.success_rate);
      existing.success_rate = successCount / existing.total_requests;
    }

    this.modelPerformance.set(modelName, existing);
    await this.savePerformanceData();
  }

  // コスト計算
  private calculateCost(modelName: string, tokens: number): number {
    const config = MODEL_CONFIGS[modelName];
    if (!config) return 0;
    
    return (tokens / 1000) * config.cost_per_1k_tokens;
  }

  // 使用量データ読み込み
  private async loadUsageData(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.model_usage);
      if (result[STORAGE_KEYS.model_usage]) {
        const data = result[STORAGE_KEYS.model_usage];
        this.modelUsage = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('❌ Failed to load model usage data:', error);
    }
  }

  // 使用量データ保存
  private async saveUsageData(): Promise<void> {
    try {
      const data = Object.fromEntries(this.modelUsage);
      await chrome.storage.local.set({
        [STORAGE_KEYS.model_usage]: data
      });
    } catch (error) {
      console.error('❌ Failed to save model usage data:', error);
    }
  }

  // パフォーマンスデータ読み込み
  private async loadPerformanceData(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.model_performance);
      if (result[STORAGE_KEYS.model_performance]) {
        const data = result[STORAGE_KEYS.model_performance];
        this.modelPerformance = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('❌ Failed to load model performance data:', error);
    }
  }

  // パフォーマンスデータ保存
  private async savePerformanceData(): Promise<void> {
    try {
      const data = Object.fromEntries(this.modelPerformance);
      await chrome.storage.local.set({
        [STORAGE_KEYS.model_performance]: data
      });
    } catch (error) {
      console.error('❌ Failed to save model performance data:', error);
    }
  }

  // 日次リセット設定
  private setupDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilReset = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyUsage();
      // 24時間間隔で繰り返し
      setInterval(() => this.resetDailyUsage(), 24 * 60 * 60 * 1000);
    }, msUntilReset);

    console.log(`🕐 Daily usage reset scheduled in ${Math.round(msUntilReset / 1000 / 60)} minutes`);
  }

  // 日次使用量リセット
  private async resetDailyUsage(): Promise<void> {
    console.log('🔄 Resetting daily usage counters...');
    
    for (const [key, usage] of this.modelUsage.entries()) {
      usage.daily_tokens_used = 0;
      this.modelUsage.set(key, usage);
    }
    
    // 24時間前のパフォーマンス統計もリセット
    for (const [key, performance] of this.modelPerformance.entries()) {
      performance.last_24h_requests = 0;
      this.modelPerformance.set(key, performance);
    }

    await this.saveUsageData();
    await this.savePerformanceData();
    
    console.log('✅ Daily usage reset completed');
  }

  // パフォーマンス追跡初期化
  private initializePerformanceTracking(): void {
    // 5分間隔でパフォーマンス統計更新
    setInterval(() => {
      this.updatePercentileStats();
    }, 5 * 60 * 1000);

    console.log('📊 Performance tracking initialized (5min interval)');
  }

  // パーセンタイル統計更新
  private updatePercentileStats(): void {
    for (const [modelName, usage] of this.modelUsage.entries()) {
      const [userId, model] = modelName.split('_');
      if (usage.response_times_ms.length > 0) {
        const times = [...usage.response_times_ms].sort((a, b) => a - b);
        const performance = this.modelPerformance.get(model) || {
          model_name: model,
          avg_response_time_ms: 0,
          p50_response_time_ms: 0,
          p75_response_time_ms: 0,
          p95_response_time_ms: 0,
          success_rate: 0,
          total_requests: 0,
          last_24h_requests: 0,
          cost_efficiency_score: 0
        };

        performance.p50_response_time_ms = this.calculatePercentile(times, 50);
        performance.p75_response_time_ms = this.calculatePercentile(times, 75);
        performance.p95_response_time_ms = this.calculatePercentile(times, 95);

        this.modelPerformance.set(model, performance);
      }
    }
  }

  // パーセンタイル計算
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    return sortedValues[lower] * (upper - index) + sortedValues[upper] * (index - lower);
  }

  // モデル設定取得
  getModelConfig(modelName: string): ModelConfig | null {
    return MODEL_CONFIGS[modelName] || null;
  }

  // 利用可能モデル一覧取得
  getAvailableModels(userTier: 'free' | 'trial' | 'pro'): ModelConfig[] {
    return Object.values(MODEL_CONFIGS).filter(config => 
      config.user_tiers.includes(userTier)
    );
  }

  // 使用量統計取得
  getUsageStats(userId: string = 'system'): {
    total_tokens: number;
    total_cost: number;
    requests_count: number;
    models_used: string[];
    daily_remaining: Record<string, number>;
  } {
    let totalTokens = 0;
    let totalCost = 0;
    let requestsCount = 0;
    const modelsUsed: string[] = [];
    const dailyRemaining: Record<string, number> = {};

    for (const [key, usage] of this.modelUsage.entries()) {
      if (usage.user_id === userId) {
        totalTokens += usage.tokens_used;
        totalCost += usage.total_cost_usd;
        requestsCount += usage.requests_count;
        modelsUsed.push(usage.model_name);

        const config = MODEL_CONFIGS[usage.model_name];
        if (config) {
          dailyRemaining[usage.model_name] = Math.max(0, config.max_tokens_per_day - usage.daily_tokens_used);
        }
      }
    }

    return {
      total_tokens: totalTokens,
      total_cost: totalCost,
      requests_count: requestsCount,
      models_used: [...new Set(modelsUsed)],
      daily_remaining: dailyRemaining
    };
  }

  // パフォーマンス統計取得
  getPerformanceStats(): ModelPerformance[] {
    return Array.from(this.modelPerformance.values());
  }

  // モデル推奨取得
  getRecommendedModel(userTier: 'free' | 'trial' | 'pro', priority: 'speed' | 'quality' | 'cost'): string {
    const availableModels = this.getAvailableModels(userTier);
    
    if (availableModels.length === 0) return 'gpt-4o-mini';
    
    switch (priority) {
      case 'speed':
        return availableModels.sort((a, b) => a.estimated_speed_ms - b.estimated_speed_ms)[0].model_name;
      case 'cost':
        return availableModels.sort((a, b) => a.cost_per_1k_tokens - b.cost_per_1k_tokens)[0].model_name;
      case 'quality':
      default:
        // Trial ユーザーにはFastPassを推奨
        if (userTier === 'trial') return 'gpt-4o-blend-fastpass';
        if (userTier === 'pro') return 'gpt-4o';
        return 'gpt-4o-mini';
    }
  }
}

// シングルトンインスタンス
let modelManagerInstance: ModelManager | null = null;

export const getModelManager = (): ModelManager => {
  if (!modelManagerInstance) {
    modelManagerInstance = new ModelManager();
  }
  return modelManagerInstance;
};

export const initializeModelManager = () => {
  console.log('🤖 Initializing Model Manager...');
  const manager = getModelManager();
  console.log('✅ Model Manager initialized');
  return manager;
};
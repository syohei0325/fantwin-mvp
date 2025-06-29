// Week-7-8: Pricing A/B & 通貨対応システム
// Stripe FX-adjust設定、ブラウザlocale検出、JPY/USD自動切替

export interface PricingConfig {
  currency: 'JPY' | 'USD';
  exchangeRate: number;
  lastUpdated: Date;
  locale: string;
}

export interface PlanPricing {
  planId: string;
  name: string;
  jpyPrice: number;
  usdPrice: number;
  features: string[];
  tokenLimit: number;
}

// 通貨プラン定義
export const PRICING_PLANS: PlanPricing[] = [
  {
    planId: 'free',
    name: 'Free',
    jpyPrice: 0,
    usdPrice: 0,
    features: ['30k tokens/month', '4o-mini model', 'Basic support'],
    tokenLimit: 30000
  },
  {
    planId: 'trial',
    name: 'Trial (14 days)',
    jpyPrice: 0,
    usdPrice: 0,
    features: ['100k tokens/month', '4o-blend model', 'Priority support'],
    tokenLimit: 100000
  },
  {
    planId: 'pro',
    name: 'Pro',
    jpyPrice: 3300,  // ¥3,300/month
    usdPrice: 25,    // $25/month
    features: ['100k tokens/month', '4o-blend model', 'Premium support', 'Fast-pass'],
    tokenLimit: 100000
  }
];

class PricingManager {
  private config: PricingConfig | null = null;
  private readonly EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';
  private readonly STORAGE_KEY = 'fantwin_pricing_config';

  // ブラウザlocale検出
  async detectUserLocale(): Promise<{ currency: 'JPY' | 'USD', locale: string }> {
    try {
      // ブラウザの言語設定から判定
      const userLocale = Intl.DateTimeFormat().resolvedOptions().locale;
      
      // 日本語または日本地域の場合はJPY
      if (userLocale.startsWith('ja') || userLocale.includes('JP')) {
        return { currency: 'JPY', locale: userLocale };
      }
      
      // アジア圏の主要通貨（将来拡張用）
      const asianLocales = ['ko', 'zh', 'th', 'vi', 'id'];
      if (asianLocales.some(lang => userLocale.startsWith(lang))) {
        // アジア圏は現在USDで統一（将来的に各国通貨対応）
        return { currency: 'USD', locale: userLocale };
      }
      
      // デフォルトはUSD
      return { currency: 'USD', locale: userLocale };
      
    } catch (error) {
      console.error('Locale detection failed:', error);
      return { currency: 'USD', locale: 'en-US' };
    }
  }

  // 為替レート取得
  async fetchExchangeRate(): Promise<number> {
    try {
      const response = await fetch(this.EXCHANGE_RATE_API);
      const data = await response.json();
      
      // USD to JPY rate
      return data.rates.JPY || 150; // フォールバック値
      
    } catch (error) {
      console.error('Exchange rate fetch failed:', error);
      // フォールバック: 固定レート
      return 150;
    }
  }

  // 価格設定初期化
  async initializePricing(): Promise<PricingConfig> {
    try {
      // 保存された設定を確認
      const stored = await this.getStoredConfig();
      if (stored && this.isConfigValid(stored)) {
        this.config = stored;
        return stored;
      }

      // 新しい設定を作成
      const { currency, locale } = await this.detectUserLocale();
      const exchangeRate = await this.fetchExchangeRate();
      
      const newConfig: PricingConfig = {
        currency,
        exchangeRate,
        lastUpdated: new Date(),
        locale
      };

      this.config = newConfig;
      await this.saveConfig(newConfig);
      
      // GA4イベント送信
      this.trackPricingEvent('pricing_initialized', {
        currency,
        locale,
        exchange_rate: exchangeRate
      });

      return newConfig;
      
    } catch (error) {
      console.error('Pricing initialization failed:', error);
      
      // フォールバック設定
      const fallbackConfig: PricingConfig = {
        currency: 'USD',
        exchangeRate: 150,
        lastUpdated: new Date(),
        locale: 'en-US'
      };
      
      this.config = fallbackConfig;
      return fallbackConfig;
    }
  }

  // 通貨切替
  async switchCurrency(currency: 'JPY' | 'USD'): Promise<void> {
    try {
      if (!this.config) {
        await this.initializePricing();
      }

      const exchangeRate = await this.fetchExchangeRate();
      
      this.config = {
        ...this.config!,
        currency,
        exchangeRate,
        lastUpdated: new Date()
      };

      await this.saveConfig(this.config);
      
      // GA4イベント送信
      this.trackPricingEvent('currency_switched', {
        new_currency: currency,
        exchange_rate: exchangeRate
      });
      
    } catch (error) {
      console.error('Currency switch failed:', error);
      throw error;
    }
  }

  // 価格計算（A/Bテスト対応）
  calculatePrice(planId: string, experimentGroup?: 'control' | 'variant'): {
    amount: number;
    currency: 'JPY' | 'USD';
    formattedPrice: string;
    originalPrice?: number;
    discountPercentage?: number;
  } {
    if (!this.config) {
      throw new Error('Pricing not initialized');
    }

    const plan = PRICING_PLANS.find(p => p.planId === planId);
    if (!plan) {
      throw new Error(`Plan not found: ${planId}`);
    }

    const { currency, exchangeRate } = this.config;
    let amount: number;
    let originalPrice: number | undefined;
    let discountPercentage: number | undefined;

    if (currency === 'JPY') {
      amount = plan.jpyPrice;
      // A/Bテスト: 実験グループでは10%オフ
      if (experimentGroup === 'variant' && plan.jpyPrice > 0) {
        originalPrice = plan.jpyPrice;
        amount = Math.round(plan.jpyPrice * 0.9);
        discountPercentage = 10;
      }
    } else {
      amount = plan.usdPrice;
      // A/Bテスト: 実験グループでは10%オフ
      if (experimentGroup === 'variant' && plan.usdPrice > 0) {
        originalPrice = plan.usdPrice;
        amount = Math.round(plan.usdPrice * 0.9);
        discountPercentage = 10;
      }
    }

    const formattedPrice = this.formatPrice(amount, currency);

    return {
      amount,
      currency,
      formattedPrice,
      originalPrice,
      discountPercentage
    };
  }

  // 価格フォーマット
  private formatPrice(amount: number, currency: 'JPY' | 'USD'): string {
    try {
      return new Intl.NumberFormat(this.config?.locale || 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: currency === 'JPY' ? 0 : 2
      }).format(amount);
    } catch (error) {
      console.error('Price formatting failed:', error);
      return currency === 'JPY' ? `¥${amount}` : `$${amount}`;
    }
  }

  // 設定保存
  private async saveConfig(config: PricingConfig): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: config });
    } else {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    }
  }

  // 保存された設定取得
  private async getStoredConfig(): Promise<PricingConfig | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(this.STORAGE_KEY);
        return result[this.STORAGE_KEY] || null;
      } else {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
      }
    } catch (error) {
      console.error('Failed to get stored config:', error);
      return null;
    }
  }

  // 設定有効性チェック
  private isConfigValid(config: PricingConfig): boolean {
    if (!config.lastUpdated) return false;
    
    // 24時間以内の設定のみ有効
    const now = new Date();
    const lastUpdated = new Date(config.lastUpdated);
    const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff < 24;
  }

  // GA4イベント送信
  private trackPricingEvent(eventName: string, parameters: Record<string, any>): void {
    try {
      if (typeof gtag !== 'undefined') {
        gtag('event', eventName, {
          ...parameters,
          event_category: 'pricing',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('GA4 event tracking failed:', error);
    }
  }

  // Stripe価格ID生成
  getStripePriceId(planId: string, currency: 'JPY' | 'USD'): string {
    // 本番では実際のStripe Price IDを返す
    return `price_${planId}_${currency.toLowerCase()}`;
  }

  // 現在の設定取得
  getCurrentConfig(): PricingConfig | null {
    return this.config;
  }

  // 為替レート表示用
  getExchangeRateDisplay(): string {
    if (!this.config) return '';
    
    const { currency, exchangeRate } = this.config;
    if (currency === 'JPY') {
      return `$1 = ¥${exchangeRate.toFixed(2)}`;
    } else {
      return `¥1 = $${(1 / exchangeRate).toFixed(4)}`;
    }
  }
}

// シングルトンインスタンス
export const pricingManager = new PricingManager();

// 初期化関数
export async function initializePricingManager(): Promise<PricingConfig> {
  return await pricingManager.initializePricing();
}

// 価格計算ヘルパー
export function calculatePlanPrice(
  planId: string, 
  experimentGroup?: 'control' | 'variant'
) {
  return pricingManager.calculatePrice(planId, experimentGroup);
}

// 通貨切替ヘルパー
export async function switchUserCurrency(currency: 'JPY' | 'USD'): Promise<void> {
  await pricingManager.switchCurrency(currency);
} 
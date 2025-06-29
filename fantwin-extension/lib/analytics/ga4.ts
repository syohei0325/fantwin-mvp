// GA4 Analytics Library for FanTwin Chrome Extension
// @mvp_checklist.md: GA4 Streaming Export β対応

export interface GA4Config {
  measurementId: string;
  apiSecret: string;
  clientId?: string;
  userId?: string;
}

export interface GA4Event {
  name: string;
  parameters: Record<string, any>;
}

export interface GA4StreamingOptions {
  enableStreaming: boolean;
  flushInterval: number; // milliseconds
  maxBatchSize: number;
}

// GA4クライアントクラス
export class GA4Client {
  private config: GA4Config;
  private streamingOptions: GA4StreamingOptions;
  private eventQueue: GA4Event[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: GA4Config, streamingOptions?: Partial<GA4StreamingOptions>) {
    this.config = config;
    this.streamingOptions = {
      enableStreaming: true,
      flushInterval: 200, // @mvp_checklist.md: 200ms flush間隔
      maxBatchSize: 25,
      ...streamingOptions
    };

    // Streaming有効時は定期flush開始
    if (this.streamingOptions.enableStreaming) {
      this.startStreamingFlush();
    }
  }

  // Client ID取得・生成
  private async getClientId(): Promise<string> {
    if (this.config.clientId) {
      return this.config.clientId;
    }

    try {
      const result = await browser.storage.local.get(['fantwin_ga4_client_id']);
      
      if (result.fantwin_ga4_client_id) {
        this.config.clientId = result.fantwin_ga4_client_id;
        return result.fantwin_ga4_client_id;
      }

      // 新規Client ID生成
      const clientId = this.generateClientId();
      await browser.storage.local.set({ fantwin_ga4_client_id: clientId });
      this.config.clientId = clientId;
      
      return clientId;
    } catch (error) {
      console.error('❌ Failed to get/generate client ID:', error);
      return this.generateClientId();
    }
  }

  // Client ID生成 (GA4準拠形式)
  private generateClientId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    return `${timestamp}.${random}`;
  }

  // 単一イベント送信
  async trackEvent(eventName: string, parameters: Record<string, any> = {}): Promise<boolean> {
    const event: GA4Event = {
      name: eventName,
      parameters: {
        ...parameters,
        timestamp_micros: Date.now() * 1000,
        engagement_time_msec: 100
      }
    };

    if (this.streamingOptions.enableStreaming) {
      // Streaming モード: キューに追加
      this.addToQueue(event);
      return true;
    } else {
      // 即座送信モード
      return await this.sendEvents([event]);
    }
  }

  // 汎用イベント送信メソッド (background.tsからの呼び出し用)
  async sendEvent(eventName: string, parameters: Record<string, any> = {}): Promise<boolean> {
    return await this.trackEvent(eventName, parameters);
  }

  // 初期化メソッド
  initialize(): void {
    console.log('✅ GA4Manager initialized for L0-α Speed-&-Cash');
  }

  // @mvp_checklist.md KPI: D1 Activation追跡
  async trackActivation(step: 'install' | 'hello_dm_generated' | 'dm_sent' | 'complete', metadata: Record<string, any> = {}): Promise<boolean> {
    return await this.trackEvent('activation_step', {
      activation_step: step,
      step_order: this.getActivationStepOrder(step),
      ...metadata
    });
  }

  // @mvp_checklist.md KPI: Retention追跡
  async trackRetention(type: 'w1' | 'w4', metadata: Record<string, any> = {}): Promise<boolean> {
    return await this.trackEvent('retention_check', {
      retention_type: type,
      check_timestamp: Date.now(),
      ...metadata
    });
  }

  // Service Worker Heartbeat追跡
  async trackHeartbeat(status: 'active' | 'failed', metadata: Record<string, any> = {}): Promise<boolean> {
    return await this.trackEvent('service_worker_heartbeat', {
      heartbeat_status: status,
      manifest_version: 3,
      ...metadata
    });
  }

  // ストリーミングキューに追加
  private addToQueue(event: GA4Event): void {
    this.eventQueue.push(event);

    // 最大バッチサイズに達したら即座flush
    if (this.eventQueue.length >= this.streamingOptions.maxBatchSize) {
      this.flushQueue();
    }
  }

  // ストリーミング定期flush開始
  private startStreamingFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushQueue();
      }
    }, this.streamingOptions.flushInterval);
  }

  // キューをflushしてGA4に送信
  private async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    const success = await this.sendEvents(eventsToSend);
    
    if (!success) {
      // 送信失敗時はキューに戻す（データロス防止）
      this.eventQueue.unshift(...eventsToSend);
      console.warn('⚠️ GA4 events returned to queue due to send failure');
    }
  }

  // GA4にイベント配列送信
  private async sendEvents(events: GA4Event[]): Promise<boolean> {
    try {
      const clientId = await this.getClientId();
      
      const payload = {
        client_id: clientId,
        user_id: this.config.userId,
        events: events.map(event => ({
          name: event.name,
          params: event.parameters
        }))
      };

      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.config.measurementId}&api_secret=${this.config.apiSecret}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`📊 GA4: ${events.length} events sent successfully`);
        return true;
      } else {
        console.error(`❌ GA4 send failed: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (error) {
      console.error('❌ GA4 send error:', error);
      return false;
    }
  }

  // @mvp_checklist.md: Activation Step順序定義
  private getActivationStepOrder(step: string): number {
    const stepOrder = {
      'install': 1,
      'hello_dm_generated': 2,
      'dm_sent': 3,
      'complete': 4
    };
    return stepOrder[step as keyof typeof stepOrder] || 0;
  }

  // リソースクリーンアップ
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // 残りのイベントをflush
    if (this.eventQueue.length > 0) {
      this.flushQueue();
    }
  }
}

// デフォルト設定でGA4クライアント作成
export const createGA4Client = (config?: Partial<GA4Config>): GA4Client => {
  const defaultConfig: GA4Config = {
    measurementId: 'G-XXXXXXXXXX', // 実際のGA4測定IDに置換
    apiSecret: 'api_secret_here', // 実際のAPI Secretに置換
    ...config
  };
  
  return new GA4Client(defaultConfig);
};

// @mvp_checklist.md L0-α Speed-&-Cash用のGA4Manager インスタンス
export const ga4Manager = createGA4Client({
  measurementId: 'G-L0ALPHA001', // L0-α専用測定ID
  apiSecret: 'l0_alpha_secret'   // L0-α専用API Secret
}); 
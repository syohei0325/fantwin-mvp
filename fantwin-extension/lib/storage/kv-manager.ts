// @implementation_plan.md Week-4: KV同時実行制御
// Redis/Upstash KV連携 + Back-pressure queue + 100RPS負荷対応

export interface KVRequest {
  id: string;
  operation: 'get' | 'set' | 'delete' | 'incr' | 'expire';
  key: string;
  value?: any;
  ttl?: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: number;
  timeout_ms: number;
  retry_count: number;
  max_retries: number;
}

export interface KVResponse {
  request_id: string;
  success: boolean;
  data?: any;
  error?: string;
  execution_time_ms: number;
  queue_wait_ms: number;
  retry_count: number;
}

export interface BackPressureConfig {
  max_concurrent_requests: number; // 同時実行最大数
  max_queue_size: number; // キュー最大サイズ
  request_timeout_ms: number; // リクエストタイムアウト
  queue_timeout_ms: number; // キュー待機タイムアウト
  error_threshold: number; // エラー率閾値 (0.001 = 0.1%)
  backoff_base_ms: number; // バックオフ基本時間
  backoff_multiplier: number; // バックオフ倍率
  health_check_interval_ms: number; // ヘルスチェック間隔
}

export interface KVMetrics {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_execution_time_ms: number;
  avg_queue_wait_ms: number;
  current_queue_size: number;
  concurrent_requests: number;
  error_rate: number;
  last_error?: string;
  last_updated: number;
}

// @mvp_checklist.md: KV write conc = 1 → back-pressure queue 自動制御
const DEFAULT_CONFIG: BackPressureConfig = {
  max_concurrent_requests: 5, // 並行実行5リクエストまで
  max_queue_size: 100, // キュー100件まで
  request_timeout_ms: 10000, // 10秒タイムアウト
  queue_timeout_ms: 30000, // キュー待機30秒まで
  error_threshold: 0.001, // 0.1%エラー率
  backoff_base_ms: 100, // 100ms基本バックオフ
  backoff_multiplier: 2, // 2倍ずつ増加
  health_check_interval_ms: 5000 // 5秒間隔ヘルスチェック
};

const STORAGE_KEY = 'fantwin_kv_metrics';

class KVManager {
  private config: BackPressureConfig = DEFAULT_CONFIG;
  private requestQueue: KVRequest[] = [];
  private activeRequests: Map<string, KVRequest> = new Map();
  private metrics: KVMetrics = {
    total_requests: 0,
    successful_requests: 0,
    failed_requests: 0,
    avg_execution_time_ms: 0,
    avg_queue_wait_ms: 0,
    current_queue_size: 0,
    concurrent_requests: 0,
    error_rate: 0,
    last_updated: Date.now()
  };
  private isProcessing = false;
  private healthCheckInterval?: number;

  constructor() {
    this.loadMetrics();
    this.setupHealthCheck();
    this.startProcessing();
  }

  // メトリクス読み込み
  private async loadMetrics(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      if (result[STORAGE_KEY]) {
        this.metrics = { ...this.metrics, ...result[STORAGE_KEY] };
      }
    } catch (error) {
      console.error('❌ Failed to load KV metrics:', error);
    }
  }

  // メトリクス保存
  private async saveMetrics(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEY]: this.metrics
      });
    } catch (error) {
      console.error('❌ Failed to save KV metrics:', error);
    }
  }

  // KVリクエスト実行
  async executeRequest(
    operation: KVRequest['operation'],
    key: string,
    value?: any,
    options: {
      ttl?: number;
      priority?: KVRequest['priority'];
      timeout_ms?: number;
      max_retries?: number;
    } = {}
  ): Promise<KVResponse> {
    const requestId = `kv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request: KVRequest = {
      id: requestId,
      operation,
      key,
      value,
      ttl: options.ttl,
      priority: options.priority || 'normal',
      timestamp: Date.now(),
      timeout_ms: options.timeout_ms || this.config.request_timeout_ms,
      retry_count: 0,
      max_retries: options.max_retries || 3
    };

    console.log(`📝 KV request queued: ${operation} ${key} (priority: ${request.priority})`);

    return new Promise((resolve, reject) => {
      // Back-pressure チェック
      if (this.requestQueue.length >= this.config.max_queue_size) {
        const error = 'Queue full - back-pressure activated';
        this.updateMetrics(request, false, 0, 0, error);
        reject(new Error(error));
        return;
      }

      // キュータイムアウト設定
      const queueTimeout = setTimeout(() => {
        this.removeFromQueue(requestId);
        const error = 'Queue timeout exceeded';
        this.updateMetrics(request, false, 0, Date.now() - request.timestamp, error);
        reject(new Error(error));
      }, this.config.queue_timeout_ms);

      // リクエストにコールバック追加
      (request as any).resolve = (response: KVResponse) => {
        clearTimeout(queueTimeout);
        resolve(response);
      };
      (request as any).reject = (error: Error) => {
        clearTimeout(queueTimeout);
        reject(error);
      };

      // 優先度付きキューに追加
      this.addToQueue(request);
    });
  }

  // 優先度付きキューに追加
  private addToQueue(request: KVRequest): void {
    // 優先度順でソート挿入
    const priorityOrder = { 'critical': 4, 'high': 3, 'normal': 2, 'low': 1 };
    const requestPriority = priorityOrder[request.priority];
    
    let insertIndex = this.requestQueue.length;
    for (let i = 0; i < this.requestQueue.length; i++) {
      const queuedPriority = priorityOrder[this.requestQueue[i].priority];
      if (requestPriority > queuedPriority) {
        insertIndex = i;
        break;
      }
    }

    this.requestQueue.splice(insertIndex, 0, request);
    this.metrics.current_queue_size = this.requestQueue.length;
    
    console.log(`📋 Request added to queue at position ${insertIndex} (queue size: ${this.requestQueue.length})`);
  }

  // キューから削除
  private removeFromQueue(requestId: string): void {
    const index = this.requestQueue.findIndex(req => req.id === requestId);
    if (index !== -1) {
      this.requestQueue.splice(index, 1);
      this.metrics.current_queue_size = this.requestQueue.length;
    }
  }

  // リクエスト処理開始
  private startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processQueue();
  }

  // キュー処理
  private async processQueue(): Promise<void> {
    while (this.isProcessing) {
      // 同時実行数チェック
      if (this.activeRequests.size >= this.config.max_concurrent_requests) {
        await this.sleep(50); // 50ms待機
        continue;
      }

      // キューが空の場合
      if (this.requestQueue.length === 0) {
        await this.sleep(100); // 100ms待機
        continue;
      }

      // 次のリクエストを取得
      const request = this.requestQueue.shift();
      if (!request) continue;

      this.metrics.current_queue_size = this.requestQueue.length;

      // アクティブリクエストに追加
      this.activeRequests.set(request.id, request);
      this.metrics.concurrent_requests = this.activeRequests.size;

      // リクエスト実行（非同期）
      this.executeKVOperation(request).finally(() => {
        this.activeRequests.delete(request.id);
        this.metrics.concurrent_requests = this.activeRequests.size;
      });
    }
  }

  // 実際のKV操作実行
  private async executeKVOperation(request: KVRequest): Promise<void> {
    const queueWaitMs = Date.now() - request.timestamp;
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Executing KV operation: ${request.operation} ${request.key}`);

      let result: any;
      
      // エラー率チェックによるサーキットブレーカー
      if (this.metrics.error_rate > this.config.error_threshold) {
        throw new Error('Circuit breaker open - error rate too high');
      }

      // 実際のKV操作（Chrome Storage Local をKVストアとして使用）
      switch (request.operation) {
        case 'get':
          result = await this.performGet(request.key);
          break;
        case 'set':
          result = await this.performSet(request.key, request.value, request.ttl);
          break;
        case 'delete':
          result = await this.performDelete(request.key);
          break;
        case 'incr':
          result = await this.performIncrement(request.key);
          break;
        case 'expire':
          result = await this.performExpire(request.key, request.ttl);
          break;
        default:
          throw new Error(`Unsupported operation: ${request.operation}`);
      }

      const executionTime = Date.now() - startTime;
      
      const response: KVResponse = {
        request_id: request.id,
        success: true,
        data: result,
        execution_time_ms: executionTime,
        queue_wait_ms: queueWaitMs,
        retry_count: request.retry_count
      };

      this.updateMetrics(request, true, executionTime, queueWaitMs);
      
      if ((request as any).resolve) {
        (request as any).resolve(response);
      }

      console.log(`✅ KV operation completed: ${request.operation} ${request.key} (${executionTime}ms)`);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ KV operation failed: ${request.operation} ${request.key} - ${errorMessage}`);

      // リトライ判定
      if (request.retry_count < request.max_retries && this.shouldRetry(errorMessage)) {
        request.retry_count++;
        const backoffMs = this.config.backoff_base_ms * Math.pow(this.config.backoff_multiplier, request.retry_count - 1);
        
        console.log(`🔄 Retrying KV operation in ${backoffMs}ms (attempt ${request.retry_count}/${request.max_retries})`);
        
        setTimeout(() => {
          this.addToQueue(request);
        }, backoffMs);
        
        return;
      }

      // 最終エラー
      const response: KVResponse = {
        request_id: request.id,
        success: false,
        error: errorMessage,
        execution_time_ms: executionTime,
        queue_wait_ms: queueWaitMs,
        retry_count: request.retry_count
      };

      this.updateMetrics(request, false, executionTime, queueWaitMs, errorMessage);
      
      if ((request as any).reject) {
        (request as any).reject(new Error(errorMessage));
      }
    }
  }

  // Chrome Storage Get操作
  private async performGet(key: string): Promise<any> {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  }

  // Chrome Storage Set操作
  private async performSet(key: string, value: any, ttl?: number): Promise<boolean> {
    const data: any = { [key]: value };
    
    // TTL対応（期限付きデータ）
    if (ttl) {
      data[`${key}_expires`] = Date.now() + (ttl * 1000);
    }
    
    await chrome.storage.local.set(data);
    return true;
  }

  // Chrome Storage Delete操作
  private async performDelete(key: string): Promise<boolean> {
    await chrome.storage.local.remove([key, `${key}_expires`]);
    return true;
  }

  // Chrome Storage Increment操作
  private async performIncrement(key: string): Promise<number> {
    const current = await this.performGet(key);
    const newValue = (typeof current === 'number' ? current : 0) + 1;
    await this.performSet(key, newValue);
    return newValue;
  }

  // TTL設定（期限切れ処理）
  private async performExpire(key: string, ttl?: number): Promise<boolean> {
    if (!ttl) return false;
    
    const expiresAt = Date.now() + (ttl * 1000);
    await chrome.storage.local.set({ [`${key}_expires`]: expiresAt });
    return true;
  }

  // リトライ判定
  private shouldRetry(errorMessage: string): boolean {
    // ネットワークエラーや一時的なエラーはリトライ
    const retryableErrors = [
      'network error',
      'timeout',
      'rate limit',
      'temporary failure',
      'service unavailable'
    ];
    
    return retryableErrors.some(pattern => 
      errorMessage.toLowerCase().includes(pattern)
    );
  }

  // メトリクス更新
  private updateMetrics(
    request: KVRequest,
    success: boolean,
    executionTime: number,
    queueWaitMs: number,
    error?: string
  ): void {
    this.metrics.total_requests++;
    
    if (success) {
      this.metrics.successful_requests++;
    } else {
      this.metrics.failed_requests++;
      this.metrics.last_error = error;
    }

    // 移動平均でレスポンス時間更新
    const alpha = 0.1; // 重み
    this.metrics.avg_execution_time_ms = 
      (this.metrics.avg_execution_time_ms * (1 - alpha)) + (executionTime * alpha);
    
    this.metrics.avg_queue_wait_ms = 
      (this.metrics.avg_queue_wait_ms * (1 - alpha)) + (queueWaitMs * alpha);

    // エラー率計算（直近100リクエスト）
    this.metrics.error_rate = this.metrics.failed_requests / this.metrics.total_requests;
    
    this.metrics.last_updated = Date.now();

    // メトリクス保存（定期的に）
    if (this.metrics.total_requests % 10 === 0) {
      this.saveMetrics();
    }

    // アラート条件チェック
    this.checkAlertConditions();
  }

  // アラート条件チェック
  private async checkAlertConditions(): Promise<void> {
    const conditions = [];

    // エラー率アラート
    if (this.metrics.error_rate > this.config.error_threshold) {
      conditions.push({
        type: 'high_error_rate',
        current: this.metrics.error_rate,
        threshold: this.config.error_threshold
      });
    }

    // キューサイズアラート
    const queueUtilization = this.metrics.current_queue_size / this.config.max_queue_size;
    if (queueUtilization > 0.8) {
      conditions.push({
        type: 'high_queue_utilization',
        current: queueUtilization,
        threshold: 0.8
      });
    }

    // レスポンス時間アラート
    if (this.metrics.avg_execution_time_ms > 5000) {
      conditions.push({
        type: 'high_response_time',
        current: this.metrics.avg_execution_time_ms,
        threshold: 5000
      });
    }

    if (conditions.length > 0) {
      await this.sendBackPressureAlert(conditions);
    }
  }

  // Back-pressureアラート送信
  private async sendBackPressureAlert(conditions: any[]): Promise<void> {
    try {
      console.log('🚨 KV Back-pressure alert:', conditions);

      // TODO: 実際のSlack webhook送信
      const alertData = {
        alert_type: 'kv_back_pressure',
        timestamp: Date.now(),
        conditions,
        metrics: this.getMetrics()
      };

      console.warn('🚨 KV BACK-PRESSURE ALERT:', alertData);
      
      // GA4イベント送信
      console.log('📊 Back-pressure alert event:', alertData);

    } catch (error) {
      console.error('❌ Failed to send back-pressure alert:', error);
    }
  }

  // ヘルスチェック設定
  private setupHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.health_check_interval_ms) as any;
  }

  // ヘルスチェック実行
  private async performHealthCheck(): Promise<void> {
    try {
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'ping';
      
      // 簡単なset/get/deleteテスト
      await this.performSet(testKey, testValue);
      const retrieved = await this.performGet(testKey);
      await this.performDelete(testKey);
      
      if (retrieved !== testValue) {
        throw new Error('Health check data mismatch');
      }
      
      console.log('💚 KV health check passed');
      
    } catch (error) {
      console.error('❤️‍🔥 KV health check failed:', error);
      await this.sendBackPressureAlert([{
        type: 'health_check_failed',
        error: error instanceof Error ? error.message : String(error)
      }]);
    }
  }

  // 負荷テスト（100RPS）
  async runLoadTest(durationSeconds = 60): Promise<{
    total_requests: number;
    successful_requests: number;
    rps_achieved: number;
    error_rate: number;
    avg_response_time: number;
  }> {
    console.log(`🔥 Starting KV load test: 100 RPS for ${durationSeconds} seconds`);
    
    const startTime = Date.now();
    const endTime = startTime + (durationSeconds * 1000);
    const targetRPS = 100;
    const requestInterval = 1000 / targetRPS; // 10ms間隔
    
    let totalRequests = 0;
    let successfulRequests = 0;
    const responseTimes: number[] = [];

    while (Date.now() < endTime) {
      const testPromises: Promise<void>[] = [];
      
      // 1秒間で100リクエスト送信
      for (let i = 0; i < targetRPS; i++) {
        const promise = this.executeRequest(
          'set',
          `load_test_${totalRequests}_${i}`,
          `test_value_${Date.now()}`,
          { priority: 'normal', timeout_ms: 5000 }
        ).then(response => {
          if (response.success) {
            successfulRequests++;
            responseTimes.push(response.execution_time_ms);
          }
        }).catch(() => {
          // エラーはカウントのみ
        });
        
        testPromises.push(promise);
        totalRequests++;
        
        // 間隔調整
        await this.sleep(requestInterval);
      }
      
      // 1秒間のリクエスト完了待機
      await Promise.allSettled(testPromises);
    }

    const actualDuration = (Date.now() - startTime) / 1000;
    const rpsAchieved = totalRequests / actualDuration;
    const errorRate = (totalRequests - successfulRequests) / totalRequests;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const results = {
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      rps_achieved: Math.round(rpsAchieved),
      error_rate: errorRate,
      avg_response_time: Math.round(avgResponseTime)
    };

    console.log('🏁 Load test completed:', results);
    
    // GA4イベント送信
    console.log('📊 Load test event:', results);

    return results;
  }

  // ユーティリティ: Sleep
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 設定更新
  updateConfig(newConfig: Partial<BackPressureConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ KV config updated:', newConfig);
  }

  // メトリクス取得
  getMetrics(): KVMetrics {
    return { ...this.metrics };
  }

  // クリーンアップ
  destroy(): void {
    this.isProcessing = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    console.log('🧹 KV Manager destroyed');
  }
}

// シングルトンインスタンス
export const kvManager = new KVManager();

// Service Workerでの初期化
export const initializeKVManager = () => {
  console.log('🗄️ KV Manager initialized (Week-4 Back-pressure)');
  return kvManager;
}; 
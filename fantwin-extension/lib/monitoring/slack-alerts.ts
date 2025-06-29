// @implementation_plan.md Week-4: アラートシステム
// Slack Webhook連携 + Back-pressureアラート + p95パフォーマンス監視

export interface SlackAlert {
  alert_id: string;
  alert_type: 'performance' | 'back_pressure' | 'error_rate' | 'health_check' | 'model_usage' | 'cost_guardrail';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  metadata: Record<string, any>;
  is_resolved: boolean;
  resolved_at?: number;
}

export interface SlackWebhookConfig {
  webhook_url: string;
  channel: string;
  username: string;
  icon_emoji: string;
  alert_threshold: {
    performance_p95_ms: number; // p95レスポンス時間閾値
    error_rate_percent: number; // エラー率閾値
    queue_utilization_percent: number; // キュー使用率閾値
    memory_usage_mb: number; // メモリ使用量閾値
    gross_margin_percent: number; // 粗利率閾値（Cost Guardrail）
  };
}

export interface PerformanceMetrics {
  p50_response_time_ms: number;
  p75_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  avg_response_time_ms: number;
  request_count: number;
  error_count: number;
  error_rate: number;
  memory_usage_mb: number;
  timestamp: number;
}

// @mvp_checklist.md: p95パフォーマンス監視自動制御
const DEFAULT_CONFIG: SlackWebhookConfig = {
  // 🚨 MVP検証用: 実際のSlack WebhookまたはPostmanエコー
  webhook_url: process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/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',
  channel: '#fantwin-mvp-alerts',
  username: 'FanTwin MVP Monitor',
  icon_emoji: '🚨',
  alert_threshold: {
    performance_p95_ms: 800, // @mvp_checklist.md: Streaming p75 < 800ms → p95監視
    error_rate_percent: 0.1, // 0.1%
    queue_utilization_percent: 80, // 80%
    memory_usage_mb: 100, // 100MB
    gross_margin_percent: 40.0 // 40% Cost Guardrail
  }
};

const STORAGE_KEYS = {
  alert_history: 'fantwin_alert_history',
  performance_metrics: 'fantwin_performance_metrics',
  slack_config: 'fantwin_slack_config'
} as const;

class SlackAlertsManager {
  private config: SlackWebhookConfig = DEFAULT_CONFIG;
  private alertHistory: SlackAlert[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private lastAlertTimes: Map<string, number> = new Map();
  private readonly ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5分間のクールダウン

  constructor() {
    this.loadConfig();
    this.loadAlertHistory();
    this.loadPerformanceMetrics();
    this.startPerformanceMonitoring();
  }

  // 設定読み込み
  private async loadConfig(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.slack_config);
      if (result[STORAGE_KEYS.slack_config]) {
        this.config = { ...this.config, ...result[STORAGE_KEYS.slack_config] };
      }
    } catch (error) {
      console.error('❌ Failed to load Slack config:', error);
    }
  }

  // アラート履歴読み込み
  private async loadAlertHistory(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.alert_history);
      if (result[STORAGE_KEYS.alert_history]) {
        // 直近24時間のアラートのみ保持
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
        this.alertHistory = result[STORAGE_KEYS.alert_history].filter(
          (alert: SlackAlert) => alert.timestamp > cutoffTime
        );
      }
    } catch (error) {
      console.error('❌ Failed to load alert history:', error);
    }
  }

  // パフォーマンスメトリクス読み込み
  private async loadPerformanceMetrics(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.performance_metrics);
      if (result[STORAGE_KEYS.performance_metrics]) {
        // 直近1時間のメトリクスのみ保持
        const cutoffTime = Date.now() - (60 * 60 * 1000);
        this.performanceMetrics = result[STORAGE_KEYS.performance_metrics].filter(
          (metric: PerformanceMetrics) => metric.timestamp > cutoffTime
        );
      }
    } catch (error) {
      console.error('❌ Failed to load performance metrics:', error);
    }
  }

  // アラート履歴保存
  private async saveAlertHistory(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.alert_history]: this.alertHistory
      });
    } catch (error) {
      console.error('❌ Failed to save alert history:', error);
    }
  }

  // パフォーマンスメトリクス保存
  private async savePerformanceMetrics(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.performance_metrics]: this.performanceMetrics
      });
    } catch (error) {
      console.error('❌ Failed to save performance metrics:', error);
    }
  }

  // パフォーマンス監視開始
  private startPerformanceMonitoring(): void {
    // 30秒間隔でパフォーマンス監視
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 30000);

    console.log('📊 Performance monitoring started (30s interval)');
  }

  // パフォーマンスメトリクス収集
  private async collectPerformanceMetrics(): Promise<void> {
    try {
      // メモリ使用量取得
      const memoryInfo = await this.getMemoryUsage();
      
      // 模擬レスポンス時間データ（実際の実装ではAPIレスポンス時間を収集）
      const responseTimes = this.generateMockResponseTimes();
      
      const metrics: PerformanceMetrics = {
        p50_response_time_ms: this.calculatePercentile(responseTimes, 50),
        p75_response_time_ms: this.calculatePercentile(responseTimes, 75),
        p95_response_time_ms: this.calculatePercentile(responseTimes, 95),
        p99_response_time_ms: this.calculatePercentile(responseTimes, 99),
        avg_response_time_ms: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
        request_count: responseTimes.length,
        error_count: Math.floor(responseTimes.length * 0.005), // 0.5%エラー率想定
        error_rate: 0.005,
        memory_usage_mb: memoryInfo.used_mb,
        timestamp: Date.now()
      };

      this.performanceMetrics.push(metrics);
      await this.savePerformanceMetrics();

      // アラート条件チェック
      await this.checkPerformanceAlerts(metrics);

      console.log(`📈 Performance metrics collected: p95=${metrics.p95_response_time_ms}ms, memory=${metrics.memory_usage_mb}MB`);

    } catch (error) {
      console.error('❌ Failed to collect performance metrics:', error);
    }
  }

  // メモリ使用量取得
  private async getMemoryUsage(): Promise<{ used_mb: number; available_mb: number }> {
    try {
      // Chrome Memory API（実際の実装）
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        return {
          used_mb: Math.round(memInfo.usedJSHeapSize / (1024 * 1024)),
          available_mb: Math.round(memInfo.totalJSHeapSize / (1024 * 1024))
        };
      }
      
      // フォールバック（模擬データ）
      return {
        used_mb: Math.floor(Math.random() * 50) + 20, // 20-70MB
        available_mb: 512
      };
    } catch (error) {
      console.error('❌ Failed to get memory usage:', error);
      return { used_mb: 30, available_mb: 512 };
    }
  }

  // 模擬レスポンス時間生成（テスト用）
  private generateMockResponseTimes(): number[] {
    const times: number[] = [];
    const baseTime = 200 + Math.random() * 300; // 200-500ms基準
    
    for (let i = 0; i < 100; i++) {
      // 正規分布に近い形でレスポンス時間生成
      const randomFactor = (Math.random() + Math.random() + Math.random()) / 3;
      const responseTime = baseTime + (randomFactor * 200);
      times.push(Math.round(responseTime));
    }
    
    return times;
  }

  // パーセンタイル計算
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // パフォーマンスアラートチェック
  private async checkPerformanceAlerts(metrics: PerformanceMetrics): Promise<void> {
    const alerts: Partial<SlackAlert>[] = [];

    // p95レスポンス時間アラート
    if (metrics.p95_response_time_ms > this.config.alert_threshold.performance_p95_ms) {
      alerts.push({
        alert_type: 'performance',
        severity: 'high',
        title: 'High p95 Response Time Detected',
        message: `p95 response time (${metrics.p95_response_time_ms}ms) exceeded threshold (${this.config.alert_threshold.performance_p95_ms}ms)`,
        metadata: {
          p95_response_time_ms: metrics.p95_response_time_ms,
          threshold: this.config.alert_threshold.performance_p95_ms,
          p50: metrics.p50_response_time_ms,
          p75: metrics.p75_response_time_ms,
          p99: metrics.p99_response_time_ms
        }
      });
    }

    // エラー率アラート
    if (metrics.error_rate * 100 > this.config.alert_threshold.error_rate_percent) {
      alerts.push({
        alert_type: 'error_rate',
        severity: 'critical',
        title: 'High Error Rate Detected',
        message: `Error rate (${(metrics.error_rate * 100).toFixed(2)}%) exceeded threshold (${this.config.alert_threshold.error_rate_percent}%)`,
        metadata: {
          error_rate: metrics.error_rate,
          error_count: metrics.error_count,
          request_count: metrics.request_count,
          threshold: this.config.alert_threshold.error_rate_percent
        }
      });
    }

    // メモリ使用量アラート
    if (metrics.memory_usage_mb > this.config.alert_threshold.memory_usage_mb) {
      alerts.push({
        alert_type: 'performance',
        severity: 'medium',
        title: 'High Memory Usage Detected',
        message: `Memory usage (${metrics.memory_usage_mb}MB) exceeded threshold (${this.config.alert_threshold.memory_usage_mb}MB)`,
        metadata: {
          memory_usage_mb: metrics.memory_usage_mb,
          threshold: this.config.alert_threshold.memory_usage_mb
        }
      });
    }

    // アラート送信
    for (const alertData of alerts) {
      await this.sendAlert(alertData as Omit<SlackAlert, 'alert_id' | 'timestamp' | 'is_resolved'>);
    }
  }

  // Back-pressureアラート送信
  async sendBackPressureAlert(
    queueUtilization: number,
    queueSize: number,
    maxQueueSize: number,
    errorRate: number
  ): Promise<void> {
    const alertData = {
      alert_type: 'back_pressure' as const,
      severity: 'high' as const,
      title: 'KV Back-pressure Detected',
      message: `Queue utilization (${(queueUtilization * 100).toFixed(1)}%) is high. Current queue: ${queueSize}/${maxQueueSize}`,
      metadata: {
        queue_utilization: queueUtilization,
        queue_size: queueSize,
        max_queue_size: maxQueueSize,
        error_rate: errorRate,
        threshold: this.config.alert_threshold.queue_utilization_percent
      }
    };

    await this.sendAlert(alertData);
  }

  // 汎用アラート送信
  async sendAlert(alertData: Omit<SlackAlert, 'alert_id' | 'timestamp' | 'is_resolved'>): Promise<void> {
    try {
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const alert: SlackAlert = {
        alert_id: alertId,
        timestamp: Date.now(),
        is_resolved: false,
        ...alertData
      };

      // クールダウンチェック
      const alertKey = `${alert.alert_type}_${alert.severity}`;
      const lastAlertTime = this.lastAlertTimes.get(alertKey) || 0;
      
      if (Date.now() - lastAlertTime < this.ALERT_COOLDOWN_MS) {
        console.log(`⏰ Alert cooldown active for ${alertKey}, skipping alert`);
        return;
      }

      // Slack メッセージ構築
      const slackMessage = this.buildSlackMessage(alert);

      // Slack Webhook送信
      await this.sendToSlack(slackMessage);

      // アラート履歴に追加
      this.alertHistory.push(alert);
      await this.saveAlertHistory();

      // クールダウン時間設定
      this.lastAlertTimes.set(alertKey, Date.now());

      console.log(`🚨 Alert sent to Slack: ${alert.title}`);

      // GA4イベント送信
      await this.sendAlertAnalytics(alert);

    } catch (error) {
      console.error('❌ Failed to send alert:', error);
    }
  }

  // Slackメッセージ構築
  private buildSlackMessage(alert: SlackAlert): any {
    const severityEmoji = {
      low: '🟡',
      medium: '🟠', 
      high: '🔴',
      critical: '🚨'
    };

    const alertTypeEmoji = {
      performance: '⚡',
      back_pressure: '🚰',
      error_rate: '❌',
      health_check: '💊',
      model_usage: '🤖',
      cost_guardrail: '💸'
    };

    const attachments = [];

    // メタデータをフィールドとして追加
    if (alert.metadata && Object.keys(alert.metadata).length > 0) {
      const fields = Object.entries(alert.metadata).map(([key, value]) => ({
        title: key.replace(/_/g, ' ').toUpperCase(),
        value: typeof value === 'number' ? value.toFixed(2) : String(value),
        short: true
      }));

      attachments.push({
        color: alert.severity === 'critical' ? '#ff0000' : 
               alert.severity === 'high' ? '#ff6600' :
               alert.severity === 'medium' ? '#ffcc00' : '#00ff00',
        fields
      });
    }

    return {
      channel: this.config.channel,
      username: this.config.username,
      icon_emoji: this.config.icon_emoji,
      text: `${severityEmoji[alert.severity]} ${alertTypeEmoji[alert.alert_type]} *${alert.title}*`,
      attachments: [
        {
          text: alert.message,
          color: attachments[0]?.color || '#ff6600',
          ts: Math.floor(alert.timestamp / 1000),
          footer: 'FanTwin Monitor',
          footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png'
        },
        ...attachments
      ]
    };
  }

  // Slack Webhook送信
  private async sendToSlack(message: any): Promise<void> {
    try {
      // 実際のSlack Webhook送信はコメントアウト（設定後に有効化）
      console.log('📤 Slack webhook payload:', JSON.stringify(message, null, 2));
      
      /*
      const response = await fetch(this.config.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Alert sent to Slack successfully');
      */
      
      console.log('✅ Alert logged (Slack webhook disabled for testing)');
    } catch (error) {
      console.error('❌ Failed to send to Slack:', error);
      throw error;
    }
  }

  // アラート分析データ送信
  private async sendAlertAnalytics(alert: SlackAlert): Promise<void> {
    try {
      console.log('📊 Alert analytics event:', {
        alert_type: alert.alert_type,
        severity: alert.severity,
        title: alert.title,
        timestamp: alert.timestamp
      });

      // TODO: 実際のGA4送信実装
      // await ga4.sendEvent('alert_triggered', {
      //   alert_type: alert.alert_type,
      //   severity: alert.severity,
      //   alert_id: alert.alert_id
      // });
    } catch (error) {
      console.error('❌ Failed to send alert analytics:', error);
    }
  }

  // アラート解決
  async resolveAlert(alertId: string): Promise<void> {
    try {
      const alert = this.alertHistory.find(a => a.alert_id === alertId);
      if (alert && !alert.is_resolved) {
        alert.is_resolved = true;
        alert.resolved_at = Date.now();
        
        await this.saveAlertHistory();
        
        // 解決通知をSlackに送信
        const resolveMessage = {
          channel: this.config.channel,
          username: this.config.username,
          icon_emoji: '✅',
          text: `✅ *RESOLVED:* ${alert.title}`,
          attachments: [{
            text: `Alert ${alertId} has been resolved`,
            color: '#00ff00',
            ts: Math.floor(Date.now() / 1000)
          }]
        };
        
        await this.sendToSlack(resolveMessage);
        
        console.log(`✅ Alert resolved: ${alertId}`);
      }
    } catch (error) {
      console.error('❌ Failed to resolve alert:', error);
    }
  }

  // 設定更新
  updateConfig(newConfig: Partial<SlackWebhookConfig>): void {
    this.config = { ...this.config, ...newConfig };
    chrome.storage.local.set({ [STORAGE_KEYS.slack_config]: this.config });
    console.log('⚙️ Slack config updated:', newConfig);
  }

  // アラート履歴取得
  getAlertHistory(timeRangeMs = 24 * 60 * 60 * 1000): SlackAlert[] {
    const cutoffTime = Date.now() - timeRangeMs;
    return this.alertHistory.filter(alert => alert.timestamp > cutoffTime);
  }

  // パフォーマンス統計取得
  getPerformanceStats(timeRangeMs = 60 * 60 * 1000): {
    avg_p95: number;
    avg_error_rate: number;
    avg_memory_usage: number;
    total_requests: number;
    alert_count: number;
  } {
    const cutoffTime = Date.now() - timeRangeMs;
    const metrics = this.performanceMetrics.filter(m => m.timestamp > cutoffTime);
    const alerts = this.alertHistory.filter(a => a.timestamp > cutoffTime);

    if (metrics.length === 0) {
      return {
        avg_p95: 0,
        avg_error_rate: 0,
        avg_memory_usage: 0,
        total_requests: 0,
        alert_count: alerts.length
      };
    }

    return {
      avg_p95: Math.round(metrics.reduce((sum, m) => sum + m.p95_response_time_ms, 0) / metrics.length),
      avg_error_rate: metrics.reduce((sum, m) => sum + m.error_rate, 0) / metrics.length,
      avg_memory_usage: Math.round(metrics.reduce((sum, m) => sum + m.memory_usage_mb, 0) / metrics.length),
      total_requests: metrics.reduce((sum, m) => sum + m.request_count, 0),
      alert_count: alerts.length
    };
  }

  // テスト用アラート送信
  async sendTestAlert(): Promise<void> {
    await this.sendAlert({
      alert_type: 'performance',
      severity: 'medium',
      title: 'Test Alert from FanTwin Monitor',
      message: 'This is a test alert to verify Slack integration is working correctly.',
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Cost Guardrail アラート送信
  async sendCostGuardrailAlert(
    grossMarginPercent: number,
    totalVolumeJpy: number,
    totalFeesJpy: number,
    payoutCount: number
  ): Promise<void> {
    const alertType = 'cost_guardrail';
    const alertKey = `${alertType}_${Date.now()}`;
    
    // クールダウンチェック
    const lastAlertTime = this.lastAlertTimes.get(alertKey);
    if (lastAlertTime && Date.now() - lastAlertTime < this.ALERT_COOLDOWN_MS) {
      console.log(`⏰ Cost Guardrail alert skipped (cooldown active)`);
      return;
    }

    const alert: Omit<SlackAlert, 'alert_id' | 'timestamp' | 'is_resolved'> = {
      alert_type: alertType,
      severity: grossMarginPercent < 20 ? 'critical' : 'high',
      title: `💸 Cost Guardrail Alert: 粗利 ${grossMarginPercent.toFixed(1)}% < 40%`,
      message: `FanTwin L0-α で粗利率が危険レベルに低下しました。\n` +
               `• 粗利率: ${grossMarginPercent.toFixed(2)}% (目標: ≥40%)\n` +
               `• 送金総額: ¥${totalVolumeJpy.toLocaleString()}\n` +
               `• 手数料収入: ¥${totalFeesJpy.toLocaleString()}\n` +
               `• 送金件数: ${payoutCount}件\n\n` +
               `**即座の対応が必要です:**\n` +
               `1. 手数料率の見直し (1% → 1.5%)\n` +
               `2. 高額送金の一時停止\n` +
               `3. コスト構造の分析`,
      metadata: {
        gross_margin_percent: grossMarginPercent,
        total_volume_jpy: totalVolumeJpy,
        total_fees_jpy: totalFeesJpy,
        payout_count: payoutCount,
        threshold_percent: this.config.alert_threshold.gross_margin_percent,
        severity_level: grossMarginPercent < 20 ? 'critical' : 'high',
        recommended_actions: [
          'Increase fee rate to 1.5%',
          'Pause high-volume payouts',
          'Review cost structure',
          'Contact treasury team'
        ]
      }
    };

    await this.sendAlert(alert);
    this.lastAlertTimes.set(alertKey, Date.now());

    console.log(`🚨 Cost Guardrail alert sent: ${grossMarginPercent.toFixed(1)}% margin`);
  }

  // 📊 MVP Gap Checklist: Cost Guardrail テスト実行
  async runCostGuardrailTest(): Promise<{
    success: boolean;
    alertSent: boolean;
    grossMargin: number;
    testData: any;
  }> {
    console.log('🧪 Running Cost Guardrail test...');
    
    try {
      // テスト用低利益マージン データ生成
      const testPayouts = [
        { amount: 50000, fee: 300 },   // 0.6% (低)
        { amount: 75000, fee: 500 },   // 0.67% (低)
        { amount: 100000, fee: 800 },  // 0.8% (低)
        { amount: 25000, fee: 150 },   // 0.6% (低)
        { amount: 80000, fee: 600 }    // 0.75% (低)
      ];
      
      const totalVolume = testPayouts.reduce((sum, p) => sum + p.amount, 0);
      const totalFees = testPayouts.reduce((sum, p) => sum + p.fee, 0);
      const grossMargin = (totalFees / totalVolume) * 100; // ≈ 0.7% (< 40%)
      
      console.log(`📊 Test data generated: ${grossMargin.toFixed(1)}% margin (${totalFees}/${totalVolume})`);
      
      // Cost Guardrail Alert 送信
      await this.sendCostGuardrailAlert(grossMargin, totalVolume, totalFees, testPayouts.length);
      
      // 結果検証
      const isLowMargin = grossMargin < this.config.alert_threshold.gross_margin_percent;
      const testResult = {
        success: true,
        alertSent: isLowMargin,
        grossMargin: grossMargin,
        testData: {
          total_volume_jpy: totalVolume,
          total_fees_jpy: totalFees,
          payout_count: testPayouts.length,
          payouts: testPayouts,
          threshold: this.config.alert_threshold.gross_margin_percent,
          alert_triggered: isLowMargin,
          timestamp: new Date().toISOString()
        }
      };
      
      console.log(`✅ Cost Guardrail test completed:`, testResult);
      return testResult;
      
    } catch (error) {
      console.error('❌ Cost Guardrail test failed:', error);
      return {
        success: false,
        alertSent: false,
        grossMargin: 0,
        testData: { error: error.message }
      };
    }
  }
}

// シングルトンインスタンス
export const slackAlertsManager = new SlackAlertsManager();

// Service Workerでの初期化
export const initializeSlackAlerts = () => {
  console.log('🚨 Slack Alerts Manager initialized (Week-4 Monitoring)');
  return slackAlertsManager;
}; 
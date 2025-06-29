// @implementation_plan.md Week-5: 不正防止
// 同一IP検出 + 同一クレジットカード検出 + 報酬取消処理 + 不正フラグ管理

export interface FraudCheck {
  check_id: string;
  user_id: string;
  check_type: 'ip_analysis' | 'payment_analysis' | 'behavior_analysis' | 'device_analysis';
  risk_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  fraud_detected: boolean;
  reasons: string[];
  details: Record<string, any>;
  checked_at: number;
  expires_at: number;
}

export interface FraudProfile {
  user_id: string;
  total_risk_score: number;
  fraud_flags: string[];
  ip_addresses: string[];
  device_fingerprints: string[];
  payment_methods: Array<{
    type: 'credit_card' | 'paypal' | 'bank_transfer';
    last4?: string;
    fingerprint?: string;
    is_flagged: boolean;
  }>;
  suspicious_activities: Array<{
    activity_type: string;
    description: string;
    detected_at: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  account_status: 'clean' | 'suspicious' | 'flagged' | 'banned';
  created_at: number;
  last_updated: number;
}

export interface FraudRule {
  rule_id: string;
  rule_name: string;
  rule_type: 'ip_limit' | 'velocity_check' | 'pattern_match' | 'behavioral';
  is_active: boolean;
  threshold: number;
  action: 'flag' | 'block' | 'review' | 'cancel_rewards';
  description: string;
  created_at: number;
}

export interface PaymentFraudData {
  payment_id: string;
  user_id: string;
  payment_method_fingerprint: string;
  billing_address_hash: string;
  device_fingerprint: string;
  ip_address: string;
  amount: number;
  currency: string;
  timestamp: number;
  is_flagged: boolean;
  fraud_reasons: string[];
}

const STORAGE_KEYS = {
  fraud_profiles: 'fantwin_fraud_profiles',
  fraud_checks: 'fantwin_fraud_checks',
  fraud_rules: 'fantwin_fraud_rules',
  payment_fraud_data: 'fantwin_payment_fraud_data',
  fraud_settings: 'fantwin_fraud_settings'
} as const;

const FRAUD_CONFIG = {
  max_ip_registrations: 3, // 同一IPから最大3回まで
  max_velocity_per_hour: 5, // 1時間に最大5回のアクション
  high_risk_threshold: 75, // リスクスコア75以上で高リスク
  critical_risk_threshold: 90, // リスクスコア90以上で自動ブロック
  device_fingerprint_match_threshold: 0.8,
  payment_fingerprint_similarity: 0.9,
  auto_block_on_critical: true,
  reward_cancellation_threshold: 60
} as const;

// デフォルト不正検出ルール
const DEFAULT_FRAUD_RULES: FraudRule[] = [
  {
    rule_id: 'rule_ip_limit',
    rule_name: 'IP Address Registration Limit',
    rule_type: 'ip_limit',
    is_active: true,
    threshold: FRAUD_CONFIG.max_ip_registrations,
    action: 'flag',
    description: 'Flag users registering from the same IP address',
    created_at: Date.now()
  },
  {
    rule_id: 'rule_velocity_check',
    rule_name: 'High Velocity Detection',
    rule_type: 'velocity_check',
    is_active: true,
    threshold: FRAUD_CONFIG.max_velocity_per_hour,
    action: 'review',
    description: 'Detect unusually high activity velocity',
    created_at: Date.now()
  },
  {
    rule_id: 'rule_payment_duplicate',
    rule_name: 'Duplicate Payment Method Detection',
    rule_type: 'pattern_match',
    is_active: true,
    threshold: 1,
    action: 'flag',
    description: 'Detect duplicate payment methods across accounts',
    created_at: Date.now()
  },
  {
    rule_id: 'rule_self_referral',
    rule_name: 'Self Referral Detection',
    rule_type: 'behavioral',
    is_active: true,
    threshold: 1,
    action: 'cancel_rewards',
    description: 'Detect and prevent self-referral attempts',
    created_at: Date.now()
  }
];

export class FraudManager {
  private fraudProfiles: Map<string, FraudProfile> = new Map();
  private fraudChecks: Map<string, FraudCheck> = new Map();
  private fraudRules: Map<string, FraudRule> = new Map();
  private paymentFraudData: Map<string, PaymentFraudData> = new Map();

  constructor() {
    this.loadFraudData();
    this.initializeDefaultRules();
    this.setupCleanupInterval();
  }

  // 包括的不正検出チェック
  async performFraudCheck(
    userId: string,
    context: {
      ip_address?: string;
      user_agent?: string;
      device_fingerprint?: string;
      referral_info?: any;
      payment_info?: any;
    }
  ): Promise<{
    fraud_detected: boolean;
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    checks: FraudCheck[];
    recommended_action: 'allow' | 'review' | 'block' | 'cancel_rewards';
  }> {
    try {
      const checks: FraudCheck[] = [];
      let totalRiskScore = 0;

      // 1. IP Address Analysis
      if (context.ip_address) {
        const ipCheck = await this.performIPAnalysis(userId, context.ip_address);
        checks.push(ipCheck);
        totalRiskScore += ipCheck.risk_score;
      }

      // 2. Payment Method Analysis
      if (context.payment_info) {
        const paymentCheck = await this.performPaymentAnalysis(userId, context.payment_info);
        checks.push(paymentCheck);
        totalRiskScore += paymentCheck.risk_score;
      }

      // 3. Behavioral Analysis
      const behaviorCheck = await this.performBehaviorAnalysis(userId, context);
      checks.push(behaviorCheck);
      totalRiskScore += behaviorCheck.risk_score;

      // 4. Device Analysis
      if (context.device_fingerprint) {
        const deviceCheck = await this.performDeviceAnalysis(userId, context.device_fingerprint);
        checks.push(deviceCheck);
        totalRiskScore += deviceCheck.risk_score;
      }

      // 平均リスクスコア計算
      const averageRiskScore = checks.length > 0 ? totalRiskScore / checks.length : 0;

      // リスクレベル判定
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (averageRiskScore >= FRAUD_CONFIG.critical_risk_threshold) {
        riskLevel = 'critical';
      } else if (averageRiskScore >= FRAUD_CONFIG.high_risk_threshold) {
        riskLevel = 'high';
      } else if (averageRiskScore >= 40) {
        riskLevel = 'medium';
      }

      // 不正検出判定
      const fraudDetected = checks.some(check => check.fraud_detected) || 
                           averageRiskScore >= FRAUD_CONFIG.high_risk_threshold;

      // 推奨アクション決定
      let recommendedAction: 'allow' | 'review' | 'block' | 'cancel_rewards' = 'allow';
      if (riskLevel === 'critical') {
        recommendedAction = 'block';
      } else if (riskLevel === 'high') {
        recommendedAction = 'cancel_rewards';
      } else if (riskLevel === 'medium') {
        recommendedAction = 'review';
      }

      // Fraud Profileの更新
      await this.updateFraudProfile(userId, checks, averageRiskScore);

      // すべてのチェックを保存
      for (const check of checks) {
        this.fraudChecks.set(check.check_id, check);
      }

      await this.saveFraudData();

      console.log(`🔍 Fraud check completed for user ${userId}: Risk ${averageRiskScore.toFixed(1)}, Level ${riskLevel}, Action ${recommendedAction}`);

      // GA4イベント送信
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'SEND_GA4_EVENT',
          eventName: 'fraud_check_completed',
          parameters: {
            user_id: userId,
            fraud_detected: fraudDetected,
            risk_score: Math.round(averageRiskScore),
            risk_level: riskLevel,
            checks_count: checks.length,
            recommended_action: recommendedAction
          }
        });
      }

      return {
        fraud_detected: fraudDetected,
        risk_score: averageRiskScore,
        risk_level: riskLevel,
        checks: checks,
        recommended_action: recommendedAction
      };

    } catch (error) {
      console.error('❌ Fraud check failed:', error);
      return {
        fraud_detected: false,
        risk_score: 0,
        risk_level: 'low',
        checks: [],
        recommended_action: 'allow'
      };
    }
  }

  // IP アドレス分析
  private async performIPAnalysis(userId: string, ipAddress: string): Promise<FraudCheck> {
    try {
      let riskScore = 0;
      const reasons: string[] = [];
      const details: Record<string, any> = { ip_address: ipAddress };

      // 同一IP登録数チェック
      const ipRegistrationCount = Array.from(this.fraudProfiles.values())
        .filter(profile => profile.ip_addresses.includes(ipAddress)).length;

      details.ip_registration_count = ipRegistrationCount;

      if (ipRegistrationCount >= FRAUD_CONFIG.max_ip_registrations) {
        riskScore += 40;
        reasons.push(`IP address used for ${ipRegistrationCount} registrations`);
      } else if (ipRegistrationCount >= 2) {
        riskScore += 20;
        reasons.push(`IP address used for ${ipRegistrationCount} registrations`);
      }

      // 既知の不正IPチェック (今後外部APIと連携)
      const isKnownFraudIP = await this.checkKnownFraudIP(ipAddress);
      if (isKnownFraudIP) {
        riskScore += 60;
        reasons.push('IP address flagged in fraud database');
        details.known_fraud_ip = true;
      }

      // VPN/Proxy検出 (簡易実装)
      const isVPNProxy = await this.detectVPNProxy(ipAddress);
      if (isVPNProxy) {
        riskScore += 30;
        reasons.push('VPN or proxy detected');
        details.vpn_proxy_detected = true;
      }

      const checkId = `check_ip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        check_id: checkId,
        user_id: userId,
        check_type: 'ip_analysis',
        risk_score: Math.min(riskScore, 100),
        risk_level: riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
        fraud_detected: riskScore >= 50,
        reasons: reasons,
        details: details,
        checked_at: Date.now(),
        expires_at: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30日後
      };

    } catch (error) {
      console.error('❌ IP analysis failed:', error);
      return this.createEmptyCheck(userId, 'ip_analysis');
    }
  }

  // 決済方法分析
  private async performPaymentAnalysis(userId: string, paymentInfo: any): Promise<FraudCheck> {
    try {
      let riskScore = 0;
      const reasons: string[] = [];
      const details: Record<string, any> = { payment_info: paymentInfo };

      if (!paymentInfo) {
        return this.createEmptyCheck(userId, 'payment_analysis');
      }

      const paymentFingerprint = this.generatePaymentFingerprint(paymentInfo);
      details.payment_fingerprint = paymentFingerprint;

      // 同一決済方法の重複使用チェック
      const duplicatePayments = Array.from(this.paymentFraudData.values())
        .filter(data => data.payment_method_fingerprint === paymentFingerprint && data.user_id !== userId);

      if (duplicatePayments.length > 0) {
        riskScore += 50;
        reasons.push(`Payment method used by ${duplicatePayments.length} other accounts`);
        details.duplicate_payment_count = duplicatePayments.length;
      }

      // 異常な支払いパターンチェック
      const userPayments = Array.from(this.paymentFraudData.values())
        .filter(data => data.user_id === userId);

      if (userPayments.length > 5) {
        const recentPayments = userPayments.filter(
          payment => Date.now() - payment.timestamp < 24 * 60 * 60 * 1000 // 24時間以内
        );

        if (recentPayments.length > 3) {
          riskScore += 30;
          reasons.push(`${recentPayments.length} payments in 24 hours`);
          details.recent_payment_count = recentPayments.length;
        }
      }

      // 支払い金額分析
      if (paymentInfo.amount && typeof paymentInfo.amount === 'number') {
        const averagePayment = userPayments.length > 0 
          ? userPayments.reduce((sum, p) => sum + p.amount, 0) / userPayments.length 
          : paymentInfo.amount;

        const amountDeviation = Math.abs(paymentInfo.amount - averagePayment) / averagePayment;
        if (amountDeviation > 3) { // 3倍以上の差
          riskScore += 20;
          reasons.push('Unusual payment amount detected');
          details.amount_deviation = amountDeviation;
        }
      }

      const checkId = `check_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        check_id: checkId,
        user_id: userId,
        check_type: 'payment_analysis',
        risk_score: Math.min(riskScore, 100),
        risk_level: riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
        fraud_detected: riskScore >= 50,
        reasons: reasons,
        details: details,
        checked_at: Date.now(),
        expires_at: Date.now() + (90 * 24 * 60 * 60 * 1000) // 90日後
      };

    } catch (error) {
      console.error('❌ Payment analysis failed:', error);
      return this.createEmptyCheck(userId, 'payment_analysis');
    }
  }

  // 行動分析
  private async performBehaviorAnalysis(userId: string, context: any): Promise<FraudCheck> {
    try {
      let riskScore = 0;
      const reasons: string[] = [];
      const details: Record<string, any> = { context: context };

      // 自己招待チェック
      if (context.referral_info) {
        const { referrer_user_id, referred_user_id } = context.referral_info;
        if (referrer_user_id === referred_user_id || referrer_user_id === userId) {
          riskScore += 80;
          reasons.push('Self-referral attempt detected');
          details.self_referral = true;
        }
      }

      // 高速度行動パターンチェック
      const recentChecks = Array.from(this.fraudChecks.values())
        .filter(check => 
          check.user_id === userId && 
          Date.now() - check.checked_at < 60 * 60 * 1000 // 1時間以内
        );

      if (recentChecks.length > FRAUD_CONFIG.max_velocity_per_hour) {
        riskScore += 40;
        reasons.push(`High velocity: ${recentChecks.length} actions in 1 hour`);
        details.velocity_count = recentChecks.length;
      }

      // 時間パターン分析 (深夜/早朝の異常活動)
      const currentHour = new Date().getHours();
      if (currentHour >= 2 && currentHour <= 5) {
        riskScore += 10;
        reasons.push('Activity during unusual hours');
        details.unusual_hour = currentHour;
      }

      // User Agent パターンチェック
      if (context.user_agent) {
        const suspiciousUA = this.analyzeSuspiciousUserAgent(context.user_agent);
        if (suspiciousUA.is_suspicious) {
          riskScore += suspiciousUA.risk_score;
          reasons.push(`Suspicious user agent: ${suspiciousUA.reason}`);
          details.user_agent_analysis = suspiciousUA;
        }
      }

      const checkId = `check_behavior_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        check_id: checkId,
        user_id: userId,
        check_type: 'behavior_analysis',
        risk_score: Math.min(riskScore, 100),
        risk_level: riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
        fraud_detected: riskScore >= 50,
        reasons: reasons,
        details: details,
        checked_at: Date.now(),
        expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7日後
      };

    } catch (error) {
      console.error('❌ Behavior analysis failed:', error);
      return this.createEmptyCheck(userId, 'behavior_analysis');
    }
  }

  // デバイス分析
  private async performDeviceAnalysis(userId: string, deviceFingerprint: string): Promise<FraudCheck> {
    try {
      let riskScore = 0;
      const reasons: string[] = [];
      const details: Record<string, any> = { device_fingerprint: deviceFingerprint };

      // 同一デバイスの複数アカウント使用チェック
      const deviceUsageCount = Array.from(this.fraudProfiles.values())
        .filter(profile => profile.device_fingerprints.includes(deviceFingerprint)).length;

      details.device_usage_count = deviceUsageCount;

      if (deviceUsageCount > 3) {
        riskScore += 50;
        reasons.push(`Device used by ${deviceUsageCount} accounts`);
      } else if (deviceUsageCount > 1) {
        riskScore += 25;
        reasons.push(`Device used by ${deviceUsageCount} accounts`);
      }

      const checkId = `check_device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        check_id: checkId,
        user_id: userId,
        check_type: 'device_analysis',
        risk_score: Math.min(riskScore, 100),
        risk_level: riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
        fraud_detected: riskScore >= 40,
        reasons: reasons,
        details: details,
        checked_at: Date.now(),
        expires_at: Date.now() + (60 * 24 * 60 * 60 * 1000) // 60日後
      };

    } catch (error) {
      console.error('❌ Device analysis failed:', error);
      return this.createEmptyCheck(userId, 'device_analysis');
    }
  }

  // 報酬取消処理
  async cancelRewards(
    userId: string,
    reason: string,
    relatedData?: any
  ): Promise<{ success: boolean; cancelled_amount: number; affected_transactions: string[] }> {
    try {
      console.log(`🚫 Cancelling rewards for user ${userId}: ${reason}`);

      // TODO: RewardManagerと連携して報酬取消
      // const rewardManager = getRewardManager();
      // const result = await rewardManager.cancelUserRewards(userId, reason);

      // 模擬的な実装
      const cancelledAmount = 5000; // 標準的な招待報酬額
      const affectedTransactions = [`tx_${userId}_cancelled_${Date.now()}`];

      // Fraud Profileの更新
      const profile = await this.getFraudProfile(userId);
      profile.suspicious_activities.push({
        activity_type: 'reward_cancellation',
        description: `Rewards cancelled: ${reason}`,
        detected_at: Date.now(),
        severity: 'high'
      });
      profile.account_status = 'flagged';
      
      this.fraudProfiles.set(userId, profile);
      await this.saveFraudData();

      console.log(`✅ Rewards cancelled: ${cancelledAmount} tokens for user ${userId}`);

      // GA4イベント送信
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'SEND_GA4_EVENT',
          eventName: 'rewards_cancelled',
          parameters: {
            user_id: userId,
            reason: reason,
            cancelled_amount: cancelledAmount,
            affected_transactions_count: affectedTransactions.length
          }
        });
      }

      return {
        success: true,
        cancelled_amount: cancelledAmount,
        affected_transactions: affectedTransactions
      };

    } catch (error) {
      console.error('❌ Failed to cancel rewards:', error);
      return {
        success: false,
        cancelled_amount: 0,
        affected_transactions: []
      };
    }
  }

  // Fraud Profile 更新
  private async updateFraudProfile(userId: string, checks: FraudCheck[], riskScore: number): Promise<void> {
    try {
      let profile = this.fraudProfiles.get(userId);
      
      if (!profile) {
        profile = {
          user_id: userId,
          total_risk_score: 0,
          fraud_flags: [],
          ip_addresses: [],
          device_fingerprints: [],
          payment_methods: [],
          suspicious_activities: [],
          account_status: 'clean',
          created_at: Date.now(),
          last_updated: Date.now()
        };
      }

      // リスクスコア更新
      profile.total_risk_score = riskScore;
      profile.last_updated = Date.now();

      // IP アドレス追加
      for (const check of checks) {
        if (check.check_type === 'ip_analysis' && check.details.ip_address) {
          if (!profile.ip_addresses.includes(check.details.ip_address)) {
            profile.ip_addresses.push(check.details.ip_address);
          }
        }

        // デバイスフィンガープリント追加
        if (check.check_type === 'device_analysis' && check.details.device_fingerprint) {
          if (!profile.device_fingerprints.includes(check.details.device_fingerprint)) {
            profile.device_fingerprints.push(check.details.device_fingerprint);
          }
        }

        // 不正フラグ追加
        if (check.fraud_detected) {
          const flagDescription = `${check.check_type}: ${check.reasons.join(', ')}`;
          if (!profile.fraud_flags.includes(flagDescription)) {
            profile.fraud_flags.push(flagDescription);
          }
        }
      }

      // アカウントステータス更新
      if (riskScore >= FRAUD_CONFIG.critical_risk_threshold) {
        profile.account_status = 'banned';
      } else if (riskScore >= FRAUD_CONFIG.high_risk_threshold) {
        profile.account_status = 'flagged';
      } else if (riskScore >= 40) {
        profile.account_status = 'suspicious';
      }

      this.fraudProfiles.set(userId, profile);

    } catch (error) {
      console.error('❌ Failed to update fraud profile:', error);
    }
  }

  // ヘルパーメソッド
  private async checkKnownFraudIP(ipAddress: string): Promise<boolean> {
    // TODO: 外部不正IP データベースとの連携
    // 現在は簡易的な実装
    const knownFraudIPs = ['192.168.1.100', '10.0.0.1']; // テスト用
    return knownFraudIPs.includes(ipAddress);
  }

  private async detectVPNProxy(ipAddress: string): Promise<boolean> {
    // TODO: VPN/Proxy検出サービスとの連携
    // 簡易的な実装
    return ipAddress.startsWith('10.') || ipAddress.startsWith('192.168.');
  }

  private generatePaymentFingerprint(paymentInfo: any): string {
    // 決済方法の固有フィンガープリント生成
    const parts = [
      paymentInfo.type || 'unknown',
      paymentInfo.last4 || '',
      paymentInfo.exp_month || '',
      paymentInfo.exp_year || '',
      paymentInfo.billing_country || ''
    ];
    return btoa(parts.join('|'));
  }

  private analyzeSuspiciousUserAgent(userAgent: string): { 
    is_suspicious: boolean; 
    risk_score: number; 
    reason: string 
  } {
    if (!userAgent || userAgent.length < 10) {
      return { is_suspicious: true, risk_score: 30, reason: 'Missing or too short user agent' };
    }

    // ボット的なパターンチェック
    const botPatterns = ['bot', 'crawler', 'spider', 'scraper', 'automated'];
    for (const pattern of botPatterns) {
      if (userAgent.toLowerCase().includes(pattern)) {
        return { is_suspicious: true, risk_score: 50, reason: 'Bot-like user agent detected' };
      }
    }

    // 異常に長いUser Agent
    if (userAgent.length > 500) {
      return { is_suspicious: true, risk_score: 20, reason: 'Unusually long user agent' };
    }

    return { is_suspicious: false, risk_score: 0, reason: '' };
  }

  private createEmptyCheck(userId: string, checkType: FraudCheck['check_type']): FraudCheck {
    return {
      check_id: `check_${checkType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      check_type: checkType,
      risk_score: 0,
      risk_level: 'low',
      fraud_detected: false,
      reasons: [],
      details: {},
      checked_at: Date.now(),
      expires_at: Date.now() + (24 * 60 * 60 * 1000)
    };
  }

  // 公開メソッド
  async getFraudProfile(userId: string): Promise<FraudProfile> {
    let profile = this.fraudProfiles.get(userId);
    
    if (!profile) {
      profile = {
        user_id: userId,
        total_risk_score: 0,
        fraud_flags: [],
        ip_addresses: [],
        device_fingerprints: [],
        payment_methods: [],
        suspicious_activities: [],
        account_status: 'clean',
        created_at: Date.now(),
        last_updated: Date.now()
      };
      
      this.fraudProfiles.set(userId, profile);
      await this.saveFraudData();
    }

    return profile;
  }

  // デフォルトルール初期化
  private initializeDefaultRules(): void {
    for (const rule of DEFAULT_FRAUD_RULES) {
      if (!this.fraudRules.has(rule.rule_id)) {
        this.fraudRules.set(rule.rule_id, rule);
      }
    }
  }

  // クリーンアップ処理
  private setupCleanupInterval(): void {
    // 30日ごとに期限切れチェックを削除
    setInterval(() => {
      this.cleanupExpiredChecks();
    }, 24 * 60 * 60 * 1000); // 1日ごとに実行
  }

  private async cleanupExpiredChecks(): Promise<void> {
    const now = Date.now();
    let deletedCount = 0;

    for (const [checkId, check] of this.fraudChecks.entries()) {
      if (check.expires_at < now) {
        this.fraudChecks.delete(checkId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      await this.saveFraudData();
      console.log(`🧹 Cleaned up ${deletedCount} expired fraud checks`);
    }
  }

  // データ管理
  private async loadFraudData(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([
          STORAGE_KEYS.fraud_profiles,
          STORAGE_KEYS.fraud_checks,
          STORAGE_KEYS.fraud_rules,
          STORAGE_KEYS.payment_fraud_data
        ]);

        if (result[STORAGE_KEYS.fraud_profiles]) {
          this.fraudProfiles = new Map(Object.entries(result[STORAGE_KEYS.fraud_profiles]));
        }

        if (result[STORAGE_KEYS.fraud_checks]) {
          this.fraudChecks = new Map(Object.entries(result[STORAGE_KEYS.fraud_checks]));
        }

        if (result[STORAGE_KEYS.fraud_rules]) {
          this.fraudRules = new Map(Object.entries(result[STORAGE_KEYS.fraud_rules]));
        }

        if (result[STORAGE_KEYS.payment_fraud_data]) {
          this.paymentFraudData = new Map(Object.entries(result[STORAGE_KEYS.payment_fraud_data]));
        }
      }
    } catch (error) {
      console.error('❌ Failed to load fraud data:', error);
    }
  }

  private async saveFraudData(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.fraud_profiles]: Object.fromEntries(this.fraudProfiles),
          [STORAGE_KEYS.fraud_checks]: Object.fromEntries(this.fraudChecks),
          [STORAGE_KEYS.fraud_rules]: Object.fromEntries(this.fraudRules),
          [STORAGE_KEYS.payment_fraud_data]: Object.fromEntries(this.paymentFraudData)
        });
      }
    } catch (error) {
      console.error('❌ Failed to save fraud data:', error);
    }
  }
}

// シングルトンインスタンス
let fraudManagerInstance: FraudManager | null = null;

export const getFraudManager = (): FraudManager => {
  if (!fraudManagerInstance) {
    fraudManagerInstance = new FraudManager();
  }
  return fraudManagerInstance;
};

export const initializeFraudManager = () => {
  console.log('🛡️ Initializing Fraud Manager...');
  const manager = getFraudManager();
  console.log('✅ Fraud Manager initialized');
  return manager;
};
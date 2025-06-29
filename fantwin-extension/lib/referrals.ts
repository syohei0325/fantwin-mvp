// @implementation_plan.md Week-5: Referral システム
// 32桁slug生成 + ユニーク性チェック + QRコード + SNS共有ボタン

export interface ReferralLink {
  referral_id: string;
  referrer_user_id: string;
  slug: string; // 32桁のユニークスラッグ
  full_url: string;
  qr_code_data: string;
  created_at: number;
  expires_at: number;
  is_active: boolean;
  usage_count: number;
  max_usage: number;
  description?: string;
}

export interface ReferralUsage {
  usage_id: string;
  referral_id: string;
  referred_user_id: string;
  referrer_user_id: string;
  ip_address: string;
  user_agent: string;
  registration_timestamp: number;
  reward_granted: boolean;
  reward_amount_tokens: number;
  fraud_detected: boolean;
  fraud_reason?: string;
}

export interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  total_rewards_earned: number;
  current_month_referrals: number;
  monthly_limit_remaining: number;
  success_rate: number;
  top_performing_links: ReferralLink[];
}

export interface SNSShareOption {
  platform: 'twitter' | 'facebook' | 'line' | 'email' | 'copy';
  share_url: string;
  share_text: string;
  icon_emoji: string;
}

const STORAGE_KEYS = {
  referral_links: 'fantwin_referral_links',
  referral_usage: 'fantwin_referral_usage',
  referral_stats: 'fantwin_referral_stats'
} as const;

const REFERRAL_CONFIG = {
  slug_length: 32,
  max_monthly_referrals: 10, // @implementation_plan.md: 月10回まで
  reward_amount_tokens: 5000, // +5k tok
  link_expiry_days: 30,
  base_url: 'https://fantwin.app/ref/'
} as const;

export class ReferralManager {
  private referralLinks: Map<string, ReferralLink> = new Map();
  private referralUsage: Map<string, ReferralUsage> = new Map();
  private referralStats: ReferralStats = {
    total_referrals: 0,
    successful_referrals: 0,
    pending_referrals: 0,
    total_rewards_earned: 0,
    current_month_referrals: 0,
    monthly_limit_remaining: REFERRAL_CONFIG.max_monthly_referrals,
    success_rate: 0,
    top_performing_links: []
  };

  constructor() {
    this.loadReferralData();
    this.setupMonthlyReset();
  }

  // 32桁ユニークslug生成
  async generateReferralLink(
    userId: string, 
    description?: string,
    customExpiry?: number
  ): Promise<ReferralLink> {
    try {
      // 月次上限チェック
      if (this.referralStats.monthly_limit_remaining <= 0) {
        throw new Error('Monthly referral limit exceeded');
      }

      // 32桁slug生成（ユニーク性保証）
      const slug = await this.generateUniqueSlug();
      const referralId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const fullUrl = `${REFERRAL_CONFIG.base_url}${slug}`;
      const expiresAt = customExpiry || (Date.now() + (REFERRAL_CONFIG.link_expiry_days * 24 * 60 * 60 * 1000));
      
      // QRコードデータ生成
      const qrCodeData = await this.generateQRCode(fullUrl);

      const referralLink: ReferralLink = {
        referral_id: referralId,
        referrer_user_id: userId,
        slug: slug,
        full_url: fullUrl,
        qr_code_data: qrCodeData,
        created_at: Date.now(),
        expires_at: expiresAt,
        is_active: true,
        usage_count: 0,
        max_usage: 50, // 1リンクあたり最大50人まで
        description: description
      };

      this.referralLinks.set(referralId, referralLink);
      await this.saveReferralData();

      // 統計更新
      this.referralStats.total_referrals += 1;
      this.referralStats.monthly_limit_remaining -= 1;
      await this.saveStats();

      console.log(`🔗 Referral link generated: ${slug}`);
      
      // GA4イベント送信
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'SEND_GA4_EVENT',
          eventName: 'referral_link_generated',
          parameters: {
            referral_id: referralId,
            slug: slug,
            expires_at: expiresAt,
            description: description || 'default'
          }
        });
      }

      return referralLink;

    } catch (error) {
      console.error('❌ Failed to generate referral link:', error);
      throw error;
    }
  }

  // 32桁ユニークslug生成
  private async generateUniqueSlug(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // 32桁slug生成 (URLsafe文字のみ使用)
      const slug = this.generateSlug(REFERRAL_CONFIG.slug_length);
      
      // ユニーク性チェック
      const isUnique = await this.checkSlugUniqueness(slug);
      if (isUnique) {
        return slug;
      }
      
      attempts++;
    }

    throw new Error(`Failed to generate unique slug after ${maxAttempts} attempts`);
  }

  // Slug生成 (32桁)
  private generateSlug(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // Slugユニーク性チェック
  private async checkSlugUniqueness(slug: string): Promise<boolean> {
    // ローカルストレージチェック
    for (const link of this.referralLinks.values()) {
      if (link.slug === slug) {
        return false;
      }
    }

    // TODO: 実際の実装では外部APIでグローバルユニーク性をチェック
    return true;
  }

  // QRコード生成（Base64データ）
  private async generateQRCode(url: string): Promise<string> {
    try {
      // シンプルなQRコード風データ生成（実際の実装ではQRコードライブラリを使用）
      const qrData = `data:image/svg+xml;base64,${btoa(`
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="white"/>
          <text x="100" y="100" text-anchor="middle" font-size="12" fill="black">
            QR: ${url.substring(0, 20)}...
          </text>
        </svg>
      `)}`;

      return qrData;
    } catch (error) {
      console.error('❌ QR code generation failed:', error);
      return '';
    }
  }

  // SNS共有オプション生成
  generateSNSShareOptions(referralLink: ReferralLink): SNSShareOption[] {
    const shareText = `🚀 FanTwinでクリエイター活動を効率化！招待リンクから登録すると、お互いに5,000トークンがもらえます！`;
    const shareUrl = referralLink.full_url;

    return [
      {
        platform: 'twitter',
        share_url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
        share_text: shareText,
        icon_emoji: '🐦'
      },
      {
        platform: 'facebook',
        share_url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        share_text: shareText,
        icon_emoji: '📘'
      },
      {
        platform: 'line',
        share_url: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
        share_text: shareText,
        icon_emoji: '💬'
      },
      {
        platform: 'email',
        share_url: `mailto:?subject=${encodeURIComponent('FanTwin招待リンク')}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
        share_text: shareText,
        icon_emoji: '📧'
      },
      {
        platform: 'copy',
        share_url: shareUrl,
        share_text: shareText,
        icon_emoji: '📋'
      }
    ];
  }

  // Referral使用記録
  async recordReferralUsage(
    slug: string,
    newUserId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ success: boolean; reward_granted: boolean; message: string }> {
    try {
      // Referralリンク検索
      const referralLink = this.findReferralBySlug(slug);
      if (!referralLink) {
        return { success: false, reward_granted: false, message: 'Invalid referral link' };
      }

      // 有効性チェック
      if (!referralLink.is_active || Date.now() > referralLink.expires_at) {
        return { success: false, reward_granted: false, message: 'Referral link expired' };
      }

      // 使用上限チェック
      if (referralLink.usage_count >= referralLink.max_usage) {
        return { success: false, reward_granted: false, message: 'Referral link usage limit exceeded' };
      }

      // 不正検出チェック
      const fraudCheck = await this.detectFraud(newUserId, ipAddress, userAgent, referralLink.referrer_user_id);
      
      const usageId = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const usage: ReferralUsage = {
        usage_id: usageId,
        referral_id: referralLink.referral_id,
        referred_user_id: newUserId,
        referrer_user_id: referralLink.referrer_user_id,
        ip_address: ipAddress,
        user_agent: userAgent,
        registration_timestamp: Date.now(),
        reward_granted: !fraudCheck.fraud_detected,
        reward_amount_tokens: fraudCheck.fraud_detected ? 0 : REFERRAL_CONFIG.reward_amount_tokens,
        fraud_detected: fraudCheck.fraud_detected,
        fraud_reason: fraudCheck.reason
      };

      this.referralUsage.set(usageId, usage);

      // Referralリンク使用回数更新
      referralLink.usage_count += 1;
      this.referralLinks.set(referralLink.referral_id, referralLink);

      // 統計更新
      if (!fraudCheck.fraud_detected) {
        this.referralStats.successful_referrals += 1;
        this.referralStats.total_rewards_earned += REFERRAL_CONFIG.reward_amount_tokens * 2; // 招待者+被招待者
      }

      await this.saveReferralData();
      await this.saveStats();

      console.log(`🎉 Referral usage recorded: ${usageId}, fraud: ${fraudCheck.fraud_detected}`);

      // GA4イベント送信
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'SEND_GA4_EVENT',
          eventName: 'referral_usage_recorded',
          parameters: {
            usage_id: usageId,
            referral_id: referralLink.referral_id,
            reward_granted: usage.reward_granted,
            fraud_detected: fraudCheck.fraud_detected,
            reward_amount: usage.reward_amount_tokens
          }
        });
      }

      return {
        success: true,
        reward_granted: !fraudCheck.fraud_detected,
        message: fraudCheck.fraud_detected 
          ? `Registration recorded but no reward granted: ${fraudCheck.reason}`
          : 'Referral successful! Rewards granted to both users.'
      };

    } catch (error) {
      console.error('❌ Failed to record referral usage:', error);
      return { success: false, reward_granted: false, message: 'Internal error' };
    }
  }

  // 不正検出エンジン
  private async detectFraud(
    newUserId: string,
    ipAddress: string,
    userAgent: string,
    referrerUserId: string
  ): Promise<{ fraud_detected: boolean; reason?: string }> {
    
    // 自己招待チェック
    if (newUserId === referrerUserId) {
      return { fraud_detected: true, reason: 'Self-referral detected' };
    }

    // 同一IP複数使用チェック
    const ipUsageCount = Array.from(this.referralUsage.values())
      .filter(usage => usage.ip_address === ipAddress).length;
    
    if (ipUsageCount >= 3) {
      return { fraud_detected: true, reason: 'Multiple registrations from same IP' };
    }

    // 同一ユーザー重複招待チェック
    const userReferralCount = Array.from(this.referralUsage.values())
      .filter(usage => usage.referred_user_id === newUserId).length;
    
    if (userReferralCount > 0) {
      return { fraud_detected: true, reason: 'User already referred' };
    }

    // UserAgent異常パターンチェック
    if (!userAgent || userAgent.length < 20) {
      return { fraud_detected: true, reason: 'Suspicious user agent' };
    }

    // 短時間大量登録チェック
    const recentRegistrations = Array.from(this.referralUsage.values())
      .filter(usage => 
        usage.referrer_user_id === referrerUserId && 
        Date.now() - usage.registration_timestamp < 60000 // 1分以内
      ).length;
    
    if (recentRegistrations >= 3) {
      return { fraud_detected: true, reason: 'Too many registrations in short time' };
    }

    return { fraud_detected: false };
  }

  // Slug検索
  private findReferralBySlug(slug: string): ReferralLink | null {
    for (const link of this.referralLinks.values()) {
      if (link.slug === slug && link.is_active) {
        return link;
      }
    }
    return null;
  }

  // 月次リセット機能
  private setupMonthlyReset(): void {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const msUntilReset = nextMonth.getTime() - now.getTime();

    setTimeout(() => {
      this.resetMonthlyLimits();
      // 毎月1日にリセット
      setInterval(() => this.resetMonthlyLimits(), 30 * 24 * 60 * 60 * 1000);
    }, msUntilReset);

    console.log(`📅 Monthly referral reset scheduled in ${Math.round(msUntilReset / 1000 / 60 / 60)} hours`);
  }

  // 月次制限リセット
  private async resetMonthlyLimits(): Promise<void> {
    console.log('🔄 Resetting monthly referral limits...');
    
    this.referralStats.current_month_referrals = 0;
    this.referralStats.monthly_limit_remaining = REFERRAL_CONFIG.max_monthly_referrals;
    
    await this.saveStats();
    console.log('✅ Monthly referral limits reset completed');
  }

  // データ読み込み
  private async loadReferralData(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([
          STORAGE_KEYS.referral_links,
          STORAGE_KEYS.referral_usage,
          STORAGE_KEYS.referral_stats
        ]);

        if (result[STORAGE_KEYS.referral_links]) {
          this.referralLinks = new Map(Object.entries(result[STORAGE_KEYS.referral_links]));
        }

        if (result[STORAGE_KEYS.referral_usage]) {
          this.referralUsage = new Map(Object.entries(result[STORAGE_KEYS.referral_usage]));
        }

        if (result[STORAGE_KEYS.referral_stats]) {
          this.referralStats = { ...this.referralStats, ...result[STORAGE_KEYS.referral_stats] };
        }
      }
    } catch (error) {
      console.error('❌ Failed to load referral data:', error);
    }
  }

  // データ保存
  private async saveReferralData(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.referral_links]: Object.fromEntries(this.referralLinks),
          [STORAGE_KEYS.referral_usage]: Object.fromEntries(this.referralUsage)
        });
      }
    } catch (error) {
      console.error('❌ Failed to save referral data:', error);
    }
  }

  // 統計保存
  private async saveStats(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.referral_stats]: this.referralStats
        });
      }
    } catch (error) {
      console.error('❌ Failed to save referral stats:', error);
    }
  }

  // 公開メソッド: ユーザーのReferralリンク一覧取得
  getUserReferralLinks(userId: string): ReferralLink[] {
    return Array.from(this.referralLinks.values())
      .filter(link => link.referrer_user_id === userId)
      .sort((a, b) => b.created_at - a.created_at);
  }

  // 公開メソッド: Referral統計取得
  getReferralStats(): ReferralStats {
    // 成功率計算
    this.referralStats.success_rate = this.referralStats.total_referrals > 0 
      ? this.referralStats.successful_referrals / this.referralStats.total_referrals 
      : 0;

    // トップパフォーマンスリンク更新
    this.referralStats.top_performing_links = Array.from(this.referralLinks.values())
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 5);

    return this.referralStats;
  }

  // 公開メソッド: Referralリンク無効化
  async deactivateReferralLink(referralId: string): Promise<boolean> {
    const link = this.referralLinks.get(referralId);
    if (!link) return false;

    link.is_active = false;
    this.referralLinks.set(referralId, link);
    await this.saveReferralData();

    console.log(`🔒 Referral link deactivated: ${referralId}`);
    return true;
  }
}

// シングルトンインスタンス
let referralManagerInstance: ReferralManager | null = null;

export const getReferralManager = (): ReferralManager => {
  if (!referralManagerInstance) {
    referralManagerInstance = new ReferralManager();
  }
  return referralManagerInstance;
};

export const initializeReferralManager = () => {
  console.log('🔗 Initializing Referral Manager...');
  const manager = getReferralManager();
  console.log('✅ Referral Manager initialized');
  return manager;
};
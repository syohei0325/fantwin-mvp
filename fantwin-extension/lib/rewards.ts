// @implementation_plan.md Week-5: トークン報酬システム
// 招待者/被招待者+5k tok + 残量バーリアルタイム更新 + 報酬履歴表示 + 上限設定（月10回まで）

export interface TokenReward {
  reward_id: string;
  user_id: string;
  reward_type: 'referral_invite' | 'referral_signup' | 'bonus' | 'manual';
  amount: number;
  description: string;
  referral_id?: string;
  related_user_id?: string; // 招待者または被招待者のID
  granted_at: number;
  expires_at?: number;
  is_active: boolean;
  transaction_hash?: string;
}

export interface TokenBalance {
  user_id: string;
  total_tokens: number;
  available_tokens: number;
  reserved_tokens: number;
  spent_tokens: number;
  lifetime_earned: number;
  last_updated: number;
  monthly_earned: number;
  monthly_limit: number;
}

export interface RewardHistory {
  user_id: string;
  rewards: TokenReward[];
  total_earned: number;
  total_spent: number;
  current_balance: number;
  monthly_stats: {
    current_month: number;
    referral_rewards: number;
    bonus_rewards: number;
    limit_remaining: number;
  };
}

export interface TokenTransaction {
  transaction_id: string;
  user_id: string;
  type: 'credit' | 'debit' | 'transfer';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  metadata?: Record<string, any>;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}

const STORAGE_KEYS = {
  token_balances: 'fantwin_token_balances',
  token_rewards: 'fantwin_token_rewards',
  token_transactions: 'fantwin_token_transactions',
  reward_settings: 'fantwin_reward_settings'
} as const;

const REWARD_CONFIG = {
  referral_reward_amount: 5000, // +5k tok
  monthly_referral_limit: 10, // 月10回まで
  default_token_balance: 0,
  token_expiry_days: 365, // 1年間有効
  max_monthly_earnings: 50000, // 月間獲得上限
  minimum_reward_amount: 100
} as const;

export class RewardManager {
  private tokenBalances: Map<string, TokenBalance> = new Map();
  private tokenRewards: Map<string, TokenReward> = new Map();
  private tokenTransactions: Map<string, TokenTransaction> = new Map();
  private balanceUpdateCallbacks: Set<(balance: TokenBalance) => void> = new Set();

  constructor() {
    this.loadRewardData();
    this.setupMonthlyReset();
  }

  // 招待報酬付与 (招待者+被招待者両方に+5k tok)
  async grantReferralReward(
    referrerUserId: string,
    referredUserId: string,
    referralId: string
  ): Promise<{ success: boolean; rewards: TokenReward[]; message: string }> {
    try {
      const rewards: TokenReward[] = [];

      // 招待者報酬
      const referrerReward = await this.grantTokenReward({
        user_id: referrerUserId,
        reward_type: 'referral_invite',
        amount: REWARD_CONFIG.referral_reward_amount,
        description: 'Referral reward - Inviter',
        referral_id: referralId,
        related_user_id: referredUserId
      });
      
      if (referrerReward) {
        rewards.push(referrerReward);
      }

      // 被招待者報酬
      const referredReward = await this.grantTokenReward({
        user_id: referredUserId,
        reward_type: 'referral_signup',
        amount: REWARD_CONFIG.referral_reward_amount,
        description: 'Referral reward - New user signup',
        referral_id: referralId,
        related_user_id: referrerUserId
      });

      if (referredReward) {
        rewards.push(referredReward);
      }

      await this.saveRewardData();

      // リアルタイム残量バー更新通知
      await this.notifyBalanceUpdate(referrerUserId);
      await this.notifyBalanceUpdate(referredUserId);

      console.log(`🎉 Referral rewards granted: ${rewards.length} rewards, ${rewards.reduce((sum, r) => sum + r.amount, 0)} tokens total`);

      // GA4イベント送信
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'SEND_GA4_EVENT',
          eventName: 'referral_rewards_granted',
          parameters: {
            referral_id: referralId,
            referrer_user_id: referrerUserId,
            referred_user_id: referredUserId,
            total_amount: rewards.reduce((sum, r) => sum + r.amount, 0),
            rewards_count: rewards.length
          }
        });
      }

      return {
        success: true,
        rewards: rewards,
        message: `Successfully granted ${rewards.reduce((sum, r) => sum + r.amount, 0)} tokens to both users`
      };

    } catch (error) {
      console.error('❌ Failed to grant referral rewards:', error);
      return {
        success: false,
        rewards: [],
        message: `Failed to grant rewards: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // トークン報酬付与 (汎用)
  async grantTokenReward(params: {
    user_id: string;
    reward_type: TokenReward['reward_type'];
    amount: number;
    description: string;
    referral_id?: string;
    related_user_id?: string;
    expires_in_days?: number;
  }): Promise<TokenReward | null> {
    try {
      // 月間上限チェック
      const currentBalance = await this.getTokenBalance(params.user_id);
      if (currentBalance.monthly_earned >= REWARD_CONFIG.max_monthly_earnings) {
        throw new Error('Monthly earning limit exceeded');
      }

      // 最小報酬額チェック
      if (params.amount < REWARD_CONFIG.minimum_reward_amount) {
        throw new Error(`Reward amount must be at least ${REWARD_CONFIG.minimum_reward_amount} tokens`);
      }

      const rewardId = `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();
      const expiresAt = params.expires_in_days 
        ? now + (params.expires_in_days * 24 * 60 * 60 * 1000)
        : now + (REWARD_CONFIG.token_expiry_days * 24 * 60 * 60 * 1000);

      const reward: TokenReward = {
        reward_id: rewardId,
        user_id: params.user_id,
        reward_type: params.reward_type,
        amount: params.amount,
        description: params.description,
        referral_id: params.referral_id,
        related_user_id: params.related_user_id,
        granted_at: now,
        expires_at: expiresAt,
        is_active: true
      };

      this.tokenRewards.set(rewardId, reward);

      // トークン残高更新
      await this.updateTokenBalance(params.user_id, params.amount, 'credit', params.description);

      console.log(`🎁 Token reward granted: ${params.amount} tokens to user ${params.user_id}`);

      return reward;

    } catch (error) {
      console.error('❌ Failed to grant token reward:', error);
      return null;
    }
  }

  // トークン残高更新
  private async updateTokenBalance(
    userId: string,
    amount: number,
    type: 'credit' | 'debit',
    description: string
  ): Promise<TokenBalance> {
    try {
      let balance = this.tokenBalances.get(userId);
      
      if (!balance) {
        balance = {
          user_id: userId,
          total_tokens: REWARD_CONFIG.default_token_balance,
          available_tokens: REWARD_CONFIG.default_token_balance,
          reserved_tokens: 0,
          spent_tokens: 0,
          lifetime_earned: 0,
          last_updated: Date.now(),
          monthly_earned: 0,
          monthly_limit: REWARD_CONFIG.max_monthly_earnings
        };
      }

      const balanceBefore = balance.total_tokens;
      
      if (type === 'credit') {
        balance.total_tokens += amount;
        balance.available_tokens += amount;
        balance.lifetime_earned += amount;
        balance.monthly_earned += amount;
      } else {
        if (balance.available_tokens < amount) {
          throw new Error('Insufficient token balance');
        }
        balance.total_tokens -= amount;
        balance.available_tokens -= amount;
        balance.spent_tokens += amount;
      }

      balance.last_updated = Date.now();
      this.tokenBalances.set(userId, balance);

      // トランザクション記録
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const transaction: TokenTransaction = {
        transaction_id: transactionId,
        user_id: userId,
        type: type,
        amount: amount,
        balance_before: balanceBefore,
        balance_after: balance.total_tokens,
        description: description,
        timestamp: Date.now(),
        status: 'completed'
      };

      this.tokenTransactions.set(transactionId, transaction);

      console.log(`💰 Token balance updated: ${userId} ${type} ${amount} tokens, new balance: ${balance.total_tokens}`);

      return balance;

    } catch (error) {
      console.error('❌ Failed to update token balance:', error);
      throw error;
    }
  }

  // トークン残高取得
  async getTokenBalance(userId: string): Promise<TokenBalance> {
    let balance = this.tokenBalances.get(userId);
    
    if (!balance) {
      balance = {
        user_id: userId,
        total_tokens: REWARD_CONFIG.default_token_balance,
        available_tokens: REWARD_CONFIG.default_token_balance,
        reserved_tokens: 0,
        spent_tokens: 0,
        lifetime_earned: 0,
        last_updated: Date.now(),
        monthly_earned: 0,
        monthly_limit: REWARD_CONFIG.max_monthly_earnings
      };
      
      this.tokenBalances.set(userId, balance);
      await this.saveRewardData();
    }

    // 期限切れトークンの処理
    await this.processExpiredTokens(userId);

    return balance;
  }

  // 報酬履歴取得
  async getRewardHistory(userId: string, limit?: number): Promise<RewardHistory> {
    const userRewards = Array.from(this.tokenRewards.values())
      .filter(reward => reward.user_id === userId)
      .sort((a, b) => b.granted_at - a.granted_at);

    const limitedRewards = limit ? userRewards.slice(0, limit) : userRewards;
    const balance = await this.getTokenBalance(userId);

    // 今月の統計計算
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRewards = userRewards.filter(reward => {
      const rewardDate = new Date(reward.granted_at);
      return rewardDate.getMonth() === currentMonth && rewardDate.getFullYear() === currentYear;
    });

    const monthlyStats = {
      current_month: monthlyRewards.reduce((sum, reward) => sum + reward.amount, 0),
      referral_rewards: monthlyRewards
        .filter(reward => reward.reward_type === 'referral_invite' || reward.reward_type === 'referral_signup')
        .reduce((sum, reward) => sum + reward.amount, 0),
      bonus_rewards: monthlyRewards
        .filter(reward => reward.reward_type === 'bonus')
        .reduce((sum, reward) => sum + reward.amount, 0),
      limit_remaining: Math.max(0, balance.monthly_limit - balance.monthly_earned)
    };

    return {
      user_id: userId,
      rewards: limitedRewards,
      total_earned: balance.lifetime_earned,
      total_spent: balance.spent_tokens,
      current_balance: balance.total_tokens,
      monthly_stats: monthlyStats
    };
  }

  // リアルタイム残量バー更新通知
  async notifyBalanceUpdate(userId: string): Promise<void> {
    try {
      const balance = await this.getTokenBalance(userId);
      
      // 登録されたコールバック関数を実行
      this.balanceUpdateCallbacks.forEach(callback => {
        try {
          callback(balance);
        } catch (error) {
          console.error('❌ Balance update callback failed:', error);
        }
      });

      // Chrome Extension Message API による UI 更新
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'TOKEN_BALANCE_UPDATED',
          payload: {
            user_id: userId,
            balance: balance,
            timestamp: Date.now()
          }
        });
      }

      console.log(`📊 Balance update notification sent for user: ${userId}, balance: ${balance.total_tokens}`);

    } catch (error) {
      console.error('❌ Failed to notify balance update:', error);
    }
  }

  // 残量バー更新コールバック登録
  onBalanceUpdate(callback: (balance: TokenBalance) => void): () => void {
    this.balanceUpdateCallbacks.add(callback);
    
    // アンサブスクライブ関数を返す
    return () => {
      this.balanceUpdateCallbacks.delete(callback);
    };
  }

  // 期限切れトークン処理
  private async processExpiredTokens(userId: string): Promise<void> {
    try {
      const userRewards = Array.from(this.tokenRewards.values())
        .filter(reward => reward.user_id === userId && reward.is_active);

      const now = Date.now();
      let expiredAmount = 0;

      for (const reward of userRewards) {
        if (reward.expires_at && now > reward.expires_at) {
          reward.is_active = false;
          expiredAmount += reward.amount;
          this.tokenRewards.set(reward.reward_id, reward);
          
          console.log(`⏰ Token reward expired: ${reward.amount} tokens for user ${userId}`);
        }
      }

      if (expiredAmount > 0) {
        await this.updateTokenBalance(userId, expiredAmount, 'debit', 'Expired token rewards');
        await this.saveRewardData();
      }

    } catch (error) {
      console.error('❌ Failed to process expired tokens:', error);
    }
  }

  // 月次リセット機能
  private setupMonthlyReset(): void {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const msUntilReset = nextMonth.getTime() - now.getTime();

    setTimeout(() => {
      this.resetMonthlyEarnings();
      // 毎月1日にリセット
      setInterval(() => this.resetMonthlyEarnings(), 30 * 24 * 60 * 60 * 1000);
    }, msUntilReset);

    console.log(`📅 Monthly earnings reset scheduled in ${Math.round(msUntilReset / 1000 / 60 / 60)} hours`);
  }

  // 月間獲得リセット
  private async resetMonthlyEarnings(): Promise<void> {
    console.log('🔄 Resetting monthly token earnings...');
    
    for (const [userId, balance] of this.tokenBalances.entries()) {
      balance.monthly_earned = 0;
      this.tokenBalances.set(userId, balance);
    }
    
    await this.saveRewardData();
    console.log('✅ Monthly token earnings reset completed');
  }

  // データ読み込み
  private async loadRewardData(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([
          STORAGE_KEYS.token_balances,
          STORAGE_KEYS.token_rewards,
          STORAGE_KEYS.token_transactions,
          STORAGE_KEYS.reward_settings
        ]);

        if (result[STORAGE_KEYS.token_balances]) {
          this.tokenBalances = new Map(Object.entries(result[STORAGE_KEYS.token_balances]));
        }

        if (result[STORAGE_KEYS.token_rewards]) {
          this.tokenRewards = new Map(Object.entries(result[STORAGE_KEYS.token_rewards]));
        }

        if (result[STORAGE_KEYS.token_transactions]) {
          this.tokenTransactions = new Map(Object.entries(result[STORAGE_KEYS.token_transactions]));
        }
      }
    } catch (error) {
      console.error('❌ Failed to load reward data:', error);
    }
  }

  // データ保存
  private async saveRewardData(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.token_balances]: Object.fromEntries(this.tokenBalances),
          [STORAGE_KEYS.token_rewards]: Object.fromEntries(this.tokenRewards),
          [STORAGE_KEYS.token_transactions]: Object.fromEntries(this.tokenTransactions)
        });
      }
    } catch (error) {
      console.error('❌ Failed to save reward data:', error);
    }
  }

  // 公開メソッド: トークン使用
  async spendTokens(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; new_balance: number; transaction_id?: string }> {
    try {
      const balance = await this.getTokenBalance(userId);
      
      if (balance.available_tokens < amount) {
        return { success: false, new_balance: balance.total_tokens };
      }

      const updatedBalance = await this.updateTokenBalance(userId, amount, 'debit', description);
      
      // トランザクションにメタデータを追加
      if (metadata) {
        const transactions = Array.from(this.tokenTransactions.values())
          .filter(tx => tx.user_id === userId)
          .sort((a, b) => b.timestamp - a.timestamp);
        
        if (transactions.length > 0) {
          const latestTransaction = transactions[0];
          latestTransaction.metadata = metadata;
          this.tokenTransactions.set(latestTransaction.transaction_id, latestTransaction);
        }
      }

      await this.saveRewardData();
      await this.notifyBalanceUpdate(userId);

      console.log(`💸 Tokens spent: ${amount} by user ${userId}, new balance: ${updatedBalance.total_tokens}`);

      return { 
        success: true, 
        new_balance: updatedBalance.total_tokens,
        transaction_id: Array.from(this.tokenTransactions.values())
          .filter(tx => tx.user_id === userId)
          .sort((a, b) => b.timestamp - a.timestamp)[0]?.transaction_id
      };

    } catch (error) {
      console.error('❌ Failed to spend tokens:', error);
      return { success: false, new_balance: 0 };
    }
  }

  // 公開メソッド: トランザクション履歴取得
  getTransactionHistory(userId: string, limit: number = 50): TokenTransaction[] {
    return Array.from(this.tokenTransactions.values())
      .filter(tx => tx.user_id === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // 公開メソッド: 統計データ取得
  getRewardStats(): {
    total_rewards_granted: number;
    total_tokens_distributed: number;
    active_users: number;
    monthly_distribution: number;
  } {
    const totalRewards = this.tokenRewards.size;
    const totalTokens = Array.from(this.tokenRewards.values())
      .reduce((sum, reward) => sum + reward.amount, 0);
    const activeUsers = this.tokenBalances.size;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyTokens = Array.from(this.tokenRewards.values())
      .filter(reward => {
        const rewardDate = new Date(reward.granted_at);
        return rewardDate.getMonth() === currentMonth && rewardDate.getFullYear() === currentYear;
      })
      .reduce((sum, reward) => sum + reward.amount, 0);

    return {
      total_rewards_granted: totalRewards,
      total_tokens_distributed: totalTokens,
      active_users: activeUsers,
      monthly_distribution: monthlyTokens
    };
  }
}

// シングルトンインスタンス
let rewardManagerInstance: RewardManager | null = null;

export const getRewardManager = (): RewardManager => {
  if (!rewardManagerInstance) {
    rewardManagerInstance = new RewardManager();
  }
  return rewardManagerInstance;
};

export const initializeRewardManager = () => {
  console.log('🎁 Initializing Reward Manager...');
  const manager = getRewardManager();
  console.log('✅ Reward Manager initialized');
  return manager;
};
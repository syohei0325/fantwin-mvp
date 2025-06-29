// Week-7-8: LTV/CAC計測システム
// Mixpanel Cohort分析、90日LTV計算、CAC計算、ダッシュボード可視化

export interface CohortData {
  cohortId: string;
  cohortDate: Date;
  userCount: number;
  revenue: number;
  retentionRates: number[]; // Day 1, 7, 30, 90
  averageRevenue: number;
  ltv: number;
}

export interface CACData {
  month: string;
  adSpend: number;
  organicUsers: number;
  paidUsers: number;
  totalUsers: number;
  cac: number;
  ltvCacRatio: number;
}

export interface LTVMetrics {
  day1Revenue: number;
  day7Revenue: number;
  day30Revenue: number;
  day90Revenue: number;
  predictedLtv: number;
  paybackPeriod: number; // days
}

export interface UserEvent {
  userId: string;
  eventType: 'signup' | 'trial_start' | 'subscription' | 'payment' | 'churn';
  timestamp: Date;
  revenue?: number;
  planId?: string;
  source?: string; // organic, google_ads, facebook_ads, referral
}

class LTVAnalytics {
  private readonly STORAGE_PREFIX = 'ltv_analytics_';
  private readonly COHORT_CACHE_HOURS = 6; // 6時間キャッシュ

  // ユーザーイベント記録
  async recordUserEvent(event: UserEvent): Promise<void> {
    try {
      // イベント保存
      const eventKey = `${this.STORAGE_PREFIX}event_${event.userId}_${Date.now()}`;
      await this.saveToStorage(eventKey, event);

      // Mixpanel送信（模擬実装）
      await this.sendToMixpanel(event);

      // GA4イベント送信
      this.trackLTVEvent('user_event_recorded', {
        event_type: event.eventType,
        revenue: event.revenue || 0,
        plan_id: event.planId || 'unknown',
        source: event.source || 'unknown'
      });

    } catch (error) {
      console.error('Failed to record user event:', error);
    }
  }

  // コホート分析データ生成
  async generateCohortAnalysis(startDate: Date, endDate: Date): Promise<CohortData[]> {
    try {
      // キャッシュチェック
      const cacheKey = `${this.STORAGE_PREFIX}cohort_${startDate.toISOString()}_${endDate.toISOString()}`;
      const cached = await this.getFromStorage(cacheKey);
      
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached.data;
      }

      // 新しい分析を実行
      const cohorts = await this.calculateCohorts(startDate, endDate);
      
      // キャッシュ保存
      await this.saveToStorage(cacheKey, {
        data: cohorts,
        timestamp: new Date()
      });

      // GA4イベント送信
      this.trackLTVEvent('cohort_analysis_generated', {
        cohort_count: cohorts.length,
        date_range: `${startDate.toISOString()}-${endDate.toISOString()}`
      });

      return cohorts;

    } catch (error) {
      console.error('Failed to generate cohort analysis:', error);
      return [];
    }
  }

  // コホート計算
  private async calculateCohorts(startDate: Date, endDate: Date): Promise<CohortData[]> {
    const cohorts: CohortData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const cohortDate = new Date(currentDate);
      const cohortId = this.generateCohortId(cohortDate);
      
      // 該当期間のユーザー取得
      const cohortUsers = await this.getCohortUsers(cohortDate);
      
      if (cohortUsers.length > 0) {
        const cohortData = await this.analyzeCohort(cohortId, cohortDate, cohortUsers);
        cohorts.push(cohortData);
      }

      // 次の週に進む
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return cohorts;
  }

  // 個別コホート分析
  private async analyzeCohort(cohortId: string, cohortDate: Date, userIds: string[]): Promise<CohortData> {
    const userEvents = await this.getUserEvents(userIds);
    
    // リテンション率計算
    const retentionRates = await this.calculateRetentionRates(cohortDate, userIds);
    
    // 収益計算
    const revenueData = this.calculateCohortRevenue(userEvents);
    
    // LTV計算
    const ltv = this.calculateLTV(revenueData.day90Revenue, retentionRates[3]);

    return {
      cohortId,
      cohortDate,
      userCount: userIds.length,
      revenue: revenueData.totalRevenue,
      retentionRates,
      averageRevenue: revenueData.totalRevenue / userIds.length,
      ltv
    };
  }

  // リテンション率計算
  private async calculateRetentionRates(cohortDate: Date, userIds: string[]): Promise<number[]> {
    const checkpoints = [1, 7, 30, 90]; // 日数
    const retentionRates: number[] = [];

    for (const days of checkpoints) {
      const checkDate = new Date(cohortDate);
      checkDate.setDate(checkDate.getDate() + days);
      
      const activeUsers = await this.getActiveUsersOnDate(userIds, checkDate);
      const retentionRate = activeUsers.length / userIds.length;
      retentionRates.push(retentionRate);
    }

    return retentionRates;
  }

  // CAC分析データ生成
  async generateCACAnalysis(months: number = 12): Promise<CACData[]> {
    try {
      const cacData: CACData[] = [];
      const currentDate = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date(currentDate);
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

        const monthData = await this.calculateMonthlyCAC(monthDate);
        cacData.push({
          month: monthKey,
          ...monthData
        });
      }

      // GA4イベント送信
      this.trackLTVEvent('cac_analysis_generated', {
        months_analyzed: months,
        total_spend: cacData.reduce((sum, data) => sum + data.adSpend, 0)
      });

      return cacData;

    } catch (error) {
      console.error('Failed to generate CAC analysis:', error);
      return [];
    }
  }

  // 月次CAC計算
  private async calculateMonthlyCAC(monthDate: Date): Promise<Omit<CACData, 'month'>> {
    // 模擬データ（実際のプロダクションでは実データを使用）
    const adSpend = Math.random() * 50000 + 20000; // ¥20k-70k
    const organicUsers = Math.floor(Math.random() * 50 + 20);
    const paidUsers = Math.floor(Math.random() * 30 + 10);
    const totalUsers = organicUsers + paidUsers;
    
    const cac = paidUsers > 0 ? adSpend / paidUsers : 0;
    
    // LTV取得（実際は過去データから計算）
    const avgLTV = await this.getAverageLTV(monthDate);
    const ltvCacRatio = cac > 0 ? avgLTV / cac : 0;

    return {
      adSpend,
      organicUsers,
      paidUsers,
      totalUsers,
      cac,
      ltvCacRatio
    };
  }

  // LTV計算
  private calculateLTV(day90Revenue: number, retentionRate90: number): number {
    // 基本的なLTV計算式: 90日収益 / (1 - 90日リテンション率)
    if (retentionRate90 >= 1) return day90Revenue * 4; // フォールバック
    return day90Revenue / (1 - retentionRate90);
  }

  // ユーザーLTVメトリクス計算
  async calculateUserLTVMetrics(userId: string): Promise<LTVMetrics> {
    try {
      const userEvents = await this.getUserEvents([userId]);
      const signupEvent = userEvents.find(e => e.eventType === 'signup');
      
      if (!signupEvent) {
        throw new Error('Signup event not found');
      }

      const signupDate = signupEvent.timestamp;
      const revenueByDay = this.calculateRevenueByDay(userEvents, signupDate);
      
      const metrics: LTVMetrics = {
        day1Revenue: revenueByDay.day1 || 0,
        day7Revenue: revenueByDay.day7 || 0,
        day30Revenue: revenueByDay.day30 || 0,
        day90Revenue: revenueByDay.day90 || 0,
        predictedLtv: 0,
        paybackPeriod: 0
      };

      // 予測LTV計算
      metrics.predictedLtv = this.predictLTV(metrics);
      
      // ペイバック期間計算
      metrics.paybackPeriod = this.calculatePaybackPeriod(revenueByDay);

      return metrics;

    } catch (error) {
      console.error('Failed to calculate user LTV metrics:', error);
      return {
        day1Revenue: 0,
        day7Revenue: 0,
        day30Revenue: 0,
        day90Revenue: 0,
        predictedLtv: 0,
        paybackPeriod: 0
      };
    }
  }

  // 予測LTV計算
  private predictLTV(metrics: LTVMetrics): number {
    // 簡単な線形予測モデル
    const { day7Revenue, day30Revenue, day90Revenue } = metrics;
    
    if (day90Revenue > 0) {
      // 90日データがある場合
      return day90Revenue * 1.5; // 将来収益を予測
    } else if (day30Revenue > 0) {
      // 30日データがある場合
      return day30Revenue * 2.0;
    } else if (day7Revenue > 0) {
      // 7日データがある場合
      return day7Revenue * 4.0;
    }
    
    return 0;
  }

  // ペイバック期間計算
  private calculatePaybackPeriod(revenueByDay: Record<string, number>): number {
    // 仮想CAC（現在の平均値）
    const avgCAC = 3000; // ¥3,000
    
    let cumulativeRevenue = 0;
    let days = 0;
    
    const dayKeys = ['day1', 'day7', 'day30', 'day90'];
    const dayNumbers = [1, 7, 30, 90];
    
    for (let i = 0; i < dayKeys.length; i++) {
      cumulativeRevenue += revenueByDay[dayKeys[i]] || 0;
      if (cumulativeRevenue >= avgCAC) {
        return dayNumbers[i];
      }
      days = dayNumbers[i];
    }
    
    return days; // ペイバック未達成の場合は最後の日数を返す
  }

  // ヘルパーメソッド
  private generateCohortId(date: Date): string {
    return `cohort_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}_${String(date.getDate()).padStart(2, '0')}`;
  }

  private async getCohortUsers(cohortDate: Date): Promise<string[]> {
    // 模擬データ（実際は実データを使用）
    const userCount = Math.floor(Math.random() * 50 + 10);
    return Array.from({ length: userCount }, (_, i) => `user_${Date.now()}_${i}`);
  }

  private async getUserEvents(userIds: string[]): Promise<UserEvent[]> {
    // 模擬データ（実際は保存されたイベントを取得）
    const events: UserEvent[] = [];
    
    for (const userId of userIds) {
      // サインアップイベント
      events.push({
        userId,
        eventType: 'signup',
        timestamp: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        source: Math.random() > 0.5 ? 'organic' : 'google_ads'
      });
      
      // 課金イベント（50%の確率）
      if (Math.random() > 0.5) {
        events.push({
          userId,
          eventType: 'payment',
          timestamp: new Date(),
          revenue: 3300,
          planId: 'pro'
        });
      }
    }
    
    return events;
  }

  private calculateCohortRevenue(events: UserEvent[]): { totalRevenue: number, day90Revenue: number } {
    const totalRevenue = events
      .filter(e => e.revenue)
      .reduce((sum, e) => sum + (e.revenue || 0), 0);
    
    return {
      totalRevenue,
      day90Revenue: totalRevenue // 簡略化
    };
  }

  private calculateRevenueByDay(events: UserEvent[], signupDate: Date): Record<string, number> {
    const revenueByDay: Record<string, number> = {
      day1: 0,
      day7: 0,
      day30: 0,
      day90: 0
    };

    events.filter(e => e.revenue).forEach(event => {
      const daysSinceSignup = Math.floor(
        (event.timestamp.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceSignup <= 1) revenueByDay.day1 += event.revenue || 0;
      if (daysSinceSignup <= 7) revenueByDay.day7 += event.revenue || 0;
      if (daysSinceSignup <= 30) revenueByDay.day30 += event.revenue || 0;
      if (daysSinceSignup <= 90) revenueByDay.day90 += event.revenue || 0;
    });

    return revenueByDay;
  }

  private async getActiveUsersOnDate(userIds: string[], date: Date): Promise<string[]> {
    // 模擬データ（実際はアクティビティデータを確認）
    return userIds.filter(() => Math.random() > 0.3); // 70%が継続
  }

  private async getAverageLTV(monthDate: Date): Promise<number> {
    // 模擬データ（実際は計算済みLTVを取得）
    return Math.random() * 10000 + 5000; // ¥5k-15k
  }

  // Mixpanel送信（模擬実装）
  private async sendToMixpanel(event: UserEvent): Promise<void> {
    try {
      // 実際のプロダクションではMixpanel APIを呼び出し
      console.log('Mixpanel event:', event);
    } catch (error) {
      console.error('Mixpanel send failed:', error);
    }
  }

  // ストレージ操作
  private async saveToStorage(key: string, data: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [key]: data });
    } else {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  private async getFromStorage(key: string): Promise<any> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(key);
        return result[key];
      } else {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
      }
    } catch (error) {
      console.error('Storage get failed:', error);
      return null;
    }
  }

  // キャッシュ有効性チェック
  private isCacheValid(timestamp: Date): boolean {
    const now = new Date();
    const timeDiff = (now.getTime() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    return timeDiff < this.COHORT_CACHE_HOURS;
  }

  // GA4イベント送信
  private trackLTVEvent(eventName: string, parameters: Record<string, any>): void {
    try {
      if (typeof gtag !== 'undefined') {
        gtag('event', eventName, {
          ...parameters,
          event_category: 'ltv_analytics',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('GA4 LTV event tracking failed:', error);
    }
  }
}

// シングルトンインスタンス
export const ltvAnalytics = new LTVAnalytics();

// 初期化・ヘルパー関数
export async function recordUserSignup(
  userId: string, 
  source: string = 'organic'
): Promise<void> {
  await ltvAnalytics.recordUserEvent({
    userId,
    eventType: 'signup',
    timestamp: new Date(),
    source
  });
}

export async function recordUserPayment(
  userId: string,
  revenue: number,
  planId: string
): Promise<void> {
  await ltvAnalytics.recordUserEvent({
    userId,
    eventType: 'payment',
    timestamp: new Date(),
    revenue,
    planId
  });
}

export async function generateLTVReport(): Promise<{
  cohorts: CohortData[];
  cac: CACData[];
  summary: {
    totalUsers: number;
    totalRevenue: number;
    averageLTV: number;
    averageCAC: number;
    ltvCacRatio: number;
  };
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6); // 6ヶ月間

  const [cohorts, cac] = await Promise.all([
    ltvAnalytics.generateCohortAnalysis(startDate, endDate),
    ltvAnalytics.generateCACAnalysis(6)
  ]);

  // サマリー計算
  const totalUsers = cohorts.reduce((sum, c) => sum + c.userCount, 0);
  const totalRevenue = cohorts.reduce((sum, c) => sum + c.revenue, 0);
  const averageLTV = totalUsers > 0 ? totalRevenue / totalUsers : 0;
  const averageCAC = cac.length > 0 ? cac.reduce((sum, c) => sum + c.cac, 0) / cac.length : 0;
  const ltvCacRatio = averageCAC > 0 ? averageLTV / averageCAC : 0;

  return {
    cohorts,
    cac,
    summary: {
      totalUsers,
      totalRevenue,
      averageLTV,
      averageCAC,
      ltvCacRatio
    }
  };
} 
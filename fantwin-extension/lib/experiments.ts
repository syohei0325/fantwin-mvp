// @implementation_plan.md Week-2: A/Bテストフレームワーク
// Chrome Extension版 - Chrome Storage API対応

interface ExperimentConfig {
  id: string;
  name: string;
  variants: {
    control: string;
    treatment: string;
  };
  traffic_allocation: number; // 0.0-1.0
  enabled: boolean;
  start_date: string;
  end_date?: string;
}

interface UserExperiment {
  experiment_id: string;
  variant: 'control' | 'treatment';
  user_id: string;
  assigned_at: number;
  session_id: string;
}

// Week-2 実験設定
const EXPERIMENTS: Record<string, ExperimentConfig> = {
  speed_to_value_ab: {
    id: 'speed_to_value_ab',
    name: 'Free→Trial Speed to Value AB',
    variants: {
      control: 'standard_onboarding',
      treatment: 'speed_comparison_gif'
    },
    traffic_allocation: 1.0, // 100%ユーザーが対象
    enabled: true,
    start_date: '2024-06-17',
    end_date: '2024-07-01' // 2週間実験
  },
  paywall_variant_ab: {
    id: 'paywall_variant_ab', 
    name: 'Trial→Pro Paywall Variant',
    variants: {
      control: 'basic_paywall',
      treatment: 'speed_gif_embedded'
    },
    traffic_allocation: 0.8, // 80%ユーザーが対象
    enabled: true,
    start_date: '2024-06-17'
  }
};

// Chrome Extension用 ユーザーID生成
const getUserId = async (): Promise<string> => {
  try {
    const result = await browser.storage.local.get(['fantwin_user_id']);
    
    if (result.fantwin_user_id) {
      return result.fantwin_user_id;
    }
    
    // 新規ユーザーID生成
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await browser.storage.local.set({ fantwin_user_id: userId });
    
    return userId;
  } catch (error) {
    console.error('Failed to get user ID:', error);
    return `fallback_${Date.now()}`;
  }
};

// Chrome Extension用 セッションID生成
const getSessionId = async (): Promise<string> => {
  try {
    const result = await browser.storage.session.get(['fantwin_session_id']);
    
    if (result.fantwin_session_id) {
      return result.fantwin_session_id;
    }
    
    // 新規セッションID生成
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await browser.storage.session.set({ fantwin_session_id: sessionId });
    
    return sessionId;
  } catch (error) {
    // Session Storage が使えない場合はLocal Storageで代替
    console.warn('Session storage not available, using local storage');
    const result = await browser.storage.local.get(['fantwin_session_id']);
    
    if (result.fantwin_session_id) {
      return result.fantwin_session_id;
    }
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await browser.storage.local.set({ fantwin_session_id: sessionId });
    
    return sessionId;
  }
};

// 実験バリアント割り当て（50/50分割）
export const assignExperimentVariant = async (
  experimentId: string,
  userId?: string
): Promise<'control' | 'treatment'> => {
  const config = EXPERIMENTS[experimentId];
  if (!config || !config.enabled) {
    return 'control';
  }

  const actualUserId = userId || await getUserId();
  
  // 日付チェック
  const now = new Date();
  const startDate = new Date(config.start_date);
  if (now < startDate) return 'control';
  
  if (config.end_date) {
    const endDate = new Date(config.end_date);
    if (now > endDate) return 'control';
  }

  // Traffic allocation チェック
  const trafficHash = hashString(actualUserId + experimentId);
  if (trafficHash > config.traffic_allocation) {
    return 'control';
  }

  // 50/50 分割（決定論的）
  const variantHash = hashString(actualUserId + experimentId + 'variant');
  return variantHash < 0.5 ? 'control' : 'treatment';
};

// 文字列ハッシュ関数（0.0-1.0の範囲）
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32-bit integer変換
  }
  return Math.abs(hash) / 2147483647; // 正規化 (0.0-1.0)
};

// 実験参加記録
export const recordExperimentParticipation = async (
  experimentId: string,
  variant: 'control' | 'treatment',
  metadata: Record<string, unknown> = {}
): Promise<UserExperiment> => {
  const userId = await getUserId();
  const sessionId = await getSessionId();
  
  const experiment: UserExperiment = {
    experiment_id: experimentId,
    variant,
    user_id: userId,
    assigned_at: Date.now(),
    session_id: sessionId
  };

  // Chrome Storage に保存
  const storageKey = `experiment_${experimentId}`;
  await browser.storage.local.set({ [storageKey]: experiment });

  // GA4 イベント送信
  await sendExperimentEventToGA4(experiment, metadata);

  console.log(`🧪 Experiment assigned: ${experimentId} = ${variant}`, experiment);
  return experiment;
};

// GA4 実験イベント送信（Chrome Extension版）
const sendExperimentEventToGA4 = async (
  experiment: UserExperiment,
  metadata: Record<string, unknown>
) => {
  try {
    // Chrome Extension環境でGA4イベント送信
    const { demoGA4Client } = await import('./analytics/ga4');
    
    await demoGA4Client.trackEvent('experiment_assigned', {
      experiment_id: experiment.experiment_id,
      variant: experiment.variant,
      user_id: experiment.user_id,
      session_id: experiment.session_id,
      assigned_at: experiment.assigned_at,
      exp_id: experiment.experiment_id, // GA4 実験ID
      custom_parameters: metadata
    });

    console.log(`📊 GA4 Experiment event sent: ${experiment.experiment_id}`);
  } catch (error) {
    console.error('Failed to send experiment event to GA4:', error);
  }
};

// 実験バリアント取得（キャッシュ済み）
export const getExperimentVariant = async (experimentId: string): Promise<'control' | 'treatment'> => {
  try {
    const storageKey = `experiment_${experimentId}`;
    const result = await browser.storage.local.get([storageKey]);
    
    if (result[storageKey]) {
      const experiment: UserExperiment = result[storageKey];
      return experiment.variant;
    }

    // 新規割り当て
    const variant = await assignExperimentVariant(experimentId);
    await recordExperimentParticipation(experimentId, variant);
    return variant;
  } catch (error) {
    console.error('Failed to get experiment variant:', error);
    return 'control';
  }
};

// 実験コンバージョン記録
export const recordExperimentConversion = async (
  experimentId: string,
  conversionType: string,
  value?: number,
  metadata: Record<string, unknown> = {}
) => {
  try {
    const userId = await getUserId();
    const sessionId = await getSessionId();
    
    const conversionEvent = {
      experiment_id: experimentId,
      conversion_type: conversionType,
      value: value || 0,
      user_id: userId,
      session_id: sessionId,
      converted_at: Date.now(),
      metadata
    };

    // Chrome Storage に保存
    const storageKey = `conversion_${experimentId}_${Date.now()}`;
    await browser.storage.local.set({ [storageKey]: conversionEvent });

    // GA4 イベント送信
    const { demoGA4Client } = await import('./analytics/ga4');
    await demoGA4Client.trackEvent('experiment_conversion', conversionEvent);

    console.log(`🎯 Experiment conversion recorded: ${experimentId} -> ${conversionType}`);
    return conversionEvent;
  } catch (error) {
    console.error('Failed to record experiment conversion:', error);
    return null;
  }
};

// 実験統計取得
export const getExperimentAnalytics = async () => {
  try {
    const storage = await browser.storage.local.get();
    const experiments: UserExperiment[] = [];
    const conversions: any[] = [];

    // ストレージから実験データを抽出
    Object.keys(storage).forEach(key => {
      if (key.startsWith('experiment_')) {
        experiments.push(storage[key]);
      } else if (key.startsWith('conversion_')) {
        conversions.push(storage[key]);
      }
    });

    return {
      experiments,
      conversions,
      total_experiments: experiments.length,
      total_conversions: conversions.length
    };
  } catch (error) {
    console.error('Failed to get experiment analytics:', error);
    return {
      experiments: [],
      conversions: [],
      total_experiments: 0,
      total_conversions: 0
    };
  }
};

// Chrome Extension用 実験割り当て取得（メッセージング対応）
export const getExperimentAssignment = async (userId?: string) => {
  try {
    const actualUserId = userId || await getUserId();
    const assignments: Record<string, 'control' | 'treatment'> = {};

    // 全実験について割り当てを取得
    for (const experimentId of Object.keys(EXPERIMENTS)) {
      assignments[experimentId] = await getExperimentVariant(experimentId);
    }

    return {
      user_id: actualUserId,
      assignments,
      total_experiments: Object.keys(EXPERIMENTS).length
    };
  } catch (error) {
    console.error('Failed to get experiment assignments:', error);
    return {
      user_id: 'error',
      assignments: {},
      total_experiments: 0
    };
  }
};

export { EXPERIMENTS }; 
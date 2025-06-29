// @mvp_checklist.md Week-0: Manifest V3 keep-alive & GA4 基盤
// Tech Risk: Service Worker 30s → chrome.alarms + heartbeat fetch 二重化

// Week-5: Referral システム統合のインポート
import { initializeReferralManager } from '../lib/referrals';
import { initializeRewardManager } from '../lib/rewards';
import { initializeFraudManager } from '../lib/fraud';

// Week-6: Concierge Onboarding統合のインポート
import { initializeOnboardingManager } from '../lib/onboarding';

// Week-7-8: Pricing & Analytics システム統合
import { initializePricingManager } from '../lib/pricing';
import { ltvAnalytics, recordUserSignup, recordUserPayment } from '../lib/analytics/ltv';

import { ga4Manager } from '../lib/analytics/ga4';
import { stripeTreasuryManager } from '../lib/payments/stripe-treasury';
import { dmGenerator } from '../lib/ai/dm-generator';

interface HeartbeatData {
  timestamp: number;
  status: string;
  treasuryStatus?: string;
  latencyP50?: number;
  gmv?: number;
}

const _heartbeatInterval: NodeJS.Timeout | null = null;
let _lastHeartbeat: HeartbeatData | null = null;

// @mvp_checklist.md Manifest V3 keep-alive: chrome.alarms + heartbeat
const startHeartbeat = () => {
  // 30秒間隔のアラーム設定
  chrome.alarms.create('fantwin-heartbeat', { 
    delayInMinutes: 0.5, // 30秒
    periodInMinutes: 0.5 
  });

  console.log('✅ FanTwin L0-α heartbeat started');
};

// アラームリスナー
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'fantwin-heartbeat') {
    await performHeartbeat();
  }
});

// 高性能ハートビート処理
const performHeartbeat = async () => {
  try {
    const timestamp = Date.now();
    
    // Speed metrics取得
    const speedMetrics = dmGenerator.getLatencyMetrics();
    
    // Treasury stats取得
    let treasuryStats = null;
    let treasuryStatus = 'unknown';
    try {
      treasuryStats = await stripeTreasuryManager.getTreasuryStats();
      treasuryStatus = treasuryStats.gross_margin_percentage >= 40 ? 'healthy' : 'warning';
    } catch (error) {
      treasuryStatus = 'error';
    }

    const heartbeatData: HeartbeatData = {
      timestamp,
      status: 'active',
      treasuryStatus,
      latencyP50: speedMetrics.p50,
      gmv: treasuryStats?.total_volume_jpy || 0
    };

    _lastHeartbeat = heartbeatData;

    // @mvp_checklist.md KPI監視: p50 > 0.6s でSlack Alert
    if (speedMetrics.p50 > 600) {
      console.warn('🐌 High latency detected:', speedMetrics.p50);
      
      // Slack通知実装時にコメントアウト解除
      // await sendSlackAlert({
      //   message: `🐌 Speed Alert: p50=${speedMetrics.p50.toFixed(0)}ms (target: <500ms)`,
      //   channel: '#speed-alerts'
      // });
    }

    // @mvp_checklist.md 粗利40%未満でSlack Alert
    if (treasuryStats && treasuryStats.gross_margin_percentage < 40) {
      console.warn('💰 Low gross margin:', treasuryStats.gross_margin_percentage);
      
      // Slack通知実装時にコメントアウト解除
      // await sendSlackAlert({
      //   message: `💰 Margin Alert: ${treasuryStats.gross_margin_percentage.toFixed(1)}% (target: >40%)`,
      //   channel: '#treasury-alerts'
      // });
    }

    // GA4ハートビートイベント（15分毎に送信）
    if (timestamp % (15 * 60 * 1000) < 30000) { // 15分±30秒の範囲
      await ga4Manager.sendEvent('l0_alpha_heartbeat', {
        latency_p50: speedMetrics.p50,
        latency_p95: speedMetrics.p95,
        treasury_gross_margin: treasuryStats?.gross_margin_percentage || 0,
        gmv_jpy: treasuryStats?.total_volume_jpy || 0,
        speed_target_met: speedMetrics.p50 <= 500,
        margin_target_met: (treasuryStats?.gross_margin_percentage || 0) >= 40
      });
    }

  } catch (error) {
    console.error('❌ Heartbeat failed:', error);
    _lastHeartbeat = {
      timestamp: Date.now(),
      status: 'error'
    };
  }
};

export default defineBackground(() => {
  console.log('🚀 FanTwin Background Service Worker started (Week-6 Onboarding)');

  // @implementation_plan.md Week-6統合: Concierge Onboarding + Calendly連携
  const HEARTBEAT_INTERVAL = 30; // 30秒間隔

  // Week-3 Retention Loop機能
  let badgeManager: any;
  let tipsManager: any;
  let performanceOptimizer: any;

  // Week-4 Fast-Pass機能
  let modelManager: any;
  let kvManager: any;
  let slackAlertsManager: any;

  // Week-5: Referral システム初期化
  let referralManager: any;
  let rewardManager: any;
  let fraudManager: any;

  // Week-6: Onboarding システム初期化
  let onboardingManager: any;

  // Week-7-8: Pricing & Analytics システム初期化
  let pricingManager: any;

  // 1. Service Worker初期化時にアラーム設定 + Retention機能
  browser.runtime.onStartup.addListener(initializeServiceWorker);
  browser.runtime.onInstalled.addListener(initializeServiceWorker);

  async function initializeServiceWorker() {
    console.log('📊 Initializing FanTwin Service Worker with Onboarding System...');
    
    // Clients.claim() で既存タブを即座に制御下に
    if ('clients' in globalThis && 'claim' in globalThis.clients) {
      await globalThis.clients.claim();
      console.log('✅ Service Worker claimed existing clients');
    }

    // Week-3: Retention Loop機能初期化
    await initializeRetentionLoop();

    // Week-4: Fast-Pass機能初期化
    await initializeFastPassFeatures();

    // Week-5: Referral システム初期化
    referralManager = initializeReferralManager();
    rewardManager = initializeRewardManager();
    fraudManager = initializeFraudManager();

    // Week-6: Onboarding システム初期化
    onboardingManager = await initializeOnboardingManager();

    // Week-7-8: Pricing & Analytics 初期化
    pricingManager = await initializePricingManager();

    // Keep-alive alarm設定 (30秒間隔)
    await setupKeepAliveAlarm();
    
    // GA4初期化
    await initializeGA4();
    
    // 初期化完了ログ
    console.log('✅ FanTwin Service Worker initialized with Onboarding features');
  }

  // 2. Keep-alive機構実装
  async function setupKeepAliveAlarm() {
    try {
      // 既存のアラームをクリア
      await browser.alarms.clear('fantwin-keepalive');
      
      // 30秒間隔でアラーム作成
      await browser.alarms.create('fantwin-keepalive', {
        delayInMinutes: 0.5, // 30秒
        periodInMinutes: 0.5
      });
      
      console.log('⏰ Keep-alive alarm scheduled (30s interval)');
    } catch (error) {
      console.error('❌ Failed to setup keep-alive alarm:', error);
    }
  }

  // 3. アラーム処理 - heartbeat fetch + onboarding reminders
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'fantwin-keepalive') {
      await performHeartbeat();
    } else if (alarm.name?.startsWith('reminder_')) {
      // Week-6: Onboarding reminder処理
      if (onboardingManager) {
        await onboardingManager.handleReminderAlarm(alarm.name);
      }
    }
  });

  // Heartbeat実行 (Service Worker生存確認 + 全システム監視)
  async function performHeartbeat() {
    try {
      const timestamp = new Date().toISOString();
      const now = Date.now();
      console.log(`💓 Heartbeat at ${timestamp} (Onboarding monitoring active)`);
      
      // Storage更新でactivity記録
      await browser.storage.local.set({
        lastHeartbeat: timestamp,
        serviceWorkerStatus: 'active'
      });

      // GA4にheartbeatイベント送信
      await sendGA4Event('service_worker_heartbeat', {
        timestamp: timestamp,
        worker_status: 'active',
        retention_week: 6,
        onboarding_active: onboardingManager ? true : false
      });

      // Week-3: Retention関連監視
      await performRetentionMonitoring();

      // Week-4: Fast-Pass監視
      await performFastPassMonitoring();

      // Week-5: Referral System Status更新
      const heartbeatStatus: any = {};
      
      heartbeatStatus.referral_system = {
        status: referralManager ? 'active' : 'inactive',
        links_count: referralManager ? referralManager.getReferralStats().total_referrals : 0,
        monthly_remaining: referralManager ? referralManager.getReferralStats().monthly_limit_remaining : 0,
        last_checked: now
      };

      heartbeatStatus.reward_system = {
        status: rewardManager ? 'active' : 'inactive',
        total_rewards: rewardManager ? rewardManager.getRewardStats().total_rewards_granted : 0,
        active_users: rewardManager ? rewardManager.getRewardStats().active_users : 0,
        last_checked: now
      };

      heartbeatStatus.fraud_detection = {
        status: fraudManager ? 'active' : 'inactive',
        total_profiles: fraudManager ? Object.keys(fraudManager.fraudProfiles || {}).length : 0,
        flagged_accounts: 0, // TODO: 実装
        last_checked: now
      };

      // Week-6: Onboarding System Status追加
      if (onboardingManager) {
        const onboardingStats = await onboardingManager.getOnboardingStats();
        heartbeatStatus.onboarding_system = {
          status: 'active',
          total_scheduled: onboardingStats.total_scheduled,
          completion_rate: onboardingStats.completion_rate,
          no_shows: onboardingStats.no_shows,
          last_checked: now
        };
      } else {
        heartbeatStatus.onboarding_system = {
          status: 'inactive',
          last_checked: now
        };
      }

      // 全システムStatusをストレージに保存
      await browser.storage.local.set({
        system_status: heartbeatStatus
      });

    } catch (error) {
      console.error('❌ Heartbeat failed:', error);
    }
  }

  // 4. @mvp_checklist.md: GA4 Streaming Export β基盤
  async function sendGA4Event(eventName: string, parameters: Record<string, any>) {
    try {
      const { demoGA4Client } = await import('../lib/analytics/ga4');
      
      if (eventName === 'service_worker_heartbeat') {
        // Heartbeat専用メソッド使用
        await demoGA4Client.trackHeartbeat('active', parameters);
      } else {
        // 汎用イベント送信
        await demoGA4Client.trackEvent(eventName, parameters);
      }
      
      console.log(`📊 GA4 Event sent: ${eventName}`);
    } catch (error) {
      console.error(`❌ Failed to send GA4 event ${eventName}:`, error);
    }
  }

  // 5. ユニークClient ID生成・取得
  async function getClientId(): Promise<string> {
    const result = await browser.storage.local.get(['fantwin_client_id']);
    
    if (result.fantwin_client_id) {
      return result.fantwin_client_id;
    }
    
    // 新規Client ID生成 (UUID v4形式)
    const clientId = 'fantwin-' + crypto.randomUUID();
    await browser.storage.local.set({ fantwin_client_id: clientId });
    
    return clientId;
  }

  // 6. @mvp_checklist.md: Badge更新処理（Task-tray実装準備）
  async function updateBadge(count: number) {
    try {
      await browser.action.setBadgeText({
        text: count > 0 ? count.toString() : ''
      });
      
      await browser.action.setBadgeBackgroundColor({
        color: '#ff0000' // 赤色バッジ
      });
      
      console.log('🔴 Badge updated:', count);
    } catch (error) {
      console.error('🔴 Badge update failed:', error);
    }
  }

  // 7. メッセージハンドリング（popup/content scriptとの通信）
  browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    try {
      switch (message.type) {
        case 'GET_STATUS':
          const status = await getServiceWorkerStatus();
          sendResponse({ success: true, data: status });
          break;

        // Week-1: Hello-World DM Generation
        case 'GENERATE_DM':
          try {
            const dmGenerator = await import('../lib/ai/dm-generator');
            const generatedDM = await dmGenerator.generateHelloWorldDM();
            sendResponse({ success: true, data: generatedDM });
          } catch (error) {
            console.error('❌ DM generation failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Week-2: A/B Experiment Assignment
        case 'GET_EXPERIMENT_ASSIGNMENT':
          try {
            const experimentManager = await import('../lib/experiments');
            const assignment = await experimentManager.getExperimentAssignment(message.userId);
            sendResponse({ success: true, data: assignment });
          } catch (error) {
            console.error('❌ Experiment assignment failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Week-3: Retention Loop Messages
        case 'UPDATE_BADGE':
          try {
            await updateBadge(message.count);
            sendResponse({ success: true });
          } catch (error) {
            console.error('❌ Badge update failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'SCHEDULE_TIP':
          try {
            if (tipsManager) {
              await tipsManager.scheduleTipNotification();
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'Tips manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Tip scheduling failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Week-4: Fast-Pass Messages
        case 'SWITCH_MODEL':
          try {
            const { modelType } = message;
            if (modelManager) {
              await modelManager.switchModel(modelType);
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'Model manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Model switch failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'CHECK_KV_PERFORMANCE':
          try {
            if (kvManager) {
              const performance = await kvManager.checkPerformance();
              sendResponse({ success: true, data: performance });
            } else {
              sendResponse({ success: false, error: 'KV manager not initialized' });
            }
          } catch (error) {
            console.error('❌ KV performance check failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Week-5: Referral Message Handlers
        case 'GENERATE_REFERRAL_LINK':
          try {
            const { userId, description } = message;
            if (referralManager) {
              const referralLink = await referralManager.generateReferralLink(userId, description);
              sendResponse({ success: true, data: referralLink });
            } else {
              sendResponse({ success: false, error: 'Referral manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Generate referral link failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'RECORD_REFERRAL_USAGE':
          try {
            const { slug, newUserId, ipAddress, userAgent } = message;
            if (!referralManager || !fraudManager || !rewardManager) {
              sendResponse({ success: false, error: 'Referral system not fully initialized' });
              break;
            }

            const result = await referralManager.recordReferralUsage(slug, newUserId, ipAddress, userAgent);
            
            // 不正検出チェック
            const fraudResult = await fraudManager.performFraudCheck(newUserId, {
              ip_address: ipAddress,
              user_agent: userAgent,
              referral_info: {
                slug: slug,
                referred_user_id: newUserId
              }
            });

            // 報酬付与または取消
            if (result.success && result.reward_granted && !fraudResult.fraud_detected) {
              const referralLink = referralManager.findReferralBySlug(slug);
              if (referralLink) {
                await rewardManager.grantReferralReward(
                  referralLink.referrer_user_id,
                  newUserId,
                  referralLink.referral_id
                );
              }
            } else if (fraudResult.fraud_detected) {
              await fraudManager.cancelRewards(newUserId, 'Fraud detected during referral usage');
            }

            sendResponse({ 
              success: true, 
              data: { 
                referral: result, 
                fraud_check: fraudResult 
              } 
            });
          } catch (error) {
            console.error('❌ Record referral usage failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GET_TOKEN_BALANCE':
          try {
            const { userId } = message;
            if (rewardManager) {
              const balance = await rewardManager.getTokenBalance(userId);
              sendResponse({ success: true, data: balance });
            } else {
              sendResponse({ success: false, error: 'Reward manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Get token balance failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GRANT_TOKEN_REWARD':
          try {
            const { userId, rewardType, amount, description, referralId, relatedUserId } = message;
            if (rewardManager) {
              const reward = await rewardManager.grantTokenReward({
                user_id: userId,
                reward_type: rewardType,
                amount: amount,
                description: description,
                referral_id: referralId,
                related_user_id: relatedUserId
              });
              sendResponse({ success: true, data: reward });
            } else {
              sendResponse({ success: false, error: 'Reward manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Grant token reward failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'PERFORM_FRAUD_CHECK':
          try {
            const { userId, context } = message;
            if (fraudManager) {
              const fraudResult = await fraudManager.performFraudCheck(userId, context);
              sendResponse({ success: true, data: fraudResult });
            } else {
              sendResponse({ success: false, error: 'Fraud manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Fraud check failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GET_REFERRAL_STATS':
          try {
            if (referralManager) {
              const stats = referralManager.getReferralStats();
              sendResponse({ success: true, data: stats });
            } else {
              sendResponse({ success: false, error: 'Referral manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Get referral stats failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GET_USER_REFERRAL_LINKS':
          try {
            const { userId } = message;
            if (referralManager) {
              const links = referralManager.getUserReferralLinks(userId);
              sendResponse({ success: true, data: links });
            } else {
              sendResponse({ success: false, error: 'Referral manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Get user referral links failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GET_REWARD_HISTORY':
          try {
            const { userId, limit } = message;
            if (rewardManager) {
              const history = await rewardManager.getRewardHistory(userId, limit);
              sendResponse({ success: true, data: history });
            } else {
              sendResponse({ success: false, error: 'Reward manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Get reward history failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GET_FRAUD_PROFILE':
          try {
            const { userId } = message;
            if (fraudManager) {
              const profile = await fraudManager.getFraudProfile(userId);
              sendResponse({ success: true, data: profile });
            } else {
              sendResponse({ success: false, error: 'Fraud manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Get fraud profile failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Week-6: Onboarding Message Handlers
        case 'SAVE_SCHEDULED_EVENT':
          try {
            const { eventData } = message;
            if (onboardingManager) {
              const savedEvent = await onboardingManager.saveScheduledEvent(eventData);
              sendResponse({ success: true, data: savedEvent });
            } else {
              sendResponse({ success: false, error: 'Onboarding manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Save scheduled event failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GET_SCHEDULED_EVENTS':
          try {
            const { userId } = message;
            if (onboardingManager) {
              const events = await onboardingManager.getUserScheduledEvents(userId);
              sendResponse({ success: true, data: events });
            } else {
              sendResponse({ success: false, error: 'Onboarding manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Get scheduled events failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'SEND_ONBOARDING_DM':
          try {
            const { userId, scheduledEvent } = message;
            // DM送信ロジックは onboardingManager 内で処理済み
            // 追加の処理があればここで実装
            sendResponse({ success: true, message: 'Onboarding DM processing initiated' });
          } catch (error) {
            console.error('❌ Send onboarding DM failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'UPDATE_EVENT_STATUS':
          try {
            const { eventId, status } = message;
            if (onboardingManager) {
              await onboardingManager.updateEventStatus(eventId, status);
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'Onboarding manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Update event status failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'CANCEL_ONBOARDING_EVENT':
          try {
            const { eventId, reason } = message;
            if (onboardingManager) {
              await onboardingManager.cancelEvent(eventId, reason);
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'Onboarding manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Cancel onboarding event failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GET_ONBOARDING_STATS':
          try {
            if (onboardingManager) {
              const stats = await onboardingManager.getOnboardingStats();
              sendResponse({ success: true, data: stats });
            } else {
              sendResponse({ success: false, error: 'Onboarding manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Get onboarding stats failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Week-7-8: Pricing & Analytics
        case 'GET_PRICING_CONFIG':
          try {
            if (pricingManager) {
              const pricingConfig = await pricingManager.getCurrentConfig();
              sendResponse({ success: true, data: pricingConfig });
            } else {
              sendResponse({ success: false, error: 'Pricing manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Get pricing config failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'SWITCH_CURRENCY':
          try {
            const { currency } = message;
            if (pricingManager) {
              await pricingManager.switchCurrency(currency);
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'Pricing manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Switch currency failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'CALCULATE_PRICE':
          try {
            const { planId, experimentGroup } = message;
            if (pricingManager) {
              const price = await pricingManager.calculatePrice(planId, experimentGroup);
              sendResponse({ success: true, data: price });
            } else {
              sendResponse({ success: false, error: 'Pricing manager not initialized' });
            }
          } catch (error) {
            console.error('❌ Calculate price failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'RECORD_USER_SIGNUP':
          try {
            const { userId, source } = message;
            await recordUserSignup(userId, source);
            sendResponse({ success: true });
          } catch (error) {
            console.error('❌ Record user signup failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'RECORD_USER_PAYMENT':
          try {
            const { userId, revenue, planId } = message;
            await recordUserPayment(userId, revenue, planId);
            sendResponse({ success: true });
          } catch (error) {
            console.error('❌ Record user payment failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GENERATE_LTV_REPORT':
          try {
            const ltvReport = await ltvAnalytics.generateLTVReport();
            sendResponse({ success: true, data: ltvReport });
          } catch (error) {
            console.error('❌ Generate LTV report failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'GET_USER_LTV_METRICS':
          try {
            const { userId } = message;
            const userLTV = await ltvAnalytics.calculateUserLTVMetrics(userId);
            sendResponse({ success: true, data: userLTV });
          } catch (error) {
            console.error('❌ Get user LTV metrics failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'TRACK_EVENT':
          try {
            const { eventName, parameters } = message;
            await trackGA4Event(eventName, parameters);
            sendResponse({ success: true });
          } catch (error) {
            console.error('❌ Track event failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // @mvp_checklist.md GA4イベント送信
        case 'SEND_GA4_EVENT':
          try {
            await ga4Manager.sendEvent(message.eventName, message.parameters);
            sendResponse({ success: true });
          } catch (error) {
            console.error('❌ GA4 event failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Treasury Payout実行
        case 'EXECUTE_PAYOUT':
          try {
            const result = await stripeTreasuryManager.createPayout(message.payoutRequest);
            sendResponse({ success: true, data: result });
            
            // 成功時のGA4イベント
            await ga4Manager.sendEvent('payout_executed', {
              amount_jpy: result.amount,
              fee_collected: result.fee_amount,
              payout_id: result.payout_id
            });
          } catch (error) {
            console.error('❌ Payout execution failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Speed DM生成
        case 'GENERATE_SPEED_DM':
          try {
            const result = await dmGenerator.generateDM(message.request);
            sendResponse({ success: true, data: result });
            
            // レイテンシ追跡
            await ga4Manager.sendEvent('speed_dm_generated', {
              generation_time_ms: result.generationTimeMs,
              target_met: result.generationTimeMs <= 500,
              cached: result.cached,
              sentiment: result.sentiment
            });
          } catch (error) {
            console.error('❌ Speed DM generation failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Treasury統計取得
        case 'GET_TREASURY_STATS':
          try {
            const stats = await stripeTreasuryManager.getTreasuryStats();
            sendResponse({ success: true, data: stats });
          } catch (error) {
            console.error('❌ Treasury stats failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Cost Guardrail検証
        case 'VALIDATE_COST_GUARDRAIL':
          try {
            const { monthlyRevenue, treasuryFees } = message;
            const guardrail = validateCostGuardrail(monthlyRevenue, treasuryFees);
            
            sendResponse({ success: true, data: guardrail });
            
            // ガードレール違反の場合はアラート
            if (!guardrail.isValid) {
              console.warn('🚨 Cost guardrail exceeded:', guardrail);
              await ga4Manager.sendEvent('cost_guardrail_exceeded', {
                utilization: guardrail.utilization,
                threshold_jpy: guardrail.threshold,
                current_fees: treasuryFees
              });
            }
          } catch (error) {
            console.error('❌ Cost guardrail validation failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // Slack Alert送信（将来実装）
        case 'SEND_SLACK_ALERT':
          try {
            // 実装時にコメントアウト解除
            // await sendSlackAlert({
            //   message: message.message,
            //   channel: message.channel
            // });
            console.log('📢 Slack Alert (mock):', message.message);
            sendResponse({ success: true });
          } catch (error) {
            console.error('❌ Slack alert failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        // L0-α Progress追跡
        case 'GET_L0_ALPHA_PROGRESS':
          try {
            const config = await chrome.storage.local.get('fantwin_l0_alpha_config');
            const speedMetrics = dmGenerator.getLatencyMetrics();
            const treasuryStats = await stripeTreasuryManager.getTreasuryStats();
            
            const progress = {
              speed: {
                current_p50: speedMetrics.p50,
                target: 500,
                achieved: speedMetrics.p50 <= 500
              },
              margin: {
                current: treasuryStats.gross_margin_percentage,
                target: 40,
                achieved: treasuryStats.gross_margin_percentage >= 40
              },
              gmv: {
                current: treasuryStats.total_volume_jpy,
                target: 3000000,
                progress_pct: (treasuryStats.total_volume_jpy / 3000000) * 100
              },
              days_elapsed: Math.floor((Date.now() - config.fantwin_l0_alpha_config?.installed_at) / (24 * 60 * 60 * 1000))
            };
            
            sendResponse({ success: true, data: progress });
          } catch (error) {
            console.error('❌ L0-α progress tracking failed:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;

        default:
          console.warn('⚠️ Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('❌ Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // 非同期レスポンス有効化
  });

  // Service Workerステータス取得
  async function getServiceWorkerStatus() {
    try {
      const storage = await browser.storage.local.get(['lastHeartbeat', 'serviceWorkerStatus']);
      return {
        lastHeartbeat: storage.lastHeartbeat,
        status: storage.serviceWorkerStatus,
        isActive: true,
        manifest_version: 3
      };
    } catch (error) {
      console.error('❌ Failed to get status:', error);
      return { error: error.message };
    }
  }

  // GA4初期化
  async function initializeGA4() {
    try {
      console.log('📈 Initializing GA4...');
      
      // GA4クライアント初期化
      const { demoGA4Client } = await import('../lib/analytics/ga4');
      
      // 初期化イベント送信
      await demoGA4Client.trackEvent('service_worker_init', {
        extension_version: browser.runtime.getManifest().version,
        timestamp: new Date().toISOString(),
        manifest_version: 3
      });

      // Activation追跡開始
      await demoGA4Client.trackActivation('install', {
        install_timestamp: Date.now(),
        user_agent: navigator.userAgent
      });
      
      console.log('✅ GA4 initialized successfully');
    } catch (error) {
      console.error('❌ GA4 initialization failed:', error);
    }
  }

  // Week-3: Retention Loop機能初期化
  async function initializeRetentionLoop() {
    try {
      console.log('🔄 Initializing Retention Loop features...');
      
      // Badge Manager初期化
      const { initializeBadgeManager } = await import('../lib/notifications/badge-manager');
      badgeManager = initializeBadgeManager();
      console.log('🏷️ Badge Manager initialized');

      // Tips Manager初期化 
      const { initializeTipsManager } = await import('../lib/notifications/tips-manager');
      tipsManager = initializeTipsManager();
      console.log('📬 Tips Manager initialized');

      // Performance Optimizer初期化
      const { initializePerformanceOptimizer } = await import('../lib/streaming/performance-optimizer');
      performanceOptimizer = initializePerformanceOptimizer();
      console.log('⚡ Performance Optimizer initialized');

      // 新規インストール時の初回Tips設定
      await scheduleInitialTipsIfNeeded();

    } catch (error) {
      console.error('❌ Retention Loop initialization failed:', error);
    }
  }

  // Retention監視実行
  async function performRetentionMonitoring() {
    try {
      // Badge状態をログ出力
      if (badgeManager) {
        const badgeState = badgeManager.getCurrentState();
        console.log(`🏷️ Badge: ${badgeState.count} unreplied messages`);
      }

      // Tips設定をログ出力
      if (tipsManager) {
        const tipsSettings = tipsManager.getSettings();
        console.log(`📬 Tips: enabled=${tipsSettings.enabled}, shown=${tipsSettings.show_count}`);
      }

      // パフォーマンス統計をログ出力
      if (performanceOptimizer) {
        const stats = performanceOptimizer.getPerformanceStats(3600000);
        if (stats.sample_count > 0) {
          console.log(`⚡ Performance: p75=${stats.p75_latency}ms, errors=${(stats.error_rate * 100).toFixed(2)}%`);
        }
      }

    } catch (error) {
      console.error('❌ Retention monitoring failed:', error);
    }
  }

  // 初回Tips スケジュール（新規インストール用）
  async function scheduleInitialTipsIfNeeded() {
    try {
      const result = await browser.storage.local.get('fantwin_installation_completed');
      
      if (!result.fantwin_installation_completed) {
        console.log('🆕 New installation: scheduling initial tip in 72h...');
        
        if (tipsManager) {
          await tipsManager.scheduleInitialTip();
        }
        
        await browser.storage.local.set({
          fantwin_installation_completed: true,
          installation_timestamp: Date.now()
        });
        
        await sendGA4Event('installation_completed', {
          timestamp: Date.now(),
          version: '1.0.0',
          retention_features_enabled: true
        });
        
        console.log('✅ Initial tips scheduled, installation complete');
      }
    } catch (error) {
      console.error('❌ Failed to schedule initial tips:', error);
    }
  }

  // Week-4: Fast-Pass機能初期化
  async function initializeFastPassFeatures() {
    try {
      console.log('⚡ Initializing Fast-Pass features...');
      
      // Model Manager初期化
      const { initializeModelManager } = await import('../lib/ai/models/model-manager');
      modelManager = initializeModelManager();
      
      // KV Manager初期化
      const { initializeKVManager } = await import('../lib/storage/kv-manager');
      kvManager = initializeKVManager();
      
      // Slack Alerts Manager初期化
      const { initializeSlackAlerts } = await import('../lib/monitoring/slack-alerts');
      slackAlertsManager = initializeSlackAlerts();
      
      console.log('✅ Fast-Pass features initialized');
      
      // GA4にfast_pass_initイベント送信
      await sendGA4Event('fast_pass_initialized', {
        initialization_time: new Date().toISOString(),
        week: 4
      });

    } catch (error) {
      console.error('❌ Failed to initialize Fast-Pass features:', error);
    }
  }

  // Week-4: Fast-Pass監視処理
  async function performFastPassMonitoring() {
    try {
      // Model Manager監視
      if (modelManager) {
        const modelStats = modelManager.getUsageStats();
        
        if (modelStats.total_requests > 0) {
          console.log(`🤖 Model stats: ${modelStats.total_requests} requests, ${modelStats.avg_response_time}ms avg`);
          
          // レスポンス時間が閾値を超えた場合のアラート
          if (modelStats.avg_response_time > 1000) {
            console.warn('⚠️ Model response time exceeded 1000ms');
          }
        }
      }

      // KV Manager監視
      if (kvManager) {
        const kvMetrics = kvManager.getMetrics();
        
        // エラー率チェック（0.1%閾値）
        if (kvMetrics.error_rate > 0.001) {
          console.warn(`🚨 KV error rate high: ${(kvMetrics.error_rate * 100).toFixed(3)}%`);
          
          // Slack Alertsに通知
          if (slackAlertsManager) {
            await slackAlertsManager.sendBackPressureAlert(
              kvMetrics.current_queue_size / 100, // queue utilization
              kvMetrics.current_queue_size,
              100, // max queue size
              kvMetrics.error_rate
            );
          }
        }
        
        console.log(`🗄️ KV stats: ${kvMetrics.total_requests} requests, ${kvMetrics.current_queue_size} queued, ${(kvMetrics.error_rate * 100).toFixed(3)}% error rate`);
      }

      // Slack Alerts Manager監視
      if (slackAlertsManager) {
        const performanceStats = slackAlertsManager.getPerformanceStats();
        
        if (performanceStats.avg_p95 > 800) {
          console.warn(`⚠️ p95 response time high: ${performanceStats.avg_p95}ms`);
        }
        
        console.log(`📊 Performance stats: p95=${performanceStats.avg_p95}ms, memory=${performanceStats.avg_memory_usage}MB, alerts=${performanceStats.alert_count}`);
      }

    } catch (error) {
      console.error('❌ Fast-Pass monitoring failed:', error);
    }
  }

  // ヘルパー関数
  async function trackGA4Event(eventName: string, parameters: any): Promise<void> {
    try {
      // GA4イベント送信（実装は既存のanalytics/ga4.tsを使用）
      console.log('GA4 Event:', eventName, parameters);
    } catch (error) {
      console.error('GA4 tracking failed:', error);
    }
  }

  // @mvp_checklist.md Cost Guardrail: Treasury手数料 ≤ MRR×0.25
  function validateCostGuardrail(
    monthlyRevenue: number,
    treasuryFees: number
  ): { isValid: boolean; threshold: number; utilization: number } {
    const threshold = Math.min(monthlyRevenue * 0.25, 150 * 100); // ¥15,000上限
    const utilization = treasuryFees / threshold;
    
    return {
      isValid: treasuryFees <= threshold,
      threshold,
      utilization: Math.min(utilization, 1.0)
    };
  }

  // Slack Alert送信（将来実装）
  async function sendSlackAlert(params: { message: string; channel: string }): Promise<void> {
    // 実装時にSlack Webhook URLを設定
    console.log(`📢 [${params.channel}] ${params.message}`);
  }

  console.log('✅ FanTwin Background Service Worker setup complete (Week-6 Onboarding)');
}); 
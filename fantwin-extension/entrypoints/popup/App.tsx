// @mvp_checklist.md L0-α Speed-&-Cash: Embedded Payouts + p50 < 0.5s
// @implementation_plan.md Speed & Cash を掴み、そこから 72 か月で空まで跳ぶ

import React, { useState, useEffect } from 'react';
import { Zap, Send, TrendingUp, Clock, AlertCircle, CheckCircle, Settings, Target } from 'lucide-react';
import DMGeneratorComponent from '../../components/features/DMGenerator';
import EmbeddedPayouts from '../../components/features/EmbeddedPayouts';
import MVPValidationDashboard from '../../components/features/MVPValidationDashboard';
import NPSSurvey from '../../components/features/NPSSurvey';
import { dmGenerator } from '../../lib/ai/dm-generator';
import { PayoutResult, TreasuryStats } from '../../lib/payments/stripe-treasury';
import { wowRateManager } from '../../lib/analytics/wow-rate-manager';

interface AppState {
  isAuthenticated: boolean;
  activationCompleted: boolean;
  currentTab: 'speed' | 'cash' | 'mvp';
  showNPSSurvey: boolean;
}

interface ServiceWorkerStatus {
  lastHeartbeat?: string;
  status?: string;
  isActive: boolean;
  manifest_version: number;
  error?: string;
}

interface SpeedMetrics {
  p50: number;
  p95: number;
  targetMet: boolean;
  totalGenerated: number;
}

function App() {
  const [state, setState] = useState<AppState>({
    isAuthenticated: false,
    activationCompleted: false,
    currentTab: 'speed',
    showNPSSurvey: false
  });
  
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<ServiceWorkerStatus | null>(null);
  const [speedMetrics, setSpeedMetrics] = useState<SpeedMetrics | null>(null);
  const [treasuryStats, setTreasuryStats] = useState<TreasuryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Service Worker状態を取得
  const checkServiceWorkerStatus = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'GET_STATUS'
      });
      
      if (response.success) {
        setServiceWorkerStatus(response.data);
      } else {
        console.error('Failed to get service worker status:', response.error);
      }
    } catch (error) {
      console.error('Error checking service worker status:', error);
      setServiceWorkerStatus({
        isActive: false,
        manifest_version: 3,
        error: 'Failed to connect to service worker'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Speed metrics取得
  const loadSpeedMetrics = async () => {
    try {
      const metrics = dmGenerator.getLatencyMetrics();
      setSpeedMetrics({
        p50: metrics.p50,
        p95: metrics.p95,
        targetMet: metrics.p50 <= 500, // 0.5s目標
        totalGenerated: metrics.count
      });
    } catch (error) {
      console.error('❌ Failed to load speed metrics:', error);
    }
  };

  // コンポーネント初期化
  useEffect(() => {
    checkServiceWorkerStatus();
    loadSpeedMetrics();
    
    // GA4イベント送信
    chrome.runtime.sendMessage({
      type: 'SEND_GA4_EVENT',
      eventName: 'popup_opened_l0_alpha',
      parameters: {
        timestamp: Date.now(),
        version: 'speed_cash_l0_alpha'
      }
    });

    // NPS調査メッセージリスナー
    const handleNPSMessage = (message: any) => {
      if (message.type === 'SHOW_NPS_SURVEY') {
        setState(prev => ({ ...prev, showNPSSurvey: true }));
      }
    };
    
    chrome.runtime.onMessage.addListener(handleNPSMessage);

    // 30秒毎に状態更新
    const interval = setInterval(() => {
      checkServiceWorkerStatus();
      loadSpeedMetrics();
    }, 30000);
    
    return () => {
      clearInterval(interval);
      chrome.runtime.onMessage.removeListener(handleNPSMessage);
    };
  }, []);

  const handleLogin = async () => {
    setState(prev => ({ ...prev, isAuthenticated: true }));
    
    // @mvp_checklist.md D1 Activation追跡
    chrome.runtime.sendMessage({
      type: 'SEND_GA4_EVENT',
      eventName: 'login_success_l0_alpha',
      parameters: { timestamp: Date.now() }
    });
  };

  const handlePayoutSuccess = (result: PayoutResult) => {
    console.log('✅ Payout completed:', result);
    
    // @mvp_checklist.md GMV追跡
    chrome.runtime.sendMessage({
      type: 'SEND_GA4_EVENT',
      eventName: 'gmv_generated',
      parameters: {
        amount_jpy: result.amount,
        fee_collected: result.fee_amount,
        gross_margin: (result.fee_amount / result.amount) * 100
      }
    });

    // ペイアウト成功後にWow体験を記録
    wowRateManager.recordWowEvent({
      wow_trigger: 'payout_success',
      wow_intensity: 5,
      context: {
        payout_amount_jpy: result.amount,
        cost_saved_percentage: 99, // 1%手数料なので99%節約
        feature_used: 'embedded_payouts'
      }
    });
  };

  const handleTreasuryStatsUpdate = (stats: TreasuryStats) => {
    setTreasuryStats(stats);
    
    // 粗利40%未満の場合は警告表示
    if (stats.gross_margin_percentage < 40) {
      console.warn('🚨 Gross margin below target:', stats.gross_margin_percentage);
    }
  };

  const handleNPSClose = () => {
    setState(prev => ({ ...prev, showNPSSurvey: false }));
  };

  const handleNPSSubmit = (score: number, feedback?: string) => {
    console.log(`📊 NPS submitted: ${score}/10`);
    // WowRateManagerが既に処理済み
  };

  // Service Worker状態インジケータ
  const ServiceWorkerIndicator = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2 text-gray-500 text-xs">
          <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-500"></div>
          <span>初期化中...</span>
        </div>
      );
    }

    if (!serviceWorkerStatus?.isActive) {
      return (
        <div className="flex items-center space-x-2 text-red-500 text-xs">
          <AlertCircle size={12} />
          <span>Service Worker 停止</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 text-green-500 text-xs">
        <CheckCircle size={12} />
        <span>稼働中</span>
      </div>
    );
  };

  // ログイン前画面
  if (!state.isAuthenticated) {
    return (
      <div className="w-96 h-96 bg-gradient-to-br from-blue-50 to-green-50 p-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-blue-600 mr-2" />
            <h1 className="text-xl font-bold text-gray-900">FanTwin</h1>
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">L0-α</span>
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            Speed-&-Cash: AI DM + Embedded Payouts
          </p>

          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">60日目標</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>GMV:</span>
                <span className="font-bold text-green-600">¥3,000,000</span>
              </div>
              <div className="flex justify-between">
                <span>粗利率:</span>
                <span className="font-bold text-green-600">40%+</span>
              </div>
              <div className="flex justify-between">
                <span>p50レイテンシ:</span>
                <span className="font-bold text-blue-600">&lt; 0.5s</span>
              </div>
              <div className="flex justify-between">
                <span>D1 Activation:</span>
                <span className="font-bold text-purple-600">70%</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors mb-4"
          >
            Speed & Cash 開始
          </button>

          <ServiceWorkerIndicator />
        </div>
      </div>
    );
  }

  // メインダッシュボード
  return (
    <div className="w-96 h-96 bg-white overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="w-6 h-6 mr-2" />
            <div>
              <h1 className="text-lg font-bold">FanTwin L0-α</h1>
              <p className="text-xs opacity-90">Speed & Cash</p>
            </div>
          </div>
          <ServiceWorkerIndicator />
        </div>
      </div>

      {/* KPI概要 */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white p-2 rounded shadow-sm">
            <div className="text-xs text-gray-600">Speed</div>
            <div className={`text-sm font-bold ${speedMetrics?.targetMet ? 'text-green-600' : 'text-red-500'}`}>
              {speedMetrics ? `${speedMetrics.p50.toFixed(0)}ms` : '-'}
            </div>
          </div>
          
          <div className="bg-white p-2 rounded shadow-sm">
            <div className="text-xs text-gray-600">Gross</div>
            <div className={`text-sm font-bold ${treasuryStats && treasuryStats.gross_margin_percentage >= 40 ? 'text-green-600' : 'text-red-500'}`}>
              {treasuryStats ? `${treasuryStats.gross_margin_percentage.toFixed(1)}%` : '-'}
            </div>
          </div>
          
          <div className="bg-white p-2 rounded shadow-sm">
            <div className="text-xs text-gray-600">GMV</div>
            <div className="text-sm font-bold text-blue-600">
              {treasuryStats ? `¥${Math.round(treasuryStats.total_volume_jpy / 1000)}k` : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex border-b">
        <button
          onClick={() => setState(prev => ({ ...prev, currentTab: 'speed' }))}
          className={`flex-1 py-2 px-3 text-sm font-medium ${state.currentTab === 'speed' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          <Clock className="w-4 h-4 inline mr-1" />
          Speed
        </button>
        <button
          onClick={() => setState(prev => ({ ...prev, currentTab: 'cash' }))}
          className={`flex-1 py-2 px-3 text-sm font-medium ${state.currentTab === 'cash' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600'}`}
        >
          <Send className="w-4 h-4 inline mr-1" />
          Cash
        </button>
        <button
          onClick={() => setState(prev => ({ ...prev, currentTab: 'mvp' }))}
          className={`flex-1 py-2 px-3 text-sm font-medium ${state.currentTab === 'mvp' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-600'}`}
        >
          <Target className="w-4 h-4 inline mr-1" />
          MVP
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-y-auto p-4">
        {state.currentTab === 'speed' && (
          <div className="space-y-4">
            <h3 className="text-md font-semibold flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-600" />
              高速DM生成 (p50 &lt; 0.5s)
            </h3>
            <DMGeneratorComponent
              onGenerationComplete={(result) => {
                loadSpeedMetrics();
                setState(prev => ({ ...prev, activationCompleted: true }));
                
                // DM生成完了時にWow体験を記録
                wowRateManager.recordWowEvent({
                  wow_trigger: 'dm_generation_speed',
                  wow_intensity: result.responseTime < 300 ? 5 : 4,
                  context: {
                    dm_generation_time_ms: result.responseTime,
                    feature_used: 'dm_generator'
                  }
                });
              }}
            />
          </div>
        )}

        {state.currentTab === 'cash' && (
          <div className="space-y-4">
            <h3 className="text-md font-semibold flex items-center">
              <Send className="w-4 h-4 mr-2 text-green-600" />
              Embedded Payouts (1%手数料)
            </h3>
            <EmbeddedPayouts
              onPayoutSuccess={handlePayoutSuccess}
              onStatsUpdate={handleTreasuryStatsUpdate}
            />
          </div>
        )}

        {state.currentTab === 'mvp' && (
          <div className="space-y-4">
            <h3 className="text-md font-semibold flex items-center">
              <Target className="w-4 h-4 mr-2 text-purple-600" />
              MVP検証 (L0-α)
            </h3>
            <div className="bg-white rounded-lg -m-4">
              <MVPValidationDashboard />
            </div>
          </div>
        )}
      </div>
      
      {/* NPS Survey Overlay */}
      <NPSSurvey
        isVisible={state.showNPSSurvey}
        trigger="manual"
        onClose={handleNPSClose}
        onSubmit={handleNPSSubmit}
      />
    </div>
  );
}

export default App; 
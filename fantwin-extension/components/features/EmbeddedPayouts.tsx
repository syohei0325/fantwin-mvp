// @mvp_checklist.md Embedded-Payouts β: 送金成功5件・手数料1%で粗利≥40%
// @implementation_plan.md L0-α Speed-&-Cash: 即日1%送金

import React, { useState, useEffect } from 'react';
import { Send, TrendingUp, AlertCircle, CheckCircle, DollarSign, Clock } from 'lucide-react';
import { stripeTreasuryManager, PayoutRequest, PayoutResult, TreasuryStats } from '../../lib/payments/stripe-treasury';

interface EmbeddedPayoutsProps {
  onPayoutSuccess?: (result: PayoutResult) => void;
  onStatsUpdate?: (stats: TreasuryStats) => void;
}

export default function EmbeddedPayouts({ onPayoutSuccess, onStatsUpdate }: EmbeddedPayoutsProps) {
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    recipientName: '',
    recipientEmail: '',
    accountNumber: '',
    bankCode: '',
    description: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [recentPayouts, setRecentPayouts] = useState<PayoutResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Treasury統計の初期読み込み
  useEffect(() => {
    loadTreasuryStats();
  }, []);

  const loadTreasuryStats = async () => {
    try {
      const treasuryStats = await stripeTreasuryManager.getTreasuryStats();
      setStats(treasuryStats);
      onStatsUpdate?.(treasuryStats);
    } catch (error) {
      console.error('❌ Failed to load treasury stats:', error);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const amount = parseInt(payoutForm.amount);
      
      if (amount < 100) {
        throw new Error('最小送金額は¥100です');
      }

      if (amount > 50000) {
        throw new Error('1日の送金上限は¥50,000です');
      }

      const request: PayoutRequest = {
        amount,
        recipient: {
          name: payoutForm.recipientName,
          email: payoutForm.recipientEmail,
          bank_account: {
            account_number: payoutForm.accountNumber,
            routing_number: payoutForm.bankCode,
            account_holder_type: 'individual'
          }
        },
        description: payoutForm.description || `FanTwin payout ¥${amount.toLocaleString()}`,
        metadata: {
          source: 'fantwin_extension',
          user_agent: navigator.userAgent
        }
      };

      // 送金実行
      const result = await stripeTreasuryManager.createPayout(request);
      
      // 成功時の処理
      setRecentPayouts(prev => [result, ...prev.slice(0, 4)]);
      onPayoutSuccess?.(result);
      
      // フォームリセット
      setPayoutForm({
        amount: '',
        recipientName: '',
        recipientEmail: '',
        accountNumber: '',
        bankCode: '',
        description: ''
      });

      // 統計更新
      await loadTreasuryStats();

      // GA4イベント送信
      chrome.runtime.sendMessage({
        type: 'SEND_GA4_EVENT',
        eventName: 'embedded_payout_success',
        parameters: {
          amount_jpy: result.amount,
          fee_collected: result.fee_amount,
          payout_id: result.payout_id
        }
      });

    } catch (error) {
      console.error('❌ Payout failed:', error);
      setError(error.message);
      
      // エラー時のGA4イベント
      chrome.runtime.sendMessage({
        type: 'SEND_GA4_EVENT',
        eventName: 'embedded_payout_error',
        parameters: {
          error_message: error.message,
          amount_attempted: payoutForm.amount
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateFee = (amount: string): number => {
    const num = parseInt(amount) || 0;
    return Math.round(num * 0.01); // 1%手数料
  };

  const calculateNetAmount = (amount: string): number => {
    const num = parseInt(amount) || 0;
    return num - calculateFee(amount);
  };

  return (
    <div className="space-y-6">
      {/* @mvp_checklist.md 粗利40%監視ダッシュボード */}
      {stats && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Treasury Dashboard
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600">送金成功率</div>
              <div className="text-xl font-bold text-green-600">
                {stats.total_payouts > 0 ? 
                  Math.round((stats.successful_payouts / stats.total_payouts) * 100) : 0}%
              </div>
              <div className="text-xs text-gray-500">
                {stats.successful_payouts}/{stats.total_payouts} 件
              </div>
            </div>
            
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600">粗利率</div>
              <div className={`text-xl font-bold ${stats.gross_margin_percentage >= 40 ? 'text-green-600' : 'text-red-500'}`}>
                {stats.gross_margin_percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                目標: 40%以上
              </div>
            </div>
            
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600">総送金額</div>
              <div className="text-xl font-bold text-blue-600">
                ¥{stats.total_volume_jpy.toLocaleString()}
              </div>
            </div>
            
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600">手数料収入</div>
              <div className="text-xl font-bold text-purple-600">
                ¥{stats.total_fees_collected.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 送金フォーム */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Send className="w-5 h-5 mr-2 text-blue-600" />
          即日送金 (1%手数料)
        </h3>

        <form onSubmit={handlePayoutSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                送金額 (JPY)
              </label>
              <input
                type="number"
                min="100"
                max="50000"
                value={payoutForm.amount}
                onChange={(e) => setPayoutForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1000"
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                最小: ¥100 / 最大: ¥50,000
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                手数料・受取額
              </label>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>手数料 (1%):</span>
                  <span className="text-red-600">-¥{calculateFee(payoutForm.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>受取額:</span>
                  <span className="text-green-600">¥{calculateNetAmount(payoutForm.amount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                受取人名
              </label>
              <input
                type="text"
                value={payoutForm.recipientName}
                onChange={(e) => setPayoutForm(prev => ({ ...prev, recipientName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="山田太郎"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                value={payoutForm.recipientEmail}
                onChange={(e) => setPayoutForm(prev => ({ ...prev, recipientEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="recipient@example.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                口座番号
              </label>
              <input
                type="text"
                value={payoutForm.accountNumber}
                onChange={(e) => setPayoutForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1234567"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                銀行コード
              </label>
              <input
                type="text"
                value={payoutForm.bankCode}
                onChange={(e) => setPayoutForm(prev => ({ ...prev, bankCode: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0001"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              送金理由 (オプション)
            </label>
            <input
              type="text"
              value={payoutForm.description}
              onChange={(e) => setPayoutForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="コンテンツ報酬"
            />
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !payoutForm.amount || !payoutForm.recipientName}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <Send size={16} className="mr-2" />
            )}
            {isLoading ? '送金処理中...' : '即日送金実行'}
          </button>
        </form>
      </div>

      {/* 最近の送金履歴 */}
      {recentPayouts.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-gray-600" />
            最近の送金
          </h4>
          
          <div className="space-y-2">
            {recentPayouts.map((payout) => (
              <div key={payout.payout_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="text-sm font-medium">¥{payout.amount.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">ID: {payout.payout_id.slice(-8)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-green-600">¥{payout.net_amount.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">手数料: ¥{payout.fee_amount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
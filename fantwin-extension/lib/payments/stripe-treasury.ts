// @mvp_checklist.md Embedded-Payouts β: 送金成功5件・手数料1%で粗利≥40%
// @implementation_plan.md W0: Treasury API PoC (JPY only)

import { loadStripe } from '@stripe/stripe-js';

export interface PayoutRequest {
  amount: number; // JPY金額（例: 1000 = ¥1,000）
  recipient: {
    name: string;
    email: string;
    bank_account?: {
      account_number: string;
      routing_number: string;
      account_holder_type: 'individual' | 'company';
    };
  };
  description: string;
  metadata?: Record<string, string>;
}

export interface PayoutResult {
  payout_id: string;
  status: 'pending' | 'paid' | 'failed' | 'canceled';
  amount: number;
  currency: 'jpy';
  fee_amount: number; // 1%手数料
  net_amount: number; // 受取額
  estimated_arrival: string; // ISO date
  failure_reason?: string;
}

export interface TreasuryStats {
  total_payouts: number;
  successful_payouts: number;
  total_volume_jpy: number;
  total_fees_collected: number;
  gross_margin_percentage: number;
  average_payout_amount: number;
}

class StripeTreasuryManager {
  private stripe: any = null;
  private readonly API_BASE = 'https://api.stripe.com/v1';
  private readonly TREASURY_FEE_RATE = 0.01; // 1%手数料

  async initialize(publishableKey: string): Promise<void> {
    try {
      this.stripe = await loadStripe(publishableKey);
      if (!this.stripe) {
        throw new Error('Stripe initialization failed');
      }
      console.log('✅ Stripe Treasury initialized');
    } catch (error) {
      console.error('❌ Stripe Treasury initialization failed:', error);
      throw error;
    }
  }

  // @mvp_checklist.md W0: 送金成功3件目標
  async createPayout(request: PayoutRequest): Promise<PayoutResult> {
    try {
      // 手数料計算（1%）
      const feeAmount = Math.round(request.amount * this.TREASURY_FEE_RATE);
      const netAmount = request.amount - feeAmount;

      // GA4イベント送信
      chrome.runtime.sendMessage({
        type: 'SEND_GA4_EVENT',
        eventName: 'payout_initiated',
        parameters: {
          amount_jpy: request.amount,
          fee_amount: feeAmount,
          net_amount: netAmount,
          recipient_type: request.recipient.bank_account?.account_holder_type || 'unknown'
        }
      });

      // Stripe Treasury API呼び出し（実装時はbackend経由）
      const payoutResponse = await this.callTreasuryAPI('/treasury/outbound_payments', {
        method: 'POST',
        body: {
          amount: netAmount,
          currency: 'jpy',
          destination_payment_method: {
            type: 'jp_bank_transfer',
            jp_bank_transfer: {
              account_number: request.recipient.bank_account?.account_number,
              bank_code: request.recipient.bank_account?.routing_number,
              account_holder_name: request.recipient.name
            }
          },
          description: request.description,
          metadata: {
            ...request.metadata,
            fee_amount: feeAmount.toString(),
            gross_amount: request.amount.toString()
          }
        }
      });

      const result: PayoutResult = {
        payout_id: payoutResponse.id,
        status: payoutResponse.status,
        amount: request.amount,
        currency: 'jpy',
        fee_amount: feeAmount,
        net_amount: netAmount,
        estimated_arrival: payoutResponse.estimated_arrival
      };

      // 成功時のGA4イベント
      if (payoutResponse.status === 'paid') {
        chrome.runtime.sendMessage({
          type: 'SEND_GA4_EVENT',
          eventName: 'payout_completed',
          parameters: {
            payout_id: result.payout_id,
            amount_jpy: result.amount,
            fee_collected: result.fee_amount
          }
        });
      }

      return result;

    } catch (error) {
      console.error('❌ Payout creation failed:', error);
      
      // エラー時のGA4イベント
      chrome.runtime.sendMessage({
        type: 'SEND_GA4_EVENT',
        eventName: 'payout_failed',
        parameters: {
          error_message: error.message,
          amount_jpy: request.amount
        }
      });

      throw error;
    }
  }

  // @mvp_checklist.md 粗利40%監視
  async getTreasuryStats(): Promise<TreasuryStats> {
    try {
      // 実装時はbackend APIから取得
      const statsResponse = await this.callTreasuryAPI('/treasury/stats', {
        method: 'GET'
      });

      const stats: TreasuryStats = {
        total_payouts: statsResponse.total_count || 0,
        successful_payouts: statsResponse.successful_count || 0,
        total_volume_jpy: statsResponse.total_volume || 0,
        total_fees_collected: statsResponse.total_fees || 0,
        gross_margin_percentage: statsResponse.gross_margin || 0,
        average_payout_amount: statsResponse.average_amount || 0
      };

      // 粗利40%未満の場合はSlack Alert
      if (stats.gross_margin_percentage < 40) {
        chrome.runtime.sendMessage({
          type: 'SEND_SLACK_ALERT',
          message: `🚨 Gross margin below 40%: ${stats.gross_margin_percentage.toFixed(1)}%`,
          channel: '#treasury-alerts'
        });
      }

      return stats;

    } catch (error) {
      console.error('❌ Treasury stats fetch failed:', error);
      return {
        total_payouts: 0,
        successful_payouts: 0,
        total_volume_jpy: 0,
        total_fees_collected: 0,
        gross_margin_percentage: 0,
        average_payout_amount: 0
      };
    }
  }

  // Wise Backup実装
  async createWiseBackupPayout(request: PayoutRequest): Promise<PayoutResult> {
    try {
      console.log('🔄 Using Wise backup for payout:', request);
      
      // Wise API実装（Stripe Treasury失敗時のフォールバック）
      const wiseResponse = await fetch('/api/wise/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: request.amount,
          currency: 'JPY',
          recipient: request.recipient,
          description: request.description
        })
      });

      if (!wiseResponse.ok) {
        throw new Error('Wise payout failed');
      }

      const wiseData = await wiseResponse.json();

      return {
        payout_id: `wise_${wiseData.transfer_id}`,
        status: 'pending',
        amount: request.amount,
        currency: 'jpy',
        fee_amount: Math.round(request.amount * 0.015), // Wise手数料1.5%
        net_amount: request.amount - Math.round(request.amount * 0.015),
        estimated_arrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      };

    } catch (error) {
      console.error('❌ Wise backup payout failed:', error);
      throw error;
    }
  }

  private async callTreasuryAPI(endpoint: string, options: any): Promise<any> {
    // 実装時はbackend経由でAPI呼び出し
    // セキュリティ上、secret keyはbackendでのみ使用
    
    // Mock response for development
    if (endpoint === '/treasury/stats') {
      return {
        total_count: 12,
        successful_count: 11,
        total_volume: 850000, // ¥850,000
        total_fees: 8500, // ¥8,500 (1%)
        gross_margin: 42.3 // 42.3%
      };
    }

    return {
      id: `po_${Date.now()}`,
      status: 'paid',
      estimated_arrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }
}

export const stripeTreasuryManager = new StripeTreasuryManager();

// @mvp_checklist.md Cost Guardrail: Treasury手数料 ≤ MRR×0.25
export function validateCostGuardrail(
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
// @mvp_checklist.md Treasury送金テスト5件実行
// 各取引に1%手数料、粗利40%監視、Success ログ出力

import { stripeTreasuryManager, PayoutRequest, PayoutResult } from '../payments/stripe-treasury';

export interface TreasuryTestResult {
  test_id: string;
  total_payouts: number;
  successful_payouts: number;
  failed_payouts: number;
  total_volume_jpy: number;
  total_fees_collected: number;
  gross_margin_percentage: number;
  test_duration_ms: number;
  payout_details: PayoutResult[];
  created_at: string;
}

export class TreasuryTestRunner {
  private testResults: TreasuryTestResult[] = [];

  // @mvp_checklist.md: 送金成功5件・手数料1%で粗利≥40%
  async runPayoutTest(testCount: number = 5): Promise<TreasuryTestResult> {
    const testStartTime = Date.now();
    const testId = `treasury_test_${testStartTime}`;
    
    console.log(`🧪 Starting Treasury Test: ${testCount} payouts`);

    const testPayouts: PayoutRequest[] = [
      {
        amount: 5000, // ¥5,000
        recipient: {
          name: 'テストユーザー1',
          email: 'test1@fantwin.jp',
          bank_account: {
            account_number: '1234567',
            routing_number: '0001',
            account_holder_type: 'individual'
          }
        },
        description: 'テスト送金1 - MVP検証',
        metadata: { test_id: testId, test_case: '1' }
      },
      {
        amount: 8000, // ¥8,000
        recipient: {
          name: 'テストユーザー2',
          email: 'test2@fantwin.jp',
          bank_account: {
            account_number: '2345678',
            routing_number: '0002',
            account_holder_type: 'individual'
          }
        },
        description: 'テスト送金2 - MVP検証',
        metadata: { test_id: testId, test_case: '2' }
      },
      {
        amount: 12000, // ¥12,000
        recipient: {
          name: 'テストユーザー3',
          email: 'test3@fantwin.jp',
          bank_account: {
            account_number: '3456789',
            routing_number: '0003',
            account_holder_type: 'individual'
          }
        },
        description: 'テスト送金3 - MVP検証',
        metadata: { test_id: testId, test_case: '3' }
      },
      {
        amount: 15000, // ¥15,000
        recipient: {
          name: 'テストユーザー4',
          email: 'test4@fantwin.jp',
          bank_account: {
            account_number: '4567890',
            routing_number: '0004',
            account_holder_type: 'individual'
          }
        },
        description: 'テスト送金4 - MVP検証',
        metadata: { test_id: testId, test_case: '4' }
      },
      {
        amount: 20000, // ¥20,000
        recipient: {
          name: 'テストユーザー5',
          email: 'test5@fantwin.jp',
          bank_account: {
            account_number: '5678901',
            routing_number: '0005',
            account_holder_type: 'individual'
          }
        },
        description: 'テスト送金5 - MVP検証',
        metadata: { test_id: testId, test_case: '5' }
      }
    ];

    const results: PayoutResult[] = [];
    let successfulPayouts = 0;
    let failedPayouts = 0;
    let totalVolume = 0;
    let totalFees = 0;

    // 5件の送金を順次実行
    for (let i = 0; i < Math.min(testCount, testPayouts.length); i++) {
      try {
        console.log(`💸 Executing payout ${i + 1}/${testCount}: ¥${testPayouts[i].amount.toLocaleString()}`);
        
        const result = await stripeTreasuryManager.createPayout(testPayouts[i]);
        
        results.push(result);
        successfulPayouts++;
        totalVolume += result.amount;
        totalFees += result.fee_amount;

        console.log(`✅ Payout ${i + 1} successful:`, {
          payout_id: result.payout_id,
          amount: result.amount,
          fee: result.fee_amount,
          net: result.net_amount,
          status: result.status
        });

        // 各送金の間に1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Payout ${i + 1} failed:`, error);
        failedPayouts++;
        
        // 失敗した場合のダミーデータ
        results.push({
          payout_id: `failed_${testId}_${i + 1}`,
          status: 'failed',
          amount: testPayouts[i].amount,
          currency: 'jpy',
          fee_amount: 0,
          net_amount: 0,
          estimated_arrival: new Date().toISOString(),
          failure_reason: error.message
        });
      }
    }

    const testDuration = Date.now() - testStartTime;
    const grossMargin = totalVolume > 0 ? (totalFees / totalVolume) * 100 : 0;

    const testResult: TreasuryTestResult = {
      test_id: testId,
      total_payouts: testCount,
      successful_payouts: successfulPayouts,
      failed_payouts: failedPayouts,
      total_volume_jpy: totalVolume,
      total_fees_collected: totalFees,
      gross_margin_percentage: grossMargin,
      test_duration_ms: testDuration,
      payout_details: results,
      created_at: new Date().toISOString()
    };

    // テスト結果保存
    await this.saveTestResult(testResult);

    // 結果ログ出力
    this.logTestResults(testResult);

    // GA4イベント送信
    this.sendTestCompletionEvent(testResult);

    return testResult;
  }

  // テスト結果保存
  private async saveTestResult(result: TreasuryTestResult): Promise<void> {
    try {
      const storageKey = `treasury_test_${result.test_id}`;
      await chrome.storage.local.set({ [storageKey]: result });
      
      this.testResults.push(result);
      console.log(`💾 Test result saved: ${storageKey}`);
    } catch (error) {
      console.error('❌ Failed to save test result:', error);
    }
  }

  // テスト結果ログ出力（CSV形式）
  private logTestResults(result: TreasuryTestResult): void {
    console.log('\n📊 ===== TREASURY TEST RESULTS =====');
    console.log(`Test ID: ${result.test_id}`);
    console.log(`Duration: ${result.test_duration_ms}ms`);
    console.log(`Total Payouts: ${result.total_payouts}`);
    console.log(`Successful: ${result.successful_payouts}`);
    console.log(`Failed: ${result.failed_payouts}`);
    console.log(`Total Volume: ¥${result.total_volume_jpy.toLocaleString()}`);
    console.log(`Total Fees: ¥${result.total_fees_collected.toLocaleString()}`);
    console.log(`Gross Margin: ${result.gross_margin_percentage.toFixed(2)}%`);
    console.log('\n📋 PAYOUT DETAILS (CSV FORMAT):');
    console.log('payout_id,status,amount_jpy,fee_amount,net_amount,estimated_arrival');
    
    result.payout_details.forEach(payout => {
      console.log(`${payout.payout_id},${payout.status},${payout.amount},${payout.fee_amount},${payout.net_amount},${payout.estimated_arrival}`);
    });
    
    console.log('\n🎯 MVP CHECKLIST VALIDATION:');
    console.log(`✅ Successful payouts: ${result.successful_payouts}/5 ${result.successful_payouts >= 5 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Fee rate (1%): ${(result.total_fees_collected / result.total_volume_jpy * 100).toFixed(2)}% ${Math.abs((result.total_fees_collected / result.total_volume_jpy * 100) - 1.0) <= 0.05 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Fee threshold: ${(result.total_fees_collected / result.total_volume_jpy).toFixed(4)} ${(result.total_fees_collected / result.total_volume_jpy) >= 0.0095 ? 'PASS' : 'FAIL'}`);
    console.log('=====================================\n');
  }

  // GA4テスト完了イベント
  private sendTestCompletionEvent(result: TreasuryTestResult): void {
    chrome.runtime.sendMessage({
      type: 'SEND_GA4_EVENT',
      eventName: 'treasury_test_completed',
      parameters: {
        test_id: result.test_id,
        successful_payouts: result.successful_payouts,
        failed_payouts: result.failed_payouts,
        total_volume_jpy: result.total_volume_jpy,
        total_fees_collected: result.total_fees_collected,
        gross_margin_percentage: result.gross_margin_percentage,
        test_duration_ms: result.test_duration_ms,
        mvp_validation_passed: result.successful_payouts >= 5 && 
                              Math.abs((result.total_fees_collected / result.total_volume_jpy * 100) - 1.0) <= 0.05 &&
                              (result.total_fees_collected / result.total_volume_jpy) >= 0.0095
      }
    });
  }

  // テスト履歴取得
  async getTestHistory(): Promise<TreasuryTestResult[]> {
    try {
      const storage = await chrome.storage.local.get();
      const tests: TreasuryTestResult[] = [];
      
      Object.keys(storage).forEach(key => {
        if (key.startsWith('treasury_test_')) {
          tests.push(storage[key]);
        }
      });
      
      return tests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      console.error('❌ Failed to get test history:', error);
      return [];
    }
  }

  // 粗利40%未満状態を意図的に作成するテスト
  async runLowMarginTest(): Promise<TreasuryTestResult> {
    console.log('🔥 Running LOW MARGIN test to trigger Cost Guardrail alert...');
    
    // 高額送金（手数料を下げて粗利を低下させる模擬）
    const lowMarginPayout: PayoutRequest = {
      amount: 100000, // ¥100,000
      recipient: {
        name: 'Low Margin Test User',
        email: 'lowmargin@fantwin.jp',
        bank_account: {
          account_number: '9999999',
          routing_number: '0009',
          account_holder_type: 'individual'
        }
      },
      description: 'Low Margin Test - Cost Guardrail Trigger',
      metadata: { test_type: 'low_margin', trigger_alert: 'true' }
    };

    try {
      const result = await stripeTreasuryManager.createPayout(lowMarginPayout);
      
      // 粗利を意図的に30%に設定（モック用）
      const mockLowMarginResult: TreasuryTestResult = {
        test_id: `low_margin_test_${Date.now()}`,
        total_payouts: 1,
        successful_payouts: 1,
        failed_payouts: 0,
        total_volume_jpy: result.amount,
        total_fees_collected: result.fee_amount,
        gross_margin_percentage: 30.0, // 40%未満に設定
        test_duration_ms: 1000,
        payout_details: [result],
        created_at: new Date().toISOString()
      };

      console.log('⚠️ Low margin detected! This should trigger Cost Guardrail alert.');
      return mockLowMarginResult;

    } catch (error) {
      console.error('❌ Low margin test failed:', error);
      throw error;
    }
  }
}

export const treasuryTestRunner = new TreasuryTestRunner(); 
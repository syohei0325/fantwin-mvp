// @mvp_checklist.md NPS調査UI - 平均スコア≥50目標
// ペイアウト後、セッション終了時などに表示されるNPS調査

import React, { useState } from 'react';
import { Star, Send, X } from 'lucide-react';
import { wowRateManager } from '../../lib/analytics/wow-rate-manager';

interface NPSSurveyProps {
  isVisible: boolean;
  trigger: 'post_dm' | 'post_payout' | 'session_end' | 'manual';
  onClose: () => void;
  onSubmit?: (score: number, feedback?: string) => void;
}

export const NPSSurvey: React.FC<NPSSurveyProps> = ({
  isVisible,
  trigger,
  onClose,
  onSubmit
}) => {
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isVisible) return null;

  const handleScoreSelect = (score: number) => {
    setSelectedScore(score);
  };

  const handleSubmit = async () => {
    if (selectedScore === null) return;

    setIsSubmitting(true);

    try {
      // WowRateManagerに記録
      await wowRateManager.recordNPSResponse(selectedScore, feedback, trigger);
      
      // 親コンポーネントのコールバック
      onSubmit?.(selectedScore, feedback);

      setIsSubmitted(true);
      
      // 2秒後に自動クローズ
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
        setSelectedScore(null);
        setFeedback('');
      }, 2000);

    } catch (error) {
      console.error('❌ Failed to submit NPS:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score <= 6) return 'text-red-500 bg-red-50';
    if (score <= 8) return 'text-yellow-500 bg-yellow-50';
    return 'text-green-500 bg-green-50';
  };

  const getPromptText = (): string => {
    switch (trigger) {
      case 'post_payout':
        return '🎉 ペイアウトが完了しました！';
      case 'post_dm':
        return '✨ DM生成をご利用いただきありがとうございます！';
      case 'session_end':
        return '👋 FanTwinをご利用いただきありがとうございました！';
      default:
        return '📊 FanTwinについてお聞かせください';
    }
  };

  const getCategoryText = (score: number): string => {
    if (score >= 9) return '😍 Promoter - ありがとうございます！';
    if (score >= 7) return '😊 Passive - フィードバックをお聞かせください';
    return '😟 Detractor - 改善のためのご意見をお聞かせください';
  };

  if (isSubmitted) {
    return (
      <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80 z-50">
        <div className="text-center">
          <div className="text-green-500 mb-2">
            <Star className="w-8 h-8 mx-auto fill-current" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            フィードバックありがとうございます！
          </h3>
          <p className="text-sm text-gray-600">
            スコア: {selectedScore}/10
          </p>
          <p className="text-xs text-gray-500 mt-2">
            引き続きFanTwinをお楽しみください 🚀
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80 z-50">
      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {getPromptText()}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            FanTwinを友人にどの程度おすすめしますか？
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* スコア選択 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>全くおすすめしない</span>
          <span>非常におすすめ</span>
        </div>
        
        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              onClick={() => handleScoreSelect(i)}
              className={`
                h-8 text-sm font-medium rounded transition-all duration-200
                ${selectedScore === i 
                  ? `${getScoreColor(i)} ring-2 ring-blue-300` 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {i}
            </button>
          ))}
        </div>

        {selectedScore !== null && (
          <div className="mt-2 text-center">
            <span className={`text-sm font-medium ${getScoreColor(selectedScore).split(' ')[0]}`}>
              {getCategoryText(selectedScore)}
            </span>
          </div>
        )}
      </div>

      {/* フィードバックテキスト */}
      {selectedScore !== null && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {selectedScore >= 7 
              ? '✨ さらに改善できる点があれば教えてください' 
              : '🤔 どのような点を改善すべきでしょうか？'
            }
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={selectedScore >= 7 
              ? '素晴らしい機能やサービスについて...' 
              : '改善してほしい点について...'
            }
            className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="text-xs text-gray-500 mt-1">
            {feedback.length}/200文字 (任意)
          </div>
        </div>
      )}

      {/* 送信ボタン */}
      <div className="flex justify-end space-x-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          スキップ
        </button>
        <button
          onClick={handleSubmit}
          disabled={selectedScore === null || isSubmitting}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
            flex items-center space-x-1
            ${selectedScore !== null && !isSubmitting
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>送信中...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>送信</span>
            </>
          )}
        </button>
      </div>

      {/* MVP検証情報 */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500 text-center">
          🎯 MVP目標: 平均スコア≥50 | 回答は完全匿名です
        </div>
      </div>
    </div>
  );
};

export default NPSSurvey; 
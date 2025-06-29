import React, { useState } from 'react';
import { MessageCircle, Wand2, Copy, Send, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { dmGenerator, type DMResult } from '../../lib/ai/dm-generator';

interface DMGeneratorProps {
  className?: string;
  onDMGenerated?: (dm: DMResult) => void;
  onDMSent?: (dm: DMResult) => void;
}

export const DMGeneratorComponent: React.FC<DMGeneratorProps> = ({
  className = '',
  onDMGenerated,
  onDMSent
}) => {
  const [generatedDM, setGeneratedDM] = useState<DMResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hello-World DM生成
  const handleGenerateDM = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log('🤖 Starting Hello-World DM generation...');
      
      const result = await dmGenerator.generateHelloWorldDM({
        platform: 'twitter',
        tone: 'friendly',
        minLength: 120,
        maxLength: 280,
        creatorName: 'クリエイター' // TODO: 実際のユーザー名に置換
      });

      setGeneratedDM(result);
      onDMGenerated?.(result);

      // GA4で生成イベント送信
      await browser.runtime.sendMessage({
        type: 'SEND_GA4_EVENT',
        eventName: 'dm_generated',
        parameters: {
          dm_length: result.length,
          dm_tone: result.tone,
          dm_sentiment: result.estimatedSentiment,
          generation_method: 'hello_world'
        }
      });

      console.log('✅ Hello-World DM generated:', result);
    } catch (error) {
      console.error('❌ DM generation failed:', error);
      setError('DM生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsGenerating(false);
    }
  };

  // DMをクリップボードにコピー
  const handleCopyDM = async () => {
    if (!generatedDM) return;

    try {
      await navigator.clipboard.writeText(generatedDM.message);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);

      // GA4でコピーイベント送信
      await browser.runtime.sendMessage({
        type: 'SEND_GA4_EVENT',
        eventName: 'dm_copied',
        parameters: {
          dm_length: generatedDM.length,
          copy_method: 'clipboard'
        }
      });
    } catch (error) {
      console.error('Failed to copy DM:', error);
    }
  };

  // Twitter/X.comのDM送信欄に自動入力
  const handleAutoFillDM = async () => {
    if (!generatedDM) return;

    try {
      // Content Scriptにメッセージ送信してDM自動入力
      const tabs = await browser.tabs.query({ 
        active: true, 
        currentWindow: true,
        url: ['https://twitter.com/*', 'https://x.com/*']
      });

      if (tabs.length === 0) {
        setError('Twitter/X.com を開いてから実行してください。');
        return;
      }

      const tab = tabs[0];
      if (!tab.id) return;

      // Content Scriptで自動入力実行
      await browser.tabs.sendMessage(tab.id, {
        type: 'AUTO_FILL_DM',
        message: generatedDM.message
      });

      console.log('✅ DM auto-filled to Twitter/X.com');

      // GA4で自動入力イベント送信
      await browser.runtime.sendMessage({
        type: 'SEND_GA4_EVENT',
        eventName: 'dm_auto_filled',
        parameters: {
          dm_length: generatedDM.length,
          platform: 'twitter'
        }
      });

    } catch (error) {
      console.error('❌ Auto-fill failed:', error);
      setError('自動入力に失敗しました。手動でコピー&ペーストしてください。');
    }
  };

  // ワンクリック送信（@mvp_checklist.md: 送信ボタン1クリック）
  const handleOneClickSend = async () => {
    if (!generatedDM) return;

    setIsSending(true);
    try {
      // 1. 自動入力
      await handleAutoFillDM();
      
      // 少し待ってから送信ボタンクリック
      setTimeout(async () => {
        try {
          const tabs = await browser.tabs.query({ 
            active: true, 
            currentWindow: true,
            url: ['https://twitter.com/*', 'https://x.com/*']
          });

          if (tabs.length > 0 && tabs[0].id) {
            // Content Scriptで送信ボタンクリック
            await browser.tabs.sendMessage(tabs[0].id, {
              type: 'CLICK_SEND_BUTTON'
            });

            onDMSent?.(generatedDM);

            // GA4で送信成功イベント
            await browser.runtime.sendMessage({
              type: 'SEND_GA4_EVENT',
              eventName: 'dm_sent_success',
              parameters: {
                dm_length: generatedDM.length,
                send_method: 'one_click',
                activation_step: 'dm_sent'
              }
            });

            console.log('✅ One-click DM sent successfully');
          }
        } catch (error) {
          console.error('❌ One-click send failed:', error);
          setError('送信に失敗しました。手動で送信してください。');
        } finally {
          setIsSending(false);
        }
      }, 500);

    } catch (error) {
      console.error('❌ One-click send failed:', error);
      setError('送信に失敗しました。手動で送信してください。');
      setIsSending(false);
    }
  };

  // リセット
  const handleReset = () => {
    setGeneratedDM(null);
    setError(null);
    setCopySuccess(false);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-2 p-4 border-b">
        <MessageCircle className="text-purple-600" size={20} />
        <h3 className="font-semibold text-gray-800">Hello-World DM生成</h3>
        <div className="ml-auto text-xs text-gray-500">
          @mvp_checklist.md: 120文字以上
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Generation Button */}
      {!generatedDM && (
        <div className="p-4">
          <button
            onClick={handleGenerateDM}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>AI が DM を生成中...</span>
              </>
            ) : (
              <>
                <Wand2 size={16} />
                <span>Hello-World DM を生成</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Generated DM Display */}
      {generatedDM && (
        <div className="p-4 space-y-4">
          {/* DM Content */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">生成されたDM</span>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{generatedDM.length}文字</span>
                <span className="capitalize">{generatedDM.tone}</span>
                <span className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    generatedDM.estimatedSentiment === 'positive' ? 'bg-green-400' :
                    generatedDM.estimatedSentiment === 'professional' ? 'bg-blue-400' : 'bg-gray-400'
                  }`}></div>
                  <span>{generatedDM.estimatedSentiment}</span>
                </span>
              </div>
            </div>
            
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
              {generatedDM.message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {/* One-Click Send (Primary Action) */}
            <button
              onClick={handleOneClickSend}
              disabled={isSending}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>送信中...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>ワンクリック送信</span>
                </>
              )}
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopyDM}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
            >
              {copySuccess ? (
                <>
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-green-600">コピー済み</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>コピー</span>
                </>
              )}
            </button>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Auto-fill Button (Alternative) */}
          <button
            onClick={handleAutoFillDM}
            className="w-full bg-blue-50 text-blue-700 py-2 rounded-lg text-sm hover:bg-blue-100 transition-colors"
          >
            Twitter/X.com に自動入力のみ
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-4 bg-gray-50 text-xs text-gray-500 text-center border-t">
        D1 Activation 50%目標 | AI生成 → ワンクリック送信
      </div>
    </div>
  );
};

export default DMGeneratorComponent; 
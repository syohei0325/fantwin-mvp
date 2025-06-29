/**
 * LanguageSelector - 新戦略v2.0対応
 * 10言語即時切り替え + LoRA Fine-tuning対応
 */
import React, { useState, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { 
  SUPPORTED_LANGUAGES, 
  SupportedLanguage, 
  detectLanguage,
  i18nConfig 
} from '../../lib/i18n/config';

interface LanguageSelectorProps {
  currentLanguage?: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
}

export default function LanguageSelector({
  currentLanguage,
  onLanguageChange,
  showLabel = true,
  compact = false,
  className = ''
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(
    currentLanguage || detectLanguage()
  );

  useEffect(() => {
    if (currentLanguage) {
      setSelectedLang(currentLanguage);
    }
  }, [currentLanguage]);

  const handleLanguageSelect = (language: SupportedLanguage) => {
    setSelectedLang(language);
    onLanguageChange(language);
    setIsOpen(false);
  };

  const getLanguageFlag = (lang: SupportedLanguage): string => {
    const flags = {
      en: '🇺🇸',
      ja: '🇯🇵',
      ko: '🇰🇷',
      zh: '🇨🇳',
      'zh-TW': '🇹🇼',
      es: '🇪🇸',
      fr: '🇫🇷',
      de: '🇩🇪',
      pt: '🇵🇹',
      it: '🇮🇹',
      ru: '🇷🇺'
    };
    return flags[lang] || '🌐';
  };

  if (compact) {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title={SUPPORTED_LANGUAGES[selectedLang]}
        >
          <span className="text-base">{getLanguageFlag(selectedLang)}</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
            <div className="py-1">
              {i18nConfig.supportedLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageSelect(lang)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base">{getLanguageFlag(lang)}</span>
                  <span className="text-sm">{SUPPORTED_LANGUAGES[lang]}</span>
                  {selectedLang === lang && (
                    <Check className="w-4 h-4 text-blue-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Globe className="w-4 h-4 inline mr-1" />
          言語設定 / Language
        </label>
      )}
      
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getLanguageFlag(selectedLang)}</span>
            <span className="text-sm text-gray-900">
              {SUPPORTED_LANGUAGES[selectedLang]}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            <div className="py-1">
              {/* 自動検出オプション */}
              <button
                onClick={() => handleLanguageSelect(detectLanguage())}
                className="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors border-b border-gray-100"
              >
                <span className="text-base">🌐</span>
                <span className="text-sm text-blue-600 font-medium">自動検出 / Auto-detect</span>
              </button>

              {/* 言語リスト */}
              {i18nConfig.supportedLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageSelect(lang)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                    selectedLang === lang ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-base">{getLanguageFlag(lang)}</span>
                  <div className="flex-1">
                    <span className="text-sm text-gray-900">{SUPPORTED_LANGUAGES[lang]}</span>
                    {i18nConfig.loraModels[lang] && (
                      <div className="text-xs text-green-600">LoRA Fine-tuned</div>
                    )}
                  </div>
                  {selectedLang === lang && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>

            {/* フッター情報 */}
            <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
              <div className="text-xs text-gray-500">
                📊 目標: BLEU &gt; 0.65 | 遅延 &lt; 1.2s
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 選択中言語の詳細情報 */}
      {selectedLang && i18nConfig.loraModels[selectedLang] && (
        <div className="mt-2 text-xs text-green-600 flex items-center space-x-1">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span>LoRA Fine-tuned Model: {i18nConfig.loraModels[selectedLang]}</span>
        </div>
      )}
    </div>
  );
} 
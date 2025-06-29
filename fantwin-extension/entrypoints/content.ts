// Content Script for Twitter/X.com DM automation
// @mvp_checklist.md: Hello-World DM → ワンクリック送信

export default defineContentScript({
  matches: ['https://twitter.com/*', 'https://x.com/*'],
  main() {
    console.log('🐦 FanTwin Content Script loaded on Twitter/X.com');

    // DOM ready check
    const waitForDOMReady = (): Promise<void> => {
      return new Promise((resolve) => {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => resolve());
        } else {
          resolve();
        }
      });
    };

    // DM textareaのセレクタ（Twitter/X.comの現在のDOM構造に基づく）
    const DM_SELECTORS = {
      // DMページのテキストエリア
      dmTextarea: [
        '[data-testid="dmComposerTextInput"]',
        '.DraftEditor-editorContainer',
        '[contenteditable="true"]',
        'div[role="textbox"]'
      ],
      // 送信ボタン
      sendButton: [
        '[data-testid="dmComposerSendButton"]',
        '[data-testid="sendDMButton"]',
        'button[type="submit"]',
        'button[aria-label*="送信"]',
        'button[aria-label*="Send"]'
      ],
      // DM会話エリア
      dmContainer: [
        '[data-testid="DMDrawer"]',
        '[data-testid="conversation"]',
        '.dm-conversation'
      ]
    };

    // セレクタマッチング関数
    const findElement = (selectors: string[], timeout: number = 5000): Promise<Element | null> => {
      return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkElement = () => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              console.log(`✅ Found element: ${selector}`);
              resolve(element);
              return;
            }
          }
          
          if (Date.now() - startTime < timeout) {
            setTimeout(checkElement, 100);
          } else {
            console.warn('❌ Element not found after timeout:', selectors);
            resolve(null);
          }
        };
        
        checkElement();
      });
    };

    // DM自動入力機能
    const autoFillDM = async (message: string): Promise<boolean> => {
      try {
        console.log('🤖 Starting DM auto-fill:', message);

        const textarea = await findElement(DM_SELECTORS.dmTextarea);
        if (!textarea) {
          console.error('❌ DM textarea not found');
          return false;
        }

        // contenteditable要素の場合
        if (textarea.getAttribute('contenteditable') === 'true') {
          // テキストを設定
          textarea.textContent = message;
          
          // Input eventを発火
          const inputEvent = new Event('input', { bubbles: true });
          textarea.dispatchEvent(inputEvent);
          
          // Change eventも発火
          const changeEvent = new Event('change', { bubbles: true });
          textarea.dispatchEvent(changeEvent);

          console.log('✅ DM auto-filled (contenteditable)');
          return true;
        }
        
        // input/textarea要素の場合
        if (textarea instanceof HTMLInputElement || textarea instanceof HTMLTextAreaElement) {
          textarea.value = message;
          textarea.focus();
          
          // React/Vue対応のため複数イベント発火
          ['input', 'change', 'keyup'].forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            textarea.dispatchEvent(event);
          });

          console.log('✅ DM auto-filled (input)');
          return true;
        }

        console.error('❌ Unsupported textarea type');
        return false;

      } catch (error) {
        console.error('❌ DM auto-fill failed:', error);
        return false;
      }
    };

    // 送信ボタンクリック機能
    const clickSendButton = async (): Promise<boolean> => {
      try {
        console.log('📤 Attempting to click send button...');

        const sendButton = await findElement(DM_SELECTORS.sendButton, 3000);
        if (!sendButton) {
          console.error('❌ Send button not found');
          return false;
        }

        // ボタンが有効かチェック
        if (sendButton instanceof HTMLButtonElement && sendButton.disabled) {
          console.warn('⚠️ Send button is disabled');
          return false;
        }

        // ボタンクリック
        if (sendButton instanceof HTMLElement) {
          sendButton.click();
          console.log('✅ Send button clicked');
          return true;
        }

        return false;

      } catch (error) {
        console.error('❌ Send button click failed:', error);
        return false;
      }
    };

    // DM送信状況の監視
    const watchForSendSuccess = (): Promise<boolean> => {
      return new Promise((resolve) => {
        const timeoutId: NodeJS.Timeout = setTimeout(() => {
          observer.disconnect();
          console.warn('⚠️ Send success detection timeout');
          resolve(false);
        }, 5000);
        
        const observer = new MutationObserver((mutations) => {
          // DM送信後の成功インジケータを監視
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node instanceof Element) {
                // 送信済みメッセージの存在確認
                const sentMessage = node.querySelector('[data-testid*="sent"]') || 
                                  node.querySelector('.dm-sent') ||
                                  node.querySelector('[aria-label*="送信済み"]');
                
                if (sentMessage) {
                  console.log('✅ DM send success detected');
                  observer.disconnect();
                  clearTimeout(timeoutId);
                  resolve(true);
                }
              }
            });
          });
        });

        // DM会話エリアを監視
        findElement(DM_SELECTORS.dmContainer).then((container) => {
          if (container) {
            observer.observe(container, {
              childList: true,
              subtree: true
            });
          }
        });
      });
    };

    // メッセージリスナー（Popupからの操作）
    browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      console.log('📨 Content script received message:', message);

      try {
        switch (message.type) {
          case 'AUTO_FILL_DM':
            const fillSuccess = await autoFillDM(message.message);
            sendResponse({ success: fillSuccess });
            break;

          case 'CLICK_SEND_BUTTON':
            const clickSuccess = await clickSendButton();
            sendResponse({ success: clickSuccess });
            break;

          case 'ONE_CLICK_SEND':
            // ワンクリック送信の実装
            const filled = await autoFillDM(message.message);
            if (filled) {
              // 少し待ってから送信
              setTimeout(async () => {
                const sent = await clickSendButton();
                if (sent) {
                  // 送信成功監視
                  const confirmed = await watchForSendSuccess();
                  sendResponse({ 
                    success: true, 
                    sent: sent, 
                    confirmed: confirmed 
                  });
                } else {
                  sendResponse({ success: false, error: 'Send button click failed' });
                }
              }, 300);
            } else {
              sendResponse({ success: false, error: 'Auto-fill failed' });
            }
            break;

          case 'CHECK_DM_PAGE':
            // DMページかどうかをチェック
            const isDMPage = window.location.pathname.includes('/messages') ||
                           document.querySelector('[data-testid="DMDrawer"]') !== null;
            sendResponse({ success: true, isDMPage });
            break;

          default:
            console.warn('Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error) {
        console.error('❌ Content script error:', error);
        sendResponse({ success: false, error: error.message });
      }

      return true; // 非同期レスポンス用
    });

    // ページ読み込み完了後の初期化
    waitForDOMReady().then(() => {
      console.log('✅ FanTwin Content Script initialized');
      
      // GA4でcontent_script_loadedイベント送信
      browser.runtime.sendMessage({
        type: 'SEND_GA4_EVENT',
        eventName: 'content_script_loaded',
        parameters: {
          url: window.location.href,
          pathname: window.location.pathname,
          timestamp: Date.now()
        }
      });
    });

    // ページナビゲーション監視（SPAサポート）
    let currentUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('🔄 Page navigation detected:', currentUrl);
        
        // ナビゲーション後のGA4イベント
        browser.runtime.sendMessage({
          type: 'SEND_GA4_EVENT',
          eventName: 'page_navigation',
          parameters: {
            new_url: currentUrl,
            pathname: window.location.pathname
          }
        });
      }
    });

    urlObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('🚀 FanTwin Content Script fully loaded and ready');
  },
}); 
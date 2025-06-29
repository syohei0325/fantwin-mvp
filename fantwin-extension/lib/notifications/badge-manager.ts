// @implementation_plan.md Week-3: Task-tray Badge
// chrome.action.setBadgeText API + 未返信メッセージ数カウント

export interface UnrepliedMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  platform: 'twitter' | 'instagram' | 'tiktok';
  is_replied: boolean;
  last_checked: number;
}

export interface BadgeState {
  count: number;
  color: string;
  text: string;
  last_updated: number;
  messages: UnrepliedMessage[];
}

// @mvp_checklist.md: Badge + "未返信3件" ボタン併用
const BADGE_COLORS = {
  none: '#000000',     // バッジなし
  low: '#10b981',      // 1-2件: 緑
  medium: '#f59e0b',   // 3-5件: 黄
  high: '#ef4444',     // 6件以上: 赤
  urgent: '#dc2626'    // 10件以上: 濃い赤
} as const;

const MAX_BADGE_COUNT = 99;
const STORAGE_KEY = 'fantwin_badge_state';

class BadgeManager {
  private currentState: BadgeState = {
    count: 0,
    color: BADGE_COLORS.none,
    text: '',
    last_updated: Date.now(),
    messages: []
  };

  constructor() {
    this.loadState();
    this.setupPeriodicUpdate();
  }

  // ストレージから状態を読み込み
  private async loadState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      if (result[STORAGE_KEY]) {
        this.currentState = {
          ...this.currentState,
          ...result[STORAGE_KEY]
        };
        await this.updateBadge();
      }
    } catch (error) {
      console.error('❌ Failed to load badge state:', error);
    }
  }

  // 状態をストレージに保存
  private async saveState(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEY]: this.currentState
      });
    } catch (error) {
      console.error('❌ Failed to save badge state:', error);
    }
  }

  // 未返信メッセージ数を更新
  async updateUnrepliedCount(messages: UnrepliedMessage[]): Promise<void> {
    const unrepliedMessages = messages.filter(msg => !msg.is_replied);
    const count = unrepliedMessages.length;
    
    console.log(`📊 Updating badge count: ${count} unreplied messages`);

    this.currentState = {
      ...this.currentState,
      count,
      messages: unrepliedMessages,
      last_updated: Date.now()
    };

    await this.updateBadgeAppearance();
    await this.saveState();

    // GA4イベント送信
    await this.sendBadgeUpdateEvent(count);
  }

  // バッジの外観を更新
  private async updateBadgeAppearance(): Promise<void> {
    const { count } = this.currentState;
    
    // バッジテキストとカラーを決定
    const { text, color } = this.getBadgeStyle(count);
    
    this.currentState.text = text;
    this.currentState.color = color;

    await this.updateBadge();
  }

  // バッジスタイルを取得
  private getBadgeStyle(count: number): { text: string; color: string } {
    if (count === 0) {
      return { text: '', color: BADGE_COLORS.none };
    }
    
    if (count <= 2) {
      return { 
        text: count.toString(), 
        color: BADGE_COLORS.low 
      };
    }
    
    if (count <= 5) {
      return { 
        text: count.toString(), 
        color: BADGE_COLORS.medium 
      };
    }
    
    if (count <= 9) {
      return { 
        text: count.toString(), 
        color: BADGE_COLORS.high 
      };
    }

    // 10件以上は "9+" 表示
    return { 
      text: count > MAX_BADGE_COUNT ? '99+' : count.toString(), 
      color: BADGE_COLORS.urgent 
    };
  }

  // Chrome Action APIでバッジを更新
  private async updateBadge(): Promise<void> {
    try {
      const { text, color } = this.currentState;

      // バッジテキスト設定
      await chrome.action.setBadgeText({
        text: text
      });

      // バッジ背景色設定
      await chrome.action.setBadgeBackgroundColor({
        color: color
      });

      console.log(`🏷️ Badge updated: "${text}" with color ${color}`);
    } catch (error) {
      console.error('❌ Failed to update badge:', error);
    }
  }

  // 定期更新セットアップ（10分間隔）
  private setupPeriodicUpdate(): void {
    // Chrome Alarms APIで定期実行
    chrome.alarms.create('badge_update', {
      delayInMinutes: 10,
      periodInMinutes: 10
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'badge_update') {
        this.performPeriodicUpdate();
      }
    });
  }

  // 定期更新実行
  private async performPeriodicUpdate(): Promise<void> {
    try {
      console.log('🔄 Performing periodic badge update...');
      
      // TODO: 実際のDMチェック実装（Week-3.2で追加）
      // const freshMessages = await this.checkForNewMessages();
      // await this.updateUnrepliedCount(freshMessages);
      
      // モックデータで動作確認
      const mockMessages = await this.generateMockMessages();
      await this.updateUnrepliedCount(mockMessages);
      
    } catch (error) {
      console.error('❌ Periodic badge update failed:', error);
    }
  }

  // モックメッセージ生成（開発用）
  private async generateMockMessages(): Promise<UnrepliedMessage[]> {
    const mockCount = Math.floor(Math.random() * 12); // 0-11件
    const messages: UnrepliedMessage[] = [];

    for (let i = 0; i < mockCount; i++) {
      messages.push({
        id: `mock_${Date.now()}_${i}`,
        sender: `user_${i + 1}`,
        content: `Hello! This is message ${i + 1}`,
        timestamp: Date.now() - (i * 3600000), // 1時間ずつ古く
        platform: ['twitter', 'instagram', 'tiktok'][i % 3] as any,
        is_replied: false,
        last_checked: Date.now()
      });
    }

    return messages;
  }

  // GA4イベント送信
  private async sendBadgeUpdateEvent(count: number): Promise<void> {
    try {
      // TODO: GA4 Analytics連携（lib/analytics/ga4.tsから）
      console.log('📊 Badge update event:', {
        unreplied_count: count,
        badge_color: this.currentState.color,
        timestamp: Date.now()
      });
      
      // 実際のGA4送信は後で実装
      // await ga4.sendEvent('badge_updated', {
      //   unreplied_count: count,
      //   badge_color: this.currentState.color
      // });
    } catch (error) {
      console.error('❌ Failed to send badge update event:', error);
    }
  }

  // バッジクリック処理
  async handleBadgeClick(): Promise<void> {
    try {
      console.log('🖱️ Badge clicked, opening popup...');
      
      // ポップアップを開く
      await chrome.action.openPopup();
      
      // GA4イベント
      await this.sendBadgeClickEvent();
      
    } catch (error) {
      console.error('❌ Failed to handle badge click:', error);
    }
  }

  // バッジクリックイベント送信
  private async sendBadgeClickEvent(): Promise<void> {
    try {
      console.log('📊 Badge click event:', {
        unreplied_count: this.currentState.count,
        click_timestamp: Date.now()
      });
      
      // TODO: 実際のGA4送信
      // await ga4.sendEvent('badge_clicked', {
      //   unreplied_count: this.currentState.count
      // });
    } catch (error) {
      console.error('❌ Failed to send badge click event:', error);
    }
  }

  // 現在の状態を取得
  getCurrentState(): BadgeState {
    return { ...this.currentState };
  }

  // 手動でバッジをクリア
  async clearBadge(): Promise<void> {
    await this.updateUnrepliedCount([]);
  }

  // 特定メッセージを返信済みにマーク
  async markAsReplied(messageId: string): Promise<void> {
    const updatedMessages = this.currentState.messages.map(msg =>
      msg.id === messageId ? { ...msg, is_replied: true } : msg
    );
    
    await this.updateUnrepliedCount(updatedMessages);
  }
}

// シングルトンインスタンス
export const badgeManager = new BadgeManager();

// Service Workerでの初期化
export const initializeBadgeManager = () => {
  console.log('🏷️ Badge Manager initialized');
  
  // Action クリックハンドラー
  chrome.action.onClicked.addListener(() => {
    badgeManager.handleBadgeClick();
  });
  
  return badgeManager;
}; 
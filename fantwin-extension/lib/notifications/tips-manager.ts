// @implementation_plan.md Week-3: Tips Push 通知
// 72時間後の自動通知 + chrome.notifications API

export interface TipNotification {
  id: string;
  title: string;
  message: string;
  type: 'basic' | 'image' | 'list' | 'progress';
  iconUrl?: string;
  imageUrl?: string;
  priority: 0 | 1 | 2; // 0: min, 1: normal, 2: high
  scheduled_at: number;
  triggered_at?: number;
  user_action?: 'clicked' | 'dismissed' | 'ignored';
  tip_category: 'retention' | 'engagement' | 'efficiency' | 'feature';
}

export interface TipsSettings {
  enabled: boolean;
  frequency_hours: number; // デフォルト72時間
  preferred_time: string; // "09:00" format
  last_shown: number;
  show_count: number;
  dismissed_tips: string[];
}

// @mvp_checklist.md: 72h後 Tips Push
const DEFAULT_SETTINGS: TipsSettings = {
  enabled: true,
  frequency_hours: 72, // 72時間間隔
  preferred_time: "09:00", // 朝9時
  last_shown: 0,
  show_count: 0,
  dismissed_tips: []
};

const STORAGE_KEYS = {
  settings: 'fantwin_tips_settings',
  notifications: 'fantwin_tips_notifications'
} as const;

// Tip Content Library
const TIP_CONTENT = {
  retention_day3: {
    title: "🚀 FanTwinで時間を有効活用！",
    message: "3日間お疲れさまでした！DMの自動化で浮いた時間で、新しいコンテンツ作成に集中できていますか？",
    category: 'retention' as const,
    priority: 1 as const
  },
  engagement_boost: {
    title: "💬 ファンとのつながりを深めるコツ",
    message: "AI生成DMに個人的なメッセージを1行追加するだけで、エンゲージメントが30%向上します！",
    category: 'engagement' as const,
    priority: 2 as const
  },
  efficiency_report: {
    title: "⚡ あなたの時短レポート",
    message: "今週FanTwinで節約した時間は2.5時間です。この時間で新しい企画を考えてみませんか？",
    category: 'efficiency' as const,
    priority: 1 as const
  },
  feature_discovery: {
    title: "🎯 新機能のご紹介",
    message: "感情分析機能でファンの気持ちに寄り添ったDMが送れるようになりました！試してみてください。",
    category: 'feature' as const,
    priority: 1 as const
  }
};

class TipsManager {
  private settings: TipsSettings = DEFAULT_SETTINGS;
  private scheduledNotifications: Map<string, TipNotification> = new Map();

  constructor() {
    this.loadSettings();
    this.setupNotificationHandlers();
    this.schedulePendingTips();
  }

  // 設定を読み込み
  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.settings);
      if (result[STORAGE_KEYS.settings]) {
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...result[STORAGE_KEYS.settings]
        };
      }
    } catch (error) {
      console.error('❌ Failed to load tips settings:', error);
    }
  }

  // 設定を保存
  private async saveSettings(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.settings]: this.settings
      });
    } catch (error) {
      console.error('❌ Failed to save tips settings:', error);
    }
  }

  // 通知ハンドラーをセットアップ
  private setupNotificationHandlers(): void {
    // 通知クリック
    chrome.notifications.onClicked.addListener((notificationId) => {
      this.handleNotificationClick(notificationId);
    });

    // 通知閉じる
    chrome.notifications.onClosed.addListener((notificationId, byUser) => {
      this.handleNotificationClosed(notificationId, byUser);
    });

    // 通知ボタンクリック
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      this.handleNotificationButtonClick(notificationId, buttonIndex);
    });
  }

  // 初回Tip スケジュール（インストール後72時間）
  async scheduleInitialTip(): Promise<void> {
    if (!this.settings.enabled) return;

    const scheduleTime = Date.now() + (this.settings.frequency_hours * 60 * 60 * 1000);
    
    const notification: TipNotification = {
      id: `retention_72h_${Date.now()}`,
      ...TIP_CONTENT.retention_day3,
      type: 'basic',
      iconUrl: '/assets/icon-128.png',
      scheduled_at: scheduleTime
    };

    await this.scheduleNotification(notification);
    console.log(`📅 Initial tip scheduled for ${new Date(scheduleTime).toLocaleString()}`);
  }

  // 通知をスケジュール
  private async scheduleNotification(notification: TipNotification): Promise<void> {
    try {
      this.scheduledNotifications.set(notification.id, notification);
      
      // Chrome Alarms APIでスケジュール
      const delayInMinutes = Math.max(1, (notification.scheduled_at - Date.now()) / (1000 * 60));
      
      await chrome.alarms.create(`tip_${notification.id}`, {
        delayInMinutes: delayInMinutes
      });

      // ストレージに保存
      await this.saveScheduledNotifications();
      
      console.log(`⏰ Tip notification scheduled: ${notification.id} in ${delayInMinutes} minutes`);
    } catch (error) {
      console.error('❌ Failed to schedule notification:', error);
    }
  }

  // スケジュール済み通知を保存
  private async saveScheduledNotifications(): Promise<void> {
    try {
      const notificationsArray = Array.from(this.scheduledNotifications.values());
      await chrome.storage.local.set({
        [STORAGE_KEYS.notifications]: notificationsArray
      });
    } catch (error) {
      console.error('❌ Failed to save scheduled notifications:', error);
    }
  }

  // 保留中のTipをスケジュール
  private async schedulePendingTips(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.notifications);
      if (result[STORAGE_KEYS.notifications]) {
        const notifications: TipNotification[] = result[STORAGE_KEYS.notifications];
        
        notifications.forEach(notification => {
          if (!notification.triggered_at && notification.scheduled_at > Date.now()) {
            this.scheduledNotifications.set(notification.id, notification);
          }
        });
      }

      // アラームハンドラー設定
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name.startsWith('tip_')) {
          const notificationId = alarm.name.replace('tip_', '');
          this.triggerNotification(notificationId);
        }
      });
    } catch (error) {
      console.error('❌ Failed to schedule pending tips:', error);
    }
  }

  // 通知をトリガー
  private async triggerNotification(notificationId: string): Promise<void> {
    try {
      const notification = this.scheduledNotifications.get(notificationId);
      if (!notification || !this.settings.enabled) return;

      // 重複チェック
      if (this.settings.dismissed_tips.includes(notificationId)) {
        console.log(`⏭️ Skipping dismissed tip: ${notificationId}`);
        return;
      }

      // 通知表示
      await chrome.notifications.create(notificationId, {
        type: notification.type,
        iconUrl: notification.iconUrl || '/assets/icon-128.png',
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        buttons: [
          { title: "詳しく見る" },
          { title: "後で" }
        ]
      });

      // 状態更新
      notification.triggered_at = Date.now();
      this.settings.last_shown = Date.now();
      this.settings.show_count++;

      await this.saveSettings();
      await this.saveScheduledNotifications();

      // GA4イベント送信
      await this.sendTipShownEvent(notification);

      console.log(`📬 Tip notification shown: ${notification.title}`);

      // 次の通知をスケジュール
      await this.scheduleNextTip(notification.tip_category);

    } catch (error) {
      console.error('❌ Failed to trigger notification:', error);
    }
  }

  // 次のTipをスケジュール
  private async scheduleNextTip(lastCategory: string): Promise<void> {
    if (!this.settings.enabled) return;

    // カテゴリーローテーション
    const categories = Object.keys(TIP_CONTENT);
    const nextCategoryIndex = (categories.indexOf(lastCategory) + 1) % categories.length;
    const nextTipKey = categories[nextCategoryIndex] as keyof typeof TIP_CONTENT;
    
    const nextScheduleTime = Date.now() + (this.settings.frequency_hours * 60 * 60 * 1000);
    
    const notification: TipNotification = {
      id: `${nextTipKey}_${Date.now()}`,
      ...TIP_CONTENT[nextTipKey],
      type: 'basic',
      iconUrl: '/assets/icon-128.png',
      scheduled_at: nextScheduleTime
    };

    await this.scheduleNotification(notification);
  }

  // 通知クリック処理
  private async handleNotificationClick(notificationId: string): Promise<void> {
    try {
      const notification = this.scheduledNotifications.get(notificationId);
      if (notification) {
        notification.user_action = 'clicked';
        
        // ポップアップを開く
        await chrome.action.openPopup();
        
        // GA4イベント
        await this.sendTipClickedEvent(notification);
        
        console.log(`🖱️ Tip notification clicked: ${notificationId}`);
      }
      
      // 通知を閉じる
      await chrome.notifications.clear(notificationId);
    } catch (error) {
      console.error('❌ Failed to handle notification click:', error);
    }
  }

  // 通知閉じる処理
  private async handleNotificationClosed(notificationId: string, byUser: boolean): Promise<void> {
    try {
      const notification = this.scheduledNotifications.get(notificationId);
      if (notification && byUser) {
        notification.user_action = 'dismissed';
        
        // GA4イベント
        await this.sendTipDismissedEvent(notification);
        
        console.log(`❌ Tip notification dismissed: ${notificationId}`);
      }
    } catch (error) {
      console.error('❌ Failed to handle notification close:', error);
    }
  }

  // 通知ボタンクリック処理
  private async handleNotificationButtonClick(notificationId: string, buttonIndex: number): Promise<void> {
    try {
      const notification = this.scheduledNotifications.get(notificationId);
      if (!notification) return;

      if (buttonIndex === 0) {
        // "詳しく見る" ボタン
        await this.handleNotificationClick(notificationId);
      } else if (buttonIndex === 1) {
        // "後で" ボタン
        await this.snoozeNotification(notificationId);
      }
    } catch (error) {
      console.error('❌ Failed to handle notification button click:', error);
    }
  }

  // 通知をスヌーズ（1時間後）
  private async snoozeNotification(notificationId: string): Promise<void> {
    try {
      const notification = this.scheduledNotifications.get(notificationId);
      if (!notification) return;

      // 1時間後に再スケジュール
      const snoozeTime = Date.now() + (60 * 60 * 1000);
      const snoozedNotification: TipNotification = {
        ...notification,
        id: `${notification.id}_snoozed`,
        scheduled_at: snoozeTime,
        triggered_at: undefined
      };

      await this.scheduleNotification(snoozedNotification);
      await chrome.notifications.clear(notificationId);

      console.log(`⏰ Tip notification snoozed for 1 hour: ${notificationId}`);
    } catch (error) {
      console.error('❌ Failed to snooze notification:', error);
    }
  }

  // GA4イベント送信
  private async sendTipShownEvent(notification: TipNotification): Promise<void> {
    try {
      console.log('📊 Tip shown event:', {
        tip_id: notification.id,
        tip_category: notification.tip_category,
        show_count: this.settings.show_count
      });
      
      // TODO: 実際のGA4送信
    } catch (error) {
      console.error('❌ Failed to send tip shown event:', error);
    }
  }

  private async sendTipClickedEvent(notification: TipNotification): Promise<void> {
    try {
      console.log('📊 Tip clicked event:', {
        tip_id: notification.id,
        tip_category: notification.tip_category
      });
    } catch (error) {
      console.error('❌ Failed to send tip clicked event:', error);
    }
  }

  private async sendTipDismissedEvent(notification: TipNotification): Promise<void> {
    try {
      console.log('📊 Tip dismissed event:', {
        tip_id: notification.id,
        tip_category: notification.tip_category
      });
    } catch (error) {
      console.error('❌ Failed to send tip dismissed event:', error);
    }
  }

  // 設定更新
  async updateSettings(newSettings: Partial<TipsSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    console.log('⚙️ Tips settings updated:', newSettings);
  }

  // 設定取得
  getSettings(): TipsSettings {
    return { ...this.settings };
  }

  // Tips無効化
  async disableTips(): Promise<void> {
    await this.updateSettings({ enabled: false });
    
    // 既存のアラームをクリア
    const alarms = await chrome.alarms.getAll();
    for (const alarm of alarms) {
      if (alarm.name.startsWith('tip_')) {
        await chrome.alarms.clear(alarm.name);
      }
    }
    
    console.log('🔕 Tips notifications disabled');
  }
}

// シングルトンインスタンス
export const tipsManager = new TipsManager();

// Service Workerでの初期化
export const initializeTipsManager = () => {
  console.log('📬 Tips Manager initialized');
  return tipsManager;
}; 
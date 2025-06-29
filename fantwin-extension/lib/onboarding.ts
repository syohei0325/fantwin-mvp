// @implementation_plan.md Week-6: Concierge Onboarding
// 自動DM送信・予約確認メール・リマインダー・キャンセル処理

interface OnboardingEvent {
  event_id: string;
  user_id: string;
  scheduled_at: string;
  timezone: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  meeting_type: 'onboarding' | 'support';
  zoom_url?: string;
  calendar_url: string;
  reminder_sent: boolean;
  confirmation_sent: boolean;
  created_at: number;
  updated_at: number;
}

interface OnboardingStats {
  total_scheduled: number;
  completed: number;
  no_shows: number;
  completion_rate: number;
  avg_satisfaction?: number;
}

class OnboardingManager {
  private storagePrefix = 'onboarding_';
  private reminderAlarmPrefix = 'reminder_';

  // オンボーディングマネージャー初期化
  async initialize() {
    console.log('📅 Initializing Onboarding Manager...');
    
    // 既存のリマインダーアラームを再設定
    await this.setupExistingReminders();
    
    console.log('✅ Onboarding Manager initialized');
    return this;
  }

  // スケジュールイベント保存
  async saveScheduledEvent(eventData: OnboardingEvent): Promise<OnboardingEvent> {
    try {
      const storageKey = `${this.storagePrefix}${eventData.event_id}`;
      const now = Date.now();

      const event: OnboardingEvent = {
        ...eventData,
        created_at: now,
        updated_at: now,
        reminder_sent: false,
        confirmation_sent: false
      };

      // Chrome Storage に保存
      await browser.storage.local.set({ [storageKey]: event });

      // Zoom URL生成
      const zoomUrl = await this.generateZoomUrl(event);
      if (zoomUrl) {
        event.zoom_url = zoomUrl;
        await browser.storage.local.set({ [storageKey]: event });
      }

      // 予約確認DM送信
      await this.sendConfirmationDM(event);

      // リマインダーアラーム設定（24時間前・1時間前）
      await this.setupReminders(event);

      // GA4イベント送信
      await this.trackEvent('onboarding_event_saved', {
        event_id: event.event_id,
        user_id: event.user_id,
        scheduled_at: event.scheduled_at,
        timezone: event.timezone
      });

      console.log('📅 Onboarding event saved:', event);
      return event;
    } catch (error) {
      console.error('❌ Failed to save scheduled event:', error);
      throw error;
    }
  }

  // ユーザーのスケジュールイベント取得
  async getUserScheduledEvents(userId: string): Promise<OnboardingEvent[]> {
    try {
      const storage = await browser.storage.local.get();
      const events: OnboardingEvent[] = [];

      Object.keys(storage).forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          const event = storage[key] as OnboardingEvent;
          if (event.user_id === userId) {
            events.push(event);
          }
        }
      });

      // 日時順でソート
      events.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

      return events;
    } catch (error) {
      console.error('❌ Failed to get scheduled events:', error);
      return [];
    }
  }

  // Zoom URL生成（模擬実装）
  private async generateZoomUrl(event: OnboardingEvent): Promise<string> {
    try {
      // 実装: Zoom API または固定URLパターン
      const meetingId = `${event.event_id.slice(-8)}-${Date.now().toString().slice(-6)}`;
      const baseUrl = 'https://us02web.zoom.us/j/';
      
      // 実際の実装では Zoom API を使用
      const zoomUrl = `${baseUrl}${meetingId}?pwd=FANTWIN${meetingId.slice(-4)}`;

      console.log(`🔗 Generated Zoom URL for ${event.event_id}: ${zoomUrl}`);
      return zoomUrl;
    } catch (error) {
      console.error('❌ Failed to generate Zoom URL:', error);
      return '';
    }
  }

  // 予約確認DM送信
  private async sendConfirmationDM(event: OnboardingEvent): Promise<void> {
    try {
      const confirmationMessage = this.generateConfirmationMessage(event);

      // DM送信（既存のDM送信機能を利用）
      await browser.runtime.sendMessage({
        action: 'SEND_DM',
        recipient: 'user_dm', // 実装に応じて調整
        content: confirmationMessage,
        metadata: {
          type: 'onboarding_confirmation',
          event_id: event.event_id
        }
      });

      // 確認送信フラグ更新
      const storageKey = `${this.storagePrefix}${event.event_id}`;
      const updatedEvent = { ...event, confirmation_sent: true, updated_at: Date.now() };
      await browser.storage.local.set({ [storageKey]: updatedEvent });

      console.log('📧 Confirmation DM sent for event:', event.event_id);
    } catch (error) {
      console.error('❌ Failed to send confirmation DM:', error);
    }
  }

  // 予約確認メッセージ生成
  private generateConfirmationMessage(event: OnboardingEvent): string {
    const scheduledDate = new Date(event.scheduled_at);
    const formattedDate = scheduledDate.toLocaleString('ja-JP', {
      timeZone: event.timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `🎉 FanTwinコンシェルジュ予約確認

📅 日時: ${formattedDate}
🔗 Zoom URL: ${event.zoom_url || '準備中...'}
⏰ 所要時間: 15分

📋 準備していただくこと:
• 現在のTwitter運用の課題
• 達成したい目標
• FanTwinで試したい機能

当日お会いできることを楽しみにしています！

※24時間前・1時間前にリマインダーをお送りします
※変更・キャンセルはいつでも可能です`;
  }

  // リマインダー設定
  private async setupReminders(event: OnboardingEvent): Promise<void> {
    try {
      const scheduledTime = new Date(event.scheduled_at).getTime();
      const now = Date.now();

      // 24時間前リマインダー
      const reminder24h = scheduledTime - (24 * 60 * 60 * 1000);
      if (reminder24h > now) {
        const alarmName = `${this.reminderAlarmPrefix}24h_${event.event_id}`;
        await browser.alarms.create(alarmName, {
          when: reminder24h
        });
        console.log(`⏰ 24h reminder set for ${event.event_id} at ${new Date(reminder24h)}`);
      }

      // 1時間前リマインダー
      const reminder1h = scheduledTime - (60 * 60 * 1000);
      if (reminder1h > now) {
        const alarmName = `${this.reminderAlarmPrefix}1h_${event.event_id}`;
        await browser.alarms.create(alarmName, {
          when: reminder1h
        });
        console.log(`⏰ 1h reminder set for ${event.event_id} at ${new Date(reminder1h)}`);
      }
    } catch (error) {
      console.error('❌ Failed to setup reminders:', error);
    }
  }

  // 既存リマインダー再設定
  private async setupExistingReminders(): Promise<void> {
    try {
      const storage = await browser.storage.local.get();
      const now = Date.now();

      for (const key of Object.keys(storage)) {
        if (key.startsWith(this.storagePrefix)) {
          const event = storage[key] as OnboardingEvent;
          const scheduledTime = new Date(event.scheduled_at).getTime();

          // 未来のイベントのみリマインダー再設定
          if (scheduledTime > now && event.status === 'scheduled') {
            await this.setupReminders(event);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to setup existing reminders:', error);
    }
  }

  // リマインダー処理
  async handleReminderAlarm(alarmName: string): Promise<void> {
    try {
      if (!alarmName.startsWith(this.reminderAlarmPrefix)) return;

      const [, timeframe, eventId] = alarmName.split('_');
      const event = await this.getEventById(eventId);

      if (!event || event.status !== 'scheduled') {
        console.log(`⏰ Skipping reminder for cancelled/completed event: ${eventId}`);
        return;
      }

      const reminderMessage = this.generateReminderMessage(event, timeframe);

      // リマインダーDM送信
      await browser.runtime.sendMessage({
        action: 'SEND_DM',
        recipient: 'user_dm',
        content: reminderMessage,
        metadata: {
          type: 'onboarding_reminder',
          event_id: event.event_id,
          timeframe: timeframe
        }
      });

      // リマインダー送信フラグ更新
      const storageKey = `${this.storagePrefix}${event.event_id}`;
      const updatedEvent = { ...event, reminder_sent: true, updated_at: Date.now() };
      await browser.storage.local.set({ [storageKey]: updatedEvent });

      // GA4イベント送信
      await this.trackEvent('onboarding_reminder_sent', {
        event_id: event.event_id,
        timeframe: timeframe,
        user_id: event.user_id
      });

      console.log(`⏰ Reminder sent for ${eventId} (${timeframe})`);
    } catch (error) {
      console.error('❌ Failed to handle reminder alarm:', error);
    }
  }

  // リマインダーメッセージ生成
  private generateReminderMessage(event: OnboardingEvent, timeframe: string): string {
    const scheduledDate = new Date(event.scheduled_at);
    const formattedDate = scheduledDate.toLocaleString('ja-JP', {
      timeZone: event.timezone,
      hour: '2-digit',
      minute: '2-digit'
    });

    const timeText = timeframe === '24h' ? '明日' : `あと1時間（${formattedDate}）`;

    return `⏰ FanTwinコンシェルジュのリマインダー

${timeText}にお約束のお時間です！

🔗 Zoom URL: ${event.zoom_url || 'DM内で確認してください'}

📋 再確認:
• 現在の課題を整理しておきましょう
• 質問リストを準備できていますか？
• Zoomアプリの動作確認はお済みですか？

お会いできることを楽しみにしています！`;
  }

  // イベント取得
  private async getEventById(eventId: string): Promise<OnboardingEvent | null> {
    try {
      const storageKey = `${this.storagePrefix}${eventId}`;
      const result = await browser.storage.local.get([storageKey]);
      return result[storageKey] || null;
    } catch (error) {
      console.error('❌ Failed to get event by ID:', error);
      return null;
    }
  }

  // イベントステータス更新
  async updateEventStatus(eventId: string, status: OnboardingEvent['status']): Promise<void> {
    try {
      const event = await this.getEventById(eventId);
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }

      const storageKey = `${this.storagePrefix}${eventId}`;
      const updatedEvent = { ...event, status, updated_at: Date.now() };
      await browser.storage.local.set({ [storageKey]: updatedEvent });

      // ステータス変更をGA4に送信
      await this.trackEvent('onboarding_status_updated', {
        event_id: eventId,
        old_status: event.status,
        new_status: status,
        user_id: event.user_id
      });

      console.log(`📅 Event status updated: ${eventId} -> ${status}`);
    } catch (error) {
      console.error('❌ Failed to update event status:', error);
    }
  }

  // オンボーディング統計取得
  async getOnboardingStats(): Promise<OnboardingStats> {
    try {
      const storage = await browser.storage.local.get();
      const events: OnboardingEvent[] = [];

      Object.keys(storage).forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          events.push(storage[key]);
        }
      });

      const stats: OnboardingStats = {
        total_scheduled: events.length,
        completed: events.filter(e => e.status === 'completed').length,
        no_shows: events.filter(e => e.status === 'no_show').length,
        completion_rate: 0
      };

      if (stats.total_scheduled > 0) {
        stats.completion_rate = stats.completed / stats.total_scheduled;
      }

      return stats;
    } catch (error) {
      console.error('❌ Failed to get onboarding stats:', error);
      return {
        total_scheduled: 0,
        completed: 0,
        no_shows: 0,
        completion_rate: 0
      };
    }
  }

  // GA4イベント送信
  private async trackEvent(eventName: string, parameters: Record<string, any>): Promise<void> {
    try {
      const { demoGA4Client } = await import('./analytics/ga4');
      await demoGA4Client.trackEvent(eventName, parameters);
      console.log(`📊 GA4 Event: ${eventName}`, parameters);
    } catch (error) {
      console.error('❌ Failed to track event:', error);
    }
  }

  // キャンセル処理
  async cancelEvent(eventId: string, reason?: string): Promise<void> {
    try {
      await this.updateEventStatus(eventId, 'cancelled');

      // 関連アラームをクリア
      await browser.alarms.clear(`${this.reminderAlarmPrefix}24h_${eventId}`);
      await browser.alarms.clear(`${this.reminderAlarmPrefix}1h_${eventId}`);

      // キャンセル通知DM送信
      const event = await this.getEventById(eventId);
      if (event) {
        const cancelMessage = `📅 FanTwinコンシェルジュ予約キャンセル

予約をキャンセルいたしました。
${reason ? `理由: ${reason}` : ''}

またの機会にお会いできることを楽しみにしています！
いつでも再予約可能です。`;

        await browser.runtime.sendMessage({
          action: 'SEND_DM',
          recipient: 'user_dm',
          content: cancelMessage,
          metadata: {
            type: 'onboarding_cancellation',
            event_id: eventId
          }
        });
      }

      console.log(`📅 Event cancelled: ${eventId}`);
    } catch (error) {
      console.error('❌ Failed to cancel event:', error);
    }
  }
}

// オンボーディングマネージャーインスタンス初期化
export const initializeOnboardingManager = () => {
  return new OnboardingManager().initialize();
};

export { OnboardingManager, OnboardingEvent, OnboardingStats }; 
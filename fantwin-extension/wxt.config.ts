import { defineConfig } from 'wxt';

// @mvp_checklist.md L0-α Speed-&-Cash: Embedded Payouts + p50 < 0.5s
export default defineConfig({
  manifest: {
    name: 'Yohaku Creator Tools',
    description: 'L0-α Speed-&-Cash: AI DM automation + Embedded Payouts for creators. p50 < 0.5s SLA.',
    version: '1.0.0',
    icons: {
      '16': '/icon-16.png',
      '48': '/icon-48.png',
      '128': '/icon-128.png'
    },
    // @mvp_checklist.md Chrome Store審査用
    homepage_url: 'https://fantwin.jp',
    // Note: Privacy policy URLはChrome Developer Dashboardで設定
    permissions: [
      'activeTab',
      'storage', 
      'alarms',
      'notifications'
    ],
    host_permissions: [
      'https://twitter.com/*',
      'https://x.com/*',
      'https://api.openai.com/*',
      'https://api.stripe.com/*',
      'https://*.supabase.co/*',
      'https://www.google-analytics.com/*'
    ],
    // @mvp_checklist.md Tech Risk: Manifest V3 chrome.alarms + heartbeat
    background: {
      service_worker: 'background.js',
      type: 'module'
    },
    content_scripts: [
      {
        matches: ['https://twitter.com/*', 'https://x.com/*'],
        js: ['content.js'],
        run_at: 'document_end'
      }
    ],
    action: {
      default_popup: 'popup.html',
      default_title: 'Yohaku Creator Tools'
    },
    options_page: 'options.html',
    web_accessible_resources: [
      {
        resources: ['assets/*'],
        matches: ['https://twitter.com/*', 'https://x.com/*']
      }
    ],
    // Chrome Store審査対応
    minimum_chrome_version: '88'
  },
  runner: {
    startUrls: ['https://twitter.com', 'https://x.com']
  }
}); 
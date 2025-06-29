# FanTwin Chrome Extension MVP

FanTwin は Twitter/X での効率的なDMコミュニケーションを支援するChrome拡張機能です。AI技術を活用してパーソナライズされたDMを自動生成し、クリエイターとファンの関係構築をサポートします。

## 🎯 MVP目標 (60日)

- **ユーザー数**: Free 200 → Paid 20
- **MRR**: ¥66,000 (粗利40%)
- **D1 Activation**: 50%
- **W1 Retention**: 30%
- **W4 Retention**: 15%

## 🚀 主要機能

### Week-0 完了 ✅
- ✅ Manifest V3 Service Worker (30秒keep-alive対策)
- ✅ GA4 Streaming Export β連携
- ✅ 基本UI実装

### Week-1 完了 ✅  
- ✅ Hello-World DM生成 (OpenAI GPT-4o-mini)
- ✅ 120文字以上保証
- ✅ ワンクリック送信フロー
- ✅ Twitter/X.com DOM自動化
- ✅ D1 Activationイベント追跡

### Week-1 残タスク 🔄
- 🔄 1-Click LP (ランディングページ)
- 🔄 KPIダッシュボード

## 🛠 技術スタック

### Chrome Extension
- **Framework**: WXT Framework
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Build**: Vite + esbuild

### AI & Analytics
- **AI**: OpenAI API (GPT-4o-mini)
- **Analytics**: GA4 Streaming Export β
- **Backend**: Supabase

### Landing Page
- **Framework**: Next.js 14
- **Payment**: Stripe
- **Hosting**: Vercel

## 📁 プロジェクト構造

```
Yohaku/
├── fantwin-extension/          # Chrome拡張機能
│   ├── entrypoints/
│   │   ├── background.ts       # Service Worker
│   │   ├── content.ts          # Twitter/X DOM操作
│   │   └── popup/              # PopupUI
│   ├── components/
│   │   └── features/
│   │       └── DMGenerator.tsx # DM生成コンポーネント
│   └── lib/
│       ├── ai/                 # AI DM生成
│       ├── analytics/          # GA4連携
│       └── storage/            # データ管理
│
├── fantwin-lp/                 # ランディングページ
│   ├── src/app/
│   └── components/
│
└── docs/                       # プロジェクト文書
    ├── mvp_checklist.md
    ├── implementation_plan.md
    └── expansion_roadmap.md
```

## 🚧 開発セットアップ

### 必要要件
- Node.js 18.20.4+
- Chrome/Chromium ブラウザ

### Chrome拡張機能
```bash
cd fantwin-extension
npm install
npm run dev        # 開発モード
npm run build      # プロダクションビルド
```

### ランディングページ
```bash
cd fantwin-lp  
npm install
npm run dev        # 開発サーバー起動
npm run build      # プロダクションビルド
```

## 🔧 Chrome拡張機能の読み込み

1. Chrome → `chrome://extensions/`
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」
4. `fantwin-extension/.output/chrome-mv3` フォルダを選択

## 📊 KPI追跡

- **D1 Activation**: 初回DM送信成功
- **W1 Retention**: 7日後の再利用
- **W4 Retention**: 28日後の再利用
- **Conversion**: Free → Paid転換

## 🔐 セキュリティ

- API Keyは環境変数で管理
- ユーザーデータの暗号化
- GDPR/プライバシー法対応

## 📈 展開ロードマップ

1. **Phase 1**: DM Reply自動化
2. **Phase 2**: 多言語翻訳
3. **Phase 3**: Autopilot機能
4. **Phase 4**: クリエイターエコノミー
5. **Phase 5**: IPO準備

## 🤝 貢献

プロジェクトへの貢献を歓迎します。開発者向けのガイドラインは `docs/` フォルダを参照してください。

## 📄 ライセンス

プライベートリポジトリ - 商用利用制限

---

**FanTwin** - クリエイターとファンをつなぐ、次世代コミュニケーションプラットフォーム 
# 📂 FanTwin **World-Quest** ディレクトリ構成 v2.0
**「多言語 × Dev Campus × Guardian AI × Fan Wallet」対応モノレポ**

新戦略（90日→72ヶ月、MRR ¥66k→¥250B）に基づく **統合プラットフォーム** 構造

---

## 🏗️ **モノレポ構造 (Turborepo + Nx)**

```
fantwin-monorepo/
├── apps/                          # 🚀 メインアプリケーション
│   ├── extension/                 # Chrome拡張（メイン）
│   │   ├── entrypoints/
│   │   │   ├── background.ts      # Service Worker
│   │   │   ├── content.ts         # Content Script
│   │   │   ├── popup/             # ポップアップUI
│   │   │   │   ├── App.tsx
│   │   │   │   ├── main.tsx
│   │   │   │   └── index.html
│   │   │   └── options/           # 設定画面
│   │   ├── components/
│   │   │   ├── ui/                # shadcn/ui components
│   │   │   ├── features/          # 機能別コンポーネント
│   │   │   │   ├── DMGenerator.tsx
│   │   │   │   ├── LanguageSelector.tsx     # 🆕 多言語選択
│   │   │   │   ├── GuardianStatus.tsx       # 🆕 Guardian AI状態
│   │   │   │   └── WalletWidget.tsx         # 🆕 Wallet残高表示
│   │   │   └── layouts/
│   │   ├── lib/
│   │   │   ├── ai/
│   │   │   │   ├── models/
│   │   │   │   │   └── model-manager.ts      # AI統合管理
│   │   │   │   ├── dm-generator.ts
│   │   │   │   └── translator.ts             # 🆕 多言語翻訳
│   │   │   ├── guardian/                     # 🆕 Guardian AI
│   │   │   │   ├── moderator.ts              # 有害検知
│   │   │   │   └── reputation.ts             # URL評価
│   │   │   ├── wallet/                       # 🆕 Fan Wallet
│   │   │   │   ├── treasury.ts               # Stripe Treasury
│   │   │   │   └── transfers.ts              # 送金機能
│   │   │   ├── i18n/                         # 🆕 国際化
│   │   │   │   ├── locales/                  # 言語リソース
│   │   │   │   │   ├── en.json
│   │   │   │   │   ├── ja.json
│   │   │   │   │   ├── ko.json
│   │   │   │   │   ├── zh.json
│   │   │   │   │   ├── es.json
│   │   │   │   │   ├── fr.json
│   │   │   │   │   ├── de.json
│   │   │   │   │   ├── pt.json
│   │   │   │   │   ├── it.json
│   │   │   │   │   └── ru.json
│   │   │   │   └── config.ts
│   │   │   ├── analytics/
│   │   │   │   ├── ga4.ts
│   │   │   │   └── performance.ts
│   │   │   ├── storage/
│   │   │   └── types/
│   │   ├── wxt.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── creator-console/           # 🆕 クリエイター管理コンソール
│   │   ├── src/
│   │   │   ├── app/               # Next.js App Router
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── analytics/
│   │   │   │   │   ├── settings/
│   │   │   │   │   └── guardian/  # Guardian AI設定
│   │   │   │   ├── wallet/        # Wallet管理
│   │   │   │   ├── api/
│   │   │   │   │   ├── metrics/
│   │   │   │   │   ├── guardian/
│   │   │   │   │   └── wallet/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── charts/        # Recharts + Chart.js
│   │   │   │   ├── forms/
│   │   │   │   └── dashboard/
│   │   │   └── lib/
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── dev-campus/                # 🆕 開発者プラットフォーム
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── courses/       # オンライン講座
│   │   │   │   ├── playground/    # Sandpack統合
│   │   │   │   ├── marketplace/   # RevShare マーケット
│   │   │   │   ├── docs/          # API Documentation
│   │   │   │   └── api/
│   │   │   │       ├── courses/
│   │   │   │       ├── badges/    # 認定バッジ
│   │   │   │       └── revshare/
│   │   │   ├── components/
│   │   │   │   ├── playground/    # Code playground
│   │   │   │   ├── video/         # Video player
│   │   │   │   └── certification/
│   │   │   └── lib/
│   │   │       ├── sandpack/
│   │   │       ├── video/
│   │   │       └── certification/
│   │   └── content/               # MDX コンテンツ
│   │       ├── courses/
│   │       └── docs/
│   │
│   ├── wallet/                    # 🆕 Fan Wallet独立アプリ
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── send/          # 送金機能
│   │   │   │   ├── receive/       # 受取機能
│   │   │   │   ├── history/       # 取引履歴
│   │   │   │   └── settings/      # KYC/AML設定
│   │   │   ├── components/
│   │   │   │   ├── transfer/
│   │   │   │   ├── kyc/
│   │   │   │   └── currency/
│   │   │   └── lib/
│   │   │       ├── stripe-treasury/
│   │   │       ├── airwallex/
│   │   │       ├── kyc/
│   │   │       └── compliance/
│   │   └── package.json
│   │
│   └── landing/                   # ランディングページ（既存）
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   └── lib/
│       └── package.json
│
├── packages/                      # 📦 共有パッケージ
│   ├── ui/                        # shadcn/ui コンポーネント
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── chart.tsx      # 🆕 チャート共通
│   │   │   │   ├── language-selector.tsx  # 🆕 言語選択
│   │   │   │   └── wallet-widget.tsx      # 🆕 Wallet UI
│   │   │   ├── lib/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── sdk/                       # 🆕 Dev Platform SDK
│   │   ├── src/
│   │   │   ├── client/
│   │   │   │   ├── dm.ts          # DM API
│   │   │   │   ├── translate.ts   # 翻訳 API
│   │   │   │   ├── moderate.ts    # Guardian API
│   │   │   │   └── wallet.ts      # Wallet API
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── examples/              # サンプルコード
│   │   ├── docs/                  # SDK文書
│   │   └── package.json
│   │
│   ├── i18n/                      # 🆕 多言語共有リソース
│   │   ├── src/
│   │   │   ├── locales/           # 10言語リソース
│   │   │   ├── utils/
│   │   │   └── config.ts
│   │   └── package.json
│   │
│   ├── guardian/                  # 🆕 Guardian AI クライアント
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   └── package.json
│   │
│   └── wallet-client/             # 🆕 Wallet クライアント
│       ├── src/
│       │   ├── treasury.ts
│       │   ├── transfers.ts
│       │   ├── kyc.ts
│       │   └── types.ts
│       └── package.json
│
├── services/                      # 🔧 マイクロサービス
│   ├── api/                       # Core API (Next.js)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   └── api/
│   │   │   │       ├── v1/
│   │   │   │       │   ├── dm/
│   │   │   │       │   ├── translate/     # 🆕 翻訳API
│   │   │   │       │   ├── moderate/      # 🆕 Guardian API
│   │   │   │       │   └── wallet/        # 🆕 Wallet API
│   │   │   │       └── v2/                # 🆕 次世代API
│   │   │   ├── lib/
│   │   │   │   ├── ai/
│   │   │   │   │   ├── openai.ts
│   │   │   │   │   ├── lora.ts            # 🆕 LoRA Fine-tuning
│   │   │   │   │   └── translation.ts     # 🆕 多言語エンジン
│   │   │   │   ├── guardian/              # 🆕 Guardian AI
│   │   │   │   │   ├── toxicity.ts
│   │   │   │   │   └── reputation.ts
│   │   │   │   ├── wallet/                # 🆕 Wallet backend
│   │   │   │   │   ├── stripe-treasury.ts
│   │   │   │   │   ├── airwallex.ts
│   │   │   │   │   └── compliance.ts
│   │   │   │   ├── database/
│   │   │   │   │   ├── supabase.ts
│   │   │   │   │   └── planetscale.ts     # 🆕 移行準備
│   │   │   │   └── monitoring/
│   │   │   └── middleware/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── guardian-ai/               # 🆕 Guardian AI (Rust MCP)
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── toxicity/
│   │   │   │   ├── bert.rs
│   │   │   │   └── classifier.rs
│   │   │   ├── reputation/
│   │   │   │   ├── url_checker.rs
│   │   │   │   └── blacklist.rs
│   │   │   └── api/
│   │   │       ├── moderate.rs
│   │   │       └── health.rs
│   │   ├── Cargo.toml
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── lang-translate/            # 🆕 多言語翻訳 (Go)
│   │   ├── cmd/
│   │   │   └── server/
│   │   │       └── main.go
│   │   ├── internal/
│   │   │   ├── lora/
│   │   │   │   └── finetune.go
│   │   │   ├── translate/
│   │   │   │   └── engine.go
│   │   │   └── cache/
│   │   │       └── redis.go
│   │   ├── api/
│   │   │   └── translate/
│   │   │       └── v1.go
│   │   ├── go.mod
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   └── wallet-core/               # 🆕 Wallet Backend (Node.js)
│       ├── src/
│       │   ├── controllers/
│       │   │   ├── transfer.ts
│       │   │   ├── kyc.ts
│       │   │   └── compliance.ts
│       │   ├── services/
│       │   │   ├── stripe-treasury.ts
│       │   │   ├── airwallex.ts
│       │   │   ├── persona-kyc.ts
│       │   │   └── chainalysis.ts
│       │   ├── models/
│       │   ├── routes/
│       │   └── middleware/
│       ├── package.json
│       ├── Dockerfile
│       └── README.md
│
├── infra/                         # 🏗️ Infrastructure as Code
│   ├── pulumi/                    # 🆕 Pulumi (TypeScript)
│   │   ├── src/
│   │   │   ├── stacks/
│   │   │   │   ├── prod.ts
│   │   │   │   ├── staging.ts
│   │   │   │   └── dev.ts
│   │   │   ├── components/
│   │   │   │   ├── database.ts
│   │   │   │   ├── api.ts
│   │   │   │   ├── guardian.ts    # Guardian AI インフラ
│   │   │   │   └── wallet.ts      # Wallet インフラ
│   │   │   └── index.ts
│   │   ├── Pulumi.yaml
│   │   └── package.json
│   │
│   └── terraform/                 # Legacy modules
│       ├── modules/
│       └── environments/
│
├── docs/                          # 📚 プロジェクト文書
│   ├── api/                       # API仕様書
│   ├── architecture/              # アーキテクチャ文書
│   ├── deployment/                # デプロイ手順
│   └── contributing.md
│
├── .github/                       # GitHub設定
│   ├── workflows/                 # CI/CD (Monorepo対応)
│   │   ├── extension.yml
│   │   ├── creator-console.yml
│   │   ├── dev-campus.yml
│   │   ├── wallet.yml
│   │   ├── services.yml
│   │   └── packages.yml
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── turbo.json                     # 🆕 Turborepo設定
├── nx.json                        # 🆕 Nx設定
├── package.json                   # モノレポ root
├── pnpm-workspace.yaml            # 🆕 pnpm workspace
├── tsconfig.json                  # 共通TypeScript設定
└── README.md
```

---

## 🎯 **配置ルール v2.0**

### **apps/ ディレクトリ**
- **extension/**: Chrome拡張メインアプリ（既存拡張）
- **creator-console/**: クリエイター専用管理画面
- **dev-campus/**: 開発者教育プラットフォーム  
- **wallet/**: Fan Wallet独立アプリ
- **landing/**: マーケティングLP

### **packages/ ディレクトリ**
- **ui/**: 全アプリ共通UIコンポーネント（shadcn/ui）
- **sdk/**: Developer Platform SDK（TypeScript）
- **i18n/**: 10言語国際化リソース
- **guardian/**: Guardian AI クライアントライブラリ
- **wallet-client/**: Wallet API クライアント

### **services/ ディレクトリ**
- **api/**: メインAPI（Next.js、全機能統合）
- **guardian-ai/**: Guardian AI マイクロサービス（Rust）
- **lang-translate/**: 多言語翻訳サービス（Go）
- **wallet-core/**: Wallet バックエンド（Node.js）

---

## 🚀 **新機能対応箇所**

### **多言語対応 (Lang10)**
- `packages/i18n/` - 共通リソース
- `apps/extension/lib/i18n/` - 拡張用設定
- `services/lang-translate/` - 翻訳マイクロサービス

### **Dev Campus**
- `apps/dev-campus/` - プラットフォーム本体
- `packages/sdk/` - 開発者SDK
- `services/api/src/app/api/v1/` - SDK向けAPI

### **Guardian AI**
- `packages/guardian/` - クライアントライブラリ
- `services/guardian-ai/` - AI推論エンジン（Rust）
- `apps/creator-console/src/app/guardian/` - 管理UI

### **Fan Wallet**
- `apps/wallet/` - 独立Walletアプリ
- `packages/wallet-client/` - クライアントライブラリ
- `services/wallet-core/` - バックエンドサービス

---

## ⚠️ **移行時の重要制約**

1. **段階的移行**: 既存拡張を壊さずモノレポ化
2. **API互換性**: 既存APIエンドポイントを維持
3. **バージョン管理**: 各アプリ独立デプロイ可能
4. **セキュリティ**: Guardian AI / Wallet は独立サービス
5. **スケーラビリティ**: マイクロサービスアーキテクチャ準備

---

## 📝 **Next Actions**

1. **Week-0**: 現在のfantwin-extension/をapps/extension/に移行
2. **Week-1**: packages/ui共通コンポーネント抽出
3. **Week-2**: services/api統合API構築
4. **Week-3**: i18n多言語対応実装
5. **Week-4**: Guardian AI PoC開発 
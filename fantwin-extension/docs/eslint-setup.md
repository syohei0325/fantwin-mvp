# ESLint設定ドキュメント

## 概要
FanTwin Chrome Extension プロジェクトにESLint v9を導入し、TypeScript + React対応のコード品質管理を実装しました。

## 設定ファイル
- `eslint.config.js` - ESLint v9対応の新しい設定フォーマット
- パッケージ: `package.json`にlintスクリプト追加

## lint実行方法

```bash
# 全体をlint
npm run lint

# 自動修正可能なエラーを修正
npm run lint:fix
```

## 対応している機能

### Chrome Extension環境
- Chrome Extension APIs (`chrome.*`, `browser.*`)
- WXT Framework (`defineContentScript`, `defineBackground`)
- Manifest V3対応

### TypeScript + React
- TypeScript 5.8対応
- React 18 + JSX
- 未使用変数チェック (prefix `_` で除外)
- `any`型の警告

### Browser Globals
- Timer functions (`setTimeout`, `setInterval`, etc.)
- DOM APIs (`document`, `window`, `Element`, etc.)
- Web APIs (`fetch`, `crypto`, `performance`, etc.)

## 現在のlint結果

### ✅ 成功項目
- ESLint v9導入完了
- Chrome Extension環境対応
- TypeScript構文エラー解決
- 主要なno-undefエラー解決

### ⚠️ 残存問題
- **1 Error**: `prefer-const` 違反
- **89 Warnings**: 主に以下
  - 未使用変数 (prefix `_` で修正可能)
  - `any`型使用 (段階的にtype定義へ)
  - `no-case-declarations` (switchブロック内の変数宣言)

## 今後の改善計画

### Phase 1: エラー解決 (優先度: 高)
- [ ] `prefer-const` エラー修正
- [ ] 重要な未使用変数のクリーンアップ

### Phase 2: 警告削減 (優先度: 中)
- [ ] `any`型の段階的type定義化
- [ ] switchブロック内の変数宣言パターン修正

### Phase 3: 設定最適化 (優先度: 低)
- [ ] React Hook linting追加
- [ ] Accessibility rules強化
- [ ] Import order enforcement

## 除外設定
以下のファイル/ディレクトリはlint対象外:
- `node_modules/`, `.wxt/`, `.output/`, `dist/`
- 設定ファイル (`*.config.js`, `*.config.ts`)
- ビルド成果物、ログファイル

## 関連リンク
- [ESLint v9 Migration Guide](https://eslint.org/docs/latest/use/configure/migration-guide)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [WXT Framework](https://wxt.dev/) 
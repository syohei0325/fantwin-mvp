# 🚀 FanTwin Chrome拡張 実機テスト手順

## @mvp_checklist.md Week-1完了検証

### 1. Chrome拡張のロード
1. Chromeを開いて `chrome://extensions/` にアクセス
2. 右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. フォルダ選択で以下を指定:
   ```
   /Users/koyamasyohei/Yohaku/fantwin-extension/.output/chrome-mv3/
   ```

### 2. Week-1完了基準チェック

#### ✅ Service Worker動作確認
- DevTools → Application → Service Workers
- `background.js` が動作中であることを確認
- Console で30秒間隔のheartbeatログ確認:
  ```
  💓 Heartbeat at 2024-XX-XX (Onboarding monitoring active)
  ```

#### ✅ ポップアップUI表示
- 拡張アイコンクリック → popup.html表示
- Service Worker状態インジケータ確認
- 「Hello-World DM生成」ボタン動作確認

#### ✅ Content Script動作（Twitter/X.com）
1. `https://twitter.com` または `https://x.com` にアクセス
2. DMページに移動
3. DevTools Console で以下確認:
   ```
   🐦 FanTwin Content Script loaded on Twitter/X.com
   ```

#### ✅ Hello-World DM生成テスト
1. 拡張ポップアップで「Hello-World DM生成」実行
2. 120文字以上のDM生成確認
3. Twitter DMエリアへの自動入力確認
4. ワンクリック送信テスト

### 3. GA4イベント送信確認
DevTools Network タブで以下確認:
- `google-analytics.com/mp/collect` リクエスト
- activation_step, dm_generated, dm_sent イベント

### 4. 期待される結果
- [x] Service Worker 30秒heartbeat動作
- [x] Hello-World DM 120文字以上生成
- [x] ワンクリック送信成功
- [x] GA4イベント送信成功

## トラブルシューティング

### Service Worker接続エラー
```
ERROR connect ECONNREFUSED 127.0.0.1:53881
```
→ Chrome拡張の開発サーバー起動が必要

### Content Script未ロード
→ Twitter/X.comページのリロードが必要

### DM自動入力失敗
→ Twitter DOM構造変更の可能性、セレクタ確認要

---

**@mvp_checklist.md Week-1完了基準達成後、Week-2 A/Bテスト実装に進行** 
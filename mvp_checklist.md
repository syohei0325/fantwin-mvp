────────────────────────────────────────────────────────────────────────
📑  DOCUMENT 1 – FanTwin **L0‑α Speed‑&‑Cash チェックリスト v3.0**  
（Reply‑Speed Wedge × Embedded‑Payouts〈先行〉＋Altman‑Lite 接続）
────────────────────────────────────────────────────────────────────────

### 0. ゴール（60 日）

- **p50 Latency < 0.5 s**（返信生成）  
- **Embedded‑Payouts β**：送金成功 5 件・手数料 1 % で粗利 ≥ 40 %  
- **β NPS > 50**（テスター 30 名）  
- **Chrome Web Store “Unlisted” 合格**（Manifest V3 / Treasury 権限最小）  
- **GMV ¥3,000,000** / MRR 黒字化  → Altman‑Lite L1 へ移行

---

### 1. KPI 設計

| 区分 | 目標 (Base / Stretch) | 計測イベント | 改善レバー |
|------|-----------------------|-------------|-----------|
| **T0 Wow 体験** | 95 % | Install → 自動下書き出現 | 下書き即挿入 & 速度ポップ |
| **D1 Activation** | 70 % / 80 % | Draft → 送信成功 | Enter 1 回送信＋遅延通知 |
| **p50 Latency** | < 0.5 s / < 0.4 s | Workers ログ | RAM キャッシュ＋リージョン最適 |
| **β NPS** | 50 / 60 | GA4 Survey | Speed Scoreboard 公開 |
| **GMV→粗利** | ¥3 M / 粗利 40 % | Treasury 送金完了 | Payout CTA＋Referral 報酬 |

---

### 2. プライシング & ユニットエコノミクス

| プラン | 月次上限 | 料金 | LLM | 備考 |
|--------|---------|------|-----|------|
| Free | 300 返信 | ¥0 | 4o‑mini | — |
| Pro | 3,000 返信 | ¥2,980 | 4o‑blend | — |
| Team | 3,000 × Seat | ¥15,400 / Seat | 4o‑blend | 最大 50 Seat |
| Payouts | 送金額 × 1 % | – | – | Stripe Treasury / Wise backup |

> **Cost Guardrail**：`OpenAI + Treasury 手数料 ≤ min(MRR×0.25, $150)`  
> 超過時は Slack Alert → 価格改定検討。

---

### 3. 8‑Week スプリント構成

| 週 | 主 Deliverable | 完了基準 |
|----|----------------|---------|
| **W0** | Workers Spike / Service Worker heartbeat | p50 < 1.2 s |
| **W1** | 1‑Click LP + Wow Flow | Wow 体験 95 % |
| **W2** | Latency チューニング | p50 < 0.5 s / p95 < 0.9 s |
| **W3** | Embedded‑Payout β (JPY→JPY) | 送金 5 件・粗利 40 % |
| **W4** | Speed Scoreboard 公開 + β NPS | NPS > 50 |
| **W5** | Referral +200 Replies | 招待 20 件・不正 < 1 % |
| **W6** | Team Seat β & per‑seat billing | 3 チーム導入 |
| **W7‑8** | Pricing A/B & SLA バッジ | CVR > 3 % |

---

### 4. Tech / Infra チェックリスト

| リスク | アクション |
|--------|-----------|
| Manifest V3 keep‑alive | chrome.alarms + heartbeat fetch |
| Workers RateLimit | Region fail‑over & KV warm‑cache |
| Treasury API 更新 | バージョン Pin ＋ Webhook 監視 |
| LLM 価格変動 | mini→nano Fallback ＋ Top‑K キャッシュ |
| KV back‑pressure | write queue＋p95 > 1 s Slack Alert |
| Wise Backup 失敗 | Feature Flag 切替＋Smoke Test |

---

### 5. Legal / Compliance

| 項目 | 60 日内アクション |
|------|----------------|
| 資金移動 (JP) | Treasury 契約条項を Terms に記載、送金ログ 7 年保存 |
| EU AI Act α | 入力 AES‑256 暗号化＋Opt‑out ON |
| CPRA / LGPD | 用途別チェックボックス＋削除 API |
| PII Mask | Sentry beforeSend で自動マスキング |

---

### 6. Growth 施策

| 施策 | 内容 | 効果 |
|------|------|------|
| Speed Scoreboard | p50/p95 をリアルタイム公開 | SNS バイラル |
| Referral +200 Replies | 招待リンクで残量追加 | CAC ≒ 0 |
| SLA バッジ | LP にレイテンシ常時表示 | CVR↑ |

---

### 7. Monitoring & Docs

- **Grafana**：p50/p95 Latency・GMV・粗利（15 min）  
- **Slack Bot**：09:00 JST 日次レポート  
- **Risk Playbook**：GitHub Issues（Trigger → Action → Owner）  
- **Alert**：p50 > 0.6 s or 粗利 < 35 % で即通知  

---

### 8. ブリッジ to Altman‑Lite L1

| データ | L1 での用途 |
|--------|-----------|
| Latency Logs | Speed Scoreboard → Dev Campus PR |
| GMV & Payout Logs | Risk Engine Seed → Wallet β |
| NPS フィードバック | Creator‑LLM Fine‑tune テスト |
| Referral Graph | Guardian 行動パターン分析 |

---

### TL;DR
最小構成の **「最速返信 < 0.5 s × 即日 1 % 送金」** を 60 日で実証し、  
キャッシュフローと決済ログを握ったまま Altman‑Lite（多言語・Guardian・Dev Campus）へ接続。  
Speed = Moat、Cash = Oxygen、Data = Rocket Fuel。次は L1 だ。 🚀